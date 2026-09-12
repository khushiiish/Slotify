import mongoose from 'mongoose';
import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import Availability from '../models/availability.model.js';
import BlockedDate from '../models/blockedDate.model.js';
import Appointment from '../models/appointment.model.js';
import { assertTenantOwnership } from '../utils/tenant.js';
import {
  getDayOfWeekForDate,
  timeStrToMinutes,
  minutesToTimeStr,
  localToUtc,
} from '../utils/timezone.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * In-process staff-level asynchronous lock map to prevent race conditions
 * and double-booking during concurrent booking attempts.
 */
const staffLocks = new Map();

/**
 * Acquire an asynchronous lock for a specific staff member.
 * Ensures that simultaneous booking requests targeting the same staff member
 * are processed sequentially.
 *
 * @param {string} staffId - Staff ID string
 * @param {Function} task - Async task to execute within the lock
 * @returns {Promise<any>} Result of task execution
 */
const acquireStaffLock = async (staffId, task) => {
  const key = staffId.toString();

  const prev = staffLocks.get(key) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  // Synchronously enqueue into the staff lock map before any await
  staffLocks.set(key, next);

  try {
    await prev;
  } catch {
    // Ignore errors from previous task in lock chain
  }

  try {
    return await task();
  } finally {
    release();
    if (staffLocks.get(key) === next) {
      staffLocks.delete(key);
    }
  }
};

/**
 * Normalizes a YYYY-MM-DD date string to a midnight UTC Date for BlockedDate comparison.
 *
 * @param {string} dateStr - Date formatted as YYYY-MM-DD
 * @returns {Date} Normalized midnight UTC Date
 */
const normalizeDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
};

/**
 * Core appointment creation engine.
 * Validates business, service, staff eligibility, timezone boundaries, availability windows,
 * blocked dates, and appointment overlaps with race-safe concurrency guards.
 *
 * Designed to be reusable by both protected admin endpoints (Phase 7)
 * and public customer booking endpoints (Phase 8).
 *
 * @param {string|mongoose.Types.ObjectId} businessId - Target tenant business ID
 * @param {object} data - Booking payload
 * @param {string} data.serviceId - Service ObjectId
 * @param {string} [data.staffId] - Optional Staff ObjectId (or null for any-staff)
 * @param {string} data.date - Appointment date in "YYYY-MM-DD"
 * @param {string} data.startTime - Start time in "HH:mm" (15-minute interval)
 * @param {string} data.customerName - Customer name
 * @param {string} data.customerEmail - Customer email
 * @param {string} [data.customerPhone] - Customer phone
 * @param {string} [data.notes] - Appointment notes
 * @returns {Promise<object>} Created and populated appointment
 */
