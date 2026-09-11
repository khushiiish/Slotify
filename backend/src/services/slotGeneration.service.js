import mongoose from 'mongoose';
import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import Availability from '../models/availability.model.js';
import BlockedDate from '../models/blockedDate.model.js';
import Appointment from '../models/appointment.model.js';
import {
  getDayOfWeekForDate,
  timeStrToMinutes,
  minutesToTimeStr,
  localToUtc,
} from '../utils/timezone.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const SLOT_INTERVAL_MINUTES = 15; // 15-minute increment for candidate slot start times

/**
 * Normalizes a YYYY-MM-DD string into a UTC midnight Date object for BlockedDate queries.
 */
const normalizeDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
};

/**
 * Reusable slot generation engine.
 * Calculates available bookable appointment slots given business, service, date, and optional staff.
 *
 * @param {object} user - Authenticated user context from req.user
 * @param {object} params - Calculation parameters
 * @param {string} params.serviceId - Service ID
 * @param {string} params.dateStr - Date string in "YYYY-MM-DD" format
 * @param {string} [params.staffId] - Optional Staff ID
 * @returns {Promise<object>} Available slots payload
 */
export const generateAvailableSlots = async (user, { serviceId, dateStr, staffId }) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  // 1. Verify Business exists and is ACTIVE
  const business = await Business.findById(user.businessId);
  if (!business || business.status !== 'ACTIVE') {
    const error = new Error('Business account is inactive or disabled.');
    error.statusCode = 403;
    throw error;
  }

  const businessTimezone = business.timezone || 'Asia/Kolkata';

  // 2. Verify Service exists, belongs to tenant, is ACTIVE, and has duration
  if (!OBJECT_ID_REGEX.test(serviceId)) {
    const error = new Error('Invalid service ID format.');
    error.statusCode = 400;
    throw error;
  }

  const service = await Service.findById(serviceId);
  if (!service) {
    const error = new Error('Service not found.');
    error.statusCode = 404;
    throw error;
  }

  if (service.businessId.toString() !== user.businessId.toString()) {
    const error = new Error('You do not have permission to access resources belonging to another business.');
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

  // 3. Calendar date details
  const dayOfWeek = getDayOfWeekForDate(dateStr);
  const targetDateNormalized = normalizeDate(dateStr);

  // 4. Check Business-Wide Blocked Date
  const businessBlocked = await BlockedDate.findOne({
    businessId: user.businessId,
    staffId: null,
    date: targetDateNormalized,
  });

  if (businessBlocked) {
    return {
      date: dateStr,
      timezone: businessTimezone,
      service: {
        id: service._id,
        name: service.name,
        durationMinutes: duration,
      },
      slotsCount: 0,
      slots: [],
    };
  }

  // 5. Determine Eligible Staff
  let candidateStaffList = [];

  if (staffId && staffId !== 'null') {
    // Mode A: Specific staff member requested
    if (!OBJECT_ID_REGEX.test(staffId)) {
      const error = new Error('Invalid staff ID format.');
      error.statusCode = 400;
      throw error;
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      const error = new Error('Staff member not found.');
      error.statusCode = 404;
      throw error;
    }

    if (staff.businessId.toString() !== user.businessId.toString()) {
      const error = new Error('You do not have permission to access resources belonging to another business.');
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
      const error = new Error('Staff member does not provide the requested service.');
      error.statusCode = 400;
      throw error;
    }

    // Check staff-specific blocked date
    const staffBlocked = await BlockedDate.findOne({
      businessId: user.businessId,
      staffId: staff._id,
      date: targetDateNormalized,
    });

    if (staffBlocked) {
      return {
        date: dateStr,
        timezone: businessTimezone,
        service: {
          id: service._id,
          name: service.name,
          durationMinutes: duration,
        },
        slotsCount: 0,
        slots: [],
      };
    }

    candidateStaffList = [staff];
  } else {
    // Mode B: Any eligible active staff providing this service
    const activeStaff = await Staff.find({
      businessId: user.businessId,
      status: 'ACTIVE',
      serviceIds: service._id,
    });

    if (activeStaff.length === 0) {
      return {
        date: dateStr,
        timezone: businessTimezone,
        service: {
          id: service._id,
          name: service.name,
          durationMinutes: duration,
        },
        slotsCount: 0,
        slots: [],
      };
    }

    // Filter out staff with staff-specific blocked date
    const staffBlockedEntries = await BlockedDate.find({
      businessId: user.businessId,
      staffId: { $in: activeStaff.map((s) => s._id) },
      date: targetDateNormalized,
    });

    const blockedStaffIds = new Set(
      staffBlockedEntries.map((b) => b.staffId.toString())
    );

    candidateStaffList = activeStaff.filter(
      (s) => !blockedStaffIds.has(s._id.toString())
    );
  }

  // 6. Calculate UTC boundaries of the target calendar date in business timezone
  const dayStartUtc = localToUtc(dateStr, '00:00', businessTimezone);
  // 24 hours later
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

  const slots = [];

  // 7. For each candidate staff member, compute effective availability & slots
  for (const staff of candidateStaffList) {
    // A. Check for staff-specific active availability on this weekday
    let effectiveWindows = await Availability.find({
      businessId: user.businessId,
      staffId: staff._id,
      dayOfWeek: dayOfWeek,
      isActive: true,
    }).sort({ startTime: 1 });

    // B. If no staff-specific availability, fall back to business-level availability
    if (effectiveWindows.length === 0) {
      effectiveWindows = await Availability.find({
        businessId: user.businessId,
        staffId: null,
        dayOfWeek: dayOfWeek,
        isActive: true,
      }).sort({ startTime: 1 });
    }

    // If still no availability windows, staff has no working hours today
    if (effectiveWindows.length === 0) {
      continue;
    }

    // C. Fetch existing non-cancelled appointments for this staff overlapping the day's UTC range
    const staffAppointments = await Appointment.find({
      businessId: user.businessId,
      staffId: staff._id,
      status: { $ne: 'CANCELLED' },
      startTime: { $lt: dayEndUtc },
      endTime: { $gt: dayStartUtc },
    });

    // D. Step through each availability window with 15-minute slot intervals
    for (const win of effectiveWindows) {
      const windowStartMin = timeStrToMinutes(win.startTime);
      const windowEndMin = timeStrToMinutes(win.endTime);

      let currentStartMin = windowStartMin;

      // Candidate slot must fit completely within window
      while (currentStartMin + duration <= windowEndMin) {
        const currentEndMin = currentStartMin + duration;

        const localStartStr = minutesToTimeStr(currentStartMin);
        const localEndStr = minutesToTimeStr(currentEndMin);

        // Convert local wall-clock bounds to UTC Dates using business timezone
        const slotStartUtc = localToUtc(dateStr, localStartStr, businessTimezone);
        const slotEndUtc = localToUtc(dateStr, localEndStr, businessTimezone);

        // Check overlap against existing appointments
        // Overlap condition: slotStart < appointmentEnd AND slotEnd > appointmentStart
        const hasConflict = staffAppointments.some((appt) => {
          return slotStartUtc < appt.endTime && slotEndUtc > appt.startTime;
        });

        if (!hasConflict) {
          slots.push({
            startTime: slotStartUtc.toISOString(),
            endTime: slotEndUtc.toISOString(),
            localStartTime: localStartStr,
            localEndTime: localEndStr,
            staffId: staff._id,
            staffName: staff.name,
            serviceId: service._id,
            serviceName: service.name,
          });
        }

        // Advance by slot interval (15 minutes)
        currentStartMin += SLOT_INTERVAL_MINUTES;
      }
    }
  }

  // 8. Sort slots chronologically, then by staff name
  slots.sort((a, b) => {
    const timeDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.staffName.localeCompare(b.staffName);
  });

  return {
    date: dateStr,
    timezone: businessTimezone,
    service: {
      id: service._id,
      name: service.name,
      durationMinutes: duration,
    },
    slotsCount: slots.length,
    slots,
  };
};