export const createAppointment = async (businessId, data) => {
  if (!businessId) {
    const error = new Error('Business ID is required.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Verify Business exists and is ACTIVE
  const business = await Business.findById(businessId);
  if (!business || business.status !== 'ACTIVE') {
    const error = new Error('Business account is inactive or disabled.');
    error.statusCode = 403;
    throw error;
  }

  const businessTimezone = business.timezone || 'Asia/Kolkata';

  // 2. Verify Service exists, belongs to tenant, is ACTIVE, and has positive duration
  if (!OBJECT_ID_REGEX.test(data.serviceId)) {
    const error = new Error('Invalid service ID format.');
    error.statusCode = 400;
    throw error;
  }

  const service = await Service.findById(data.serviceId);
  if (!service) {
    const error = new Error('Service not found.');
    error.statusCode = 404;
    throw error;
  }

  if (service.businessId.toString() !== businessId.toString()) {
    const error = new Error('Service does not belong to the selected business.');
    error.statusCode = 403;
    throw error;
  }

  if (service.status !== 'ACTIVE') {
    const error = new Error('Service is currently inactive.');
    error.statusCode = 400;
    throw error;
  }

  const duration = service.durationMinutes;
  if (!duration || duration <= 0) {
    const error = new Error('Service has an invalid duration.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Calendar date details & business-wide blocked date check
  const targetDateNormalized = normalizeDate(data.date);
  const businessBlocked = await BlockedDate.findOne({
    businessId,
    staffId: null,
    date: targetDateNormalized,
  });

  if (businessBlocked) {
    const error = new Error(
      `The business is closed on ${data.date}${businessBlocked.reason ? ` (${businessBlocked.reason})` : ''}.`
    );
    error.statusCode = 409;
    throw error;
  }

  const dayOfWeek = getDayOfWeekForDate(data.date);

  // 4. Calculate local start and server-side end time
  const startMin = timeStrToMinutes(data.startTime);
  const endMin = startMin + duration;
  const endTimeStr = minutesToTimeStr(endMin);

  // Convert local date and times to UTC instantiations in business timezone
  const slotStartUtc = localToUtc(data.date, data.startTime, businessTimezone);
  const slotEndUtc = localToUtc(data.date, endTimeStr, businessTimezone);

  // 5. Past-date / past-slot validation in business timezone
  const nowUtc = new Date();
  if (slotStartUtc <= nowUtc) {
    const error = new Error('Cannot book an appointment in the past.');
    error.statusCode = 400;
    throw error;
  }

  // 6. Determine candidate staff members
  let candidateStaffList = [];

  if (data.staffId && data.staffId !== 'null') {
    // Mode A: Specific staff requested
    if (!OBJECT_ID_REGEX.test(data.staffId)) {
      const error = new Error('Invalid staff ID format.');
      error.statusCode = 400;
      throw error;
    }

    const staff = await Staff.findById(data.staffId);
    if (!staff) {
      const error = new Error('Staff member not found.');
      error.statusCode = 404;
      throw error;
    }

    if (staff.businessId.toString() !== businessId.toString()) {
      const error = new Error('Staff member does not belong to this business.');
      error.statusCode = 403;
      throw error;
    }

    if (staff.status !== 'ACTIVE') {
      const error = new Error('Staff member is currently inactive.');
      error.statusCode = 400;
      throw error;
    }

    const providesService = staff.serviceIds.some(
      (sId) => sId.toString() === service._id.toString()
    );
    if (!providesService) {
      const error = new Error('Staff member is not assigned to provide this service.');
      error.statusCode = 400;
      throw error;
    }

    // Check staff-specific blocked date
    const staffBlocked = await BlockedDate.findOne({
      businessId,
      staffId: staff._id,
      date: targetDateNormalized,
    });

    if (staffBlocked) {
      const error = new Error(
        `Staff member is unavailable on ${data.date}${staffBlocked.reason ? ` (${staffBlocked.reason})` : ''}.`
      );
      error.statusCode = 409;
      throw error;
    }

    candidateStaffList = [staff];
  } else {
    // Mode B: Any-staff booking - find active staff assigned to this service
    const activeStaff = await Staff.find({
      businessId,
      status: 'ACTIVE',
      serviceIds: service._id,
    });

    if (activeStaff.length === 0) {
      const error = new Error('No active staff members are available for this service.');
      error.statusCode = 404;
      throw error;
    }

    // Filter out staff blocked on this date
    const staffBlockedEntries = await BlockedDate.find({
      businessId,
      staffId: { $in: activeStaff.map((s) => s._id) },
      date: targetDateNormalized,
    });

    const blockedStaffIds = new Set(
      staffBlockedEntries.map((b) => b.staffId.toString())
    );

    candidateStaffList = activeStaff.filter(
      (s) => !blockedStaffIds.has(s._id.toString())
    );

    if (candidateStaffList.length === 0) {
      const error = new Error('All eligible staff members are blocked on the requested date.');
      error.statusCode = 409;
      throw error;
    }
  }

  // 7. Check availability windows and find eligible staff
  // For each candidate staff member, check if the slot fits completely inside working hours
  const eligibleStaffWithWindows = [];

  for (const staff of candidateStaffList) {
    // A. Staff-specific availability windows for this weekday
    let effectiveWindows = await Availability.find({
      businessId,
      staffId: staff._id,
      dayOfWeek,
      isActive: true,
    }).sort({ startTime: 1 });

    // B. Fallback to business-wide availability windows
    if (effectiveWindows.length === 0) {
      effectiveWindows = await Availability.find({
        businessId,
        staffId: null,
        dayOfWeek,
        isActive: true,
      }).sort({ startTime: 1 });
    }

    if (effectiveWindows.length === 0) {
      continue;
    }

    // Check if slot fits completely within ANY effective availability window
    const fitsInWindow = effectiveWindows.some((win) => {
      const winStartMin = timeStrToMinutes(win.startTime);
      const winEndMin = timeStrToMinutes(win.endTime);
      return startMin >= winStartMin && endMin <= winEndMin;
    });

    if (fitsInWindow) {
      eligibleStaffWithWindows.push(staff);
    }
  }

  if (eligibleStaffWithWindows.length === 0) {
    const error = new Error('Requested time slot is outside working hours.');
    error.statusCode = 400;
    throw error;
  }

  // 8. Concurrency & Conflict Protection with staff-level serialization
  // Loop through eligible staff and attempt atomic booking under staff lock
  let createdAppointment = null;
  let lastConflictError = null;

  for (const staff of eligibleStaffWithWindows) {
    try {
      createdAppointment = await acquireStaffLock(staff._id, async () => {
        // Multi-document transaction session if connected
        let session = null;
        let transactionSupported = false;

        if (mongoose.connection.readyState === 1) {
          try {
            session = await mongoose.startSession();
            transactionSupported = true;
          } catch {
            transactionSupported = false;
          }
        }

        const executeBooking = async (currentSession) => {
          const sessionOpts = currentSession ? { session: currentSession } : {};

          // In transaction mode, acquire a document-level write lock on the Staff record
          if (currentSession) {
            await Staff.updateOne(
              { _id: staff._id },
              { $inc: { __v: 1 } },
              sessionOpts
            );
          }

          // Re-query current active appointments for this staff member inside the lock
          // Overlap condition: slotStart < appt.endTime AND slotEnd > appt.startTime
          const conflictingAppointment = await Appointment.findOne(
            {
              businessId,
              staffId: staff._id,
              status: { $ne: 'CANCELLED' },
              startTime: { $lt: slotEndUtc },
              endTime: { $gt: slotStartUtc },
            },
            null,
            sessionOpts
          );

          if (conflictingAppointment) {
            const conflictErr = new Error('Selected time slot is no longer available.');
            conflictErr.statusCode = 409;
            throw conflictErr;
          }

          // Insert the appointment atomically
          const [newAppt] = await Appointment.create(
            [
              {
                businessId,
                serviceId: service._id,
                staffId: staff._id,
                customerName: data.customerName.trim(),
                customerEmail: data.customerEmail.trim().toLowerCase(),
                customerPhone: data.customerPhone?.trim() || undefined,
                startTime: slotStartUtc,
                endTime: slotEndUtc,
                status: 'CONFIRMED',
                notes: data.notes?.trim() || undefined,
              },
            ],
            sessionOpts
          );

          return newAppt;
        };

        if (session && transactionSupported) {
          try {
            let result;
            await session.withTransaction(async () => {
              result = await executeBooking(session);
            });
            return result;
          } catch (txError) {
            if (
              txError.message?.includes('replica set') ||
              txError.message?.includes('Transaction numbers are only allowed')
            ) {
              return await executeBooking(null);
            }
            throw txError;
          } finally {
            await session.endSession();
          }
        } else {
          return await executeBooking(null);
        }
      });

      // If booking succeeded for this staff member, break loop
      if (createdAppointment) {
        break;
      }
    } catch (err) {
      if (err.statusCode === 409) {
        lastConflictError = err;
        // If specific staff was requested, do not try other staff
        if (data.staffId && data.staffId !== 'null') {
          throw err;
        }
        // For any-staff, try next eligible staff member
        continue;
      }
      throw err;
    }
  }

  if (!createdAppointment) {
    throw (
      lastConflictError ||
      (() => {
        const err = new Error('Selected time slot is no longer available.');
        err.statusCode = 409;
        return err;
      })()
    );
  }

  // 9. Populate references and return formatted response
  const populated = await Appointment.findById(createdAppointment._id)
    .populate('serviceId', 'name durationMinutes price')
    .populate('staffId', 'name email phone');

  return {
    appointment: populated,
    localDate: data.date,
    localStartTime: data.startTime,
    localEndTime: endTimeStr,
    timezone: businessTimezone,
  };
};

/**
 * List appointments for the authenticated business with optional query filters.
 *
 * @param {object} user - Authenticated user context
 * @param {object} query - Query filters (date, status, staffId, serviceId)
 * @returns {Promise<Array>} List of populated appointments
 */
export const listAppointments = async (user, query = {}) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  const business = await Business.findById(user.businessId);
  if (!business) {
    const error = new Error('Business not found.');
    error.statusCode = 404;
    throw error;
  }

  if (business.status !== 'ACTIVE') {
    const error = new Error('Business account is inactive or disabled.');
    error.statusCode = 403;
    throw error;
  }

  const filter = { businessId: user.businessId };
  const businessTimezone = business.timezone || 'Asia/Kolkata';

  if (query.status) {
    filter.status = query.status;
  }

  if (query.staffId) {
    filter.staffId = query.staffId;
  }

  if (query.serviceId) {
    filter.serviceId = query.serviceId;
  }

  // Date filtering: single date or date range
  if (query.date) {
    const dayStartUtc = localToUtc(query.date, '00:00', businessTimezone);
    const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);
    filter.startTime = { $gte: dayStartUtc, $lt: dayEndUtc };
  } else if (query.startDate || query.endDate) {
    const timeFilter = {};
    if (query.startDate) {
      timeFilter.$gte = localToUtc(query.startDate, '00:00', businessTimezone);
    }
    if (query.endDate) {
      const endDayStartUtc = localToUtc(query.endDate, '00:00', businessTimezone);
      timeFilter.$lt = new Date(endDayStartUtc.getTime() + 24 * 60 * 60 * 1000);
    }
    filter.startTime = timeFilter;
  }

  // Search by customer name, email, or phone (case-insensitive, regex-escaped)
  if (query.search && query.search.trim()) {
    const safePattern = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safePattern, 'i');
    filter.$or = [
      { customerName: regex },
      { customerEmail: regex },
      { customerPhone: regex },
    ];
  }

  let queryBuilder = Appointment.find(filter)
    .populate('serviceId', 'name durationMinutes price')
    .populate('staffId', 'name email phone')
    .sort({ startTime: 1 });

  // If pagination parameters are explicitly provided
  if (query.page || query.limit) {
    const total = await Appointment.countDocuments(filter);
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const appointments = await queryBuilder.skip(skip).limit(limit);

    return {
      appointments,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // Default unpaginated query for backward compatibility
  const appointments = await queryBuilder;

  return {
    appointments,
    total: appointments.length,
    page: 1,
    totalPages: 1,
  };
};


/**
 * Retrieve a single appointment by ID with strict tenant isolation.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - Appointment ID
 * @returns {Promise<object>} Populated appointment
 */
export const getAppointmentById = async (user, id) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  if (!OBJECT_ID_REGEX.test(id)) {
    const error = new Error('Invalid appointment ID format.');
    error.statusCode = 400;
    throw error;
  }

  const appointment = await Appointment.findById(id)
    .populate('serviceId', 'name durationMinutes price')
    .populate('staffId', 'name email phone');

  if (!appointment) {
    const error = new Error('Appointment not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(appointment, user);

  return appointment;
};

/**
 * Centralized appointment lifecycle status management.
 * Enforces server-authoritative state transitions:
 * - CONFIRMED -> COMPLETED, CANCELLED, NO_SHOW
 * - COMPLETED -> terminal (400 Bad Request on state change)
 * - CANCELLED -> terminal (400 Bad Request on state change)
 * - NO_SHOW -> terminal (400 Bad Request on state change)
 * - Transitioning to identical status is a safe no-op.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - Appointment ID
 * @param {string} newStatus - Target status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
 * @returns {Promise<object>} Populated updated appointment
 */
export const updateAppointmentStatus = async (user, id, newStatus) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  if (!OBJECT_ID_REGEX.test(id)) {
    const error = new Error('Invalid appointment ID format.');
    error.statusCode = 400;
    throw error;
  }

  const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  if (!validStatuses.includes(newStatus)) {
    const error = new Error(`Invalid appointment status: ${newStatus}`);
    error.statusCode = 400;
    throw error;
  }

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    const error = new Error('Appointment not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(appointment, user);

  // If status is already identical, return current appointment (idempotent no-op)
  if (appointment.status === newStatus) {
    return await Appointment.findById(appointment._id)
      .populate('serviceId', 'name durationMinutes price')
      .populate('staffId', 'name email phone');
  }

  // Enforce state machine transition matrix
  if (appointment.status === 'CANCELLED') {
    const error = new Error('Cannot change status of a cancelled appointment.');
    error.statusCode = 400;
    throw error;
  }

  if (appointment.status === 'COMPLETED') {
    const error = new Error('Cannot change status of a completed appointment.');
    error.statusCode = 400;
    throw error;
  }

  if (appointment.status === 'NO_SHOW') {
    const error = new Error('Cannot change status of a no-show appointment.');
    error.statusCode = 400;
    throw error;
  }

  // Current status is CONFIRMED, allowed transitions: COMPLETED, CANCELLED, NO_SHOW
  appointment.status = newStatus;
  await appointment.save();

  const populated = await Appointment.findById(appointment._id)
    .populate('serviceId', 'name durationMinutes price')
    .populate('staffId', 'name email phone');

  return populated;
};

/**
 * Cancel an appointment (sets status = 'CANCELLED').
 * Releases the slot immediately for future bookings.
 * Delegates to centralized updateAppointmentStatus.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - Appointment ID
 * @returns {Promise<object>} Updated appointment
 */
export const cancelAppointment = async (user, id) => {
  return await updateAppointmentStatus(user, id, 'CANCELLED');
};

