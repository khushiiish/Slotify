import mongoose from 'mongoose';
import Availability from '../models/availability.model.js';
import Staff from '../models/staff.model.js';
import { assertTenantOwnership } from '../utils/tenant.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Validates whether two time ranges [startA, endA] and [startB, endB] overlap.
 * Format: "HH:mm"
 * Overlap exists if startA < endB and endA > startB.
 */
const checkTimesOverlap = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

/**
 * Creates a recurring weekly availability window for the business or specific staff member.
 *
 * @param {object} user - Authenticated user context
 * @param {object} data - Validated payload
 * @returns {Promise<object>} Created availability record
 */
export const createAvailability = async (user, data) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  // Prevent client spoofing of businessId
  if (data?.businessId && data.businessId.toString() !== user.businessId.toString()) {
    const error = new Error('You do not have permission to access resources belonging to another business.');
    error.statusCode = 403;
    throw error;
  }

  let staffId = null;
  if (data.staffId && data.staffId !== 'null') {
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
    if (staff.businessId.toString() !== user.businessId.toString()) {
      const error = new Error('You do not have permission to access resources belonging to another business.');
      error.statusCode = 403;
      throw error;
    }
    if (staff.status !== 'ACTIVE') {
      const error = new Error('Cannot configure availability for an inactive staff member.');
      error.statusCode = 400;
      throw error;
    }
    staffId = staff._id;
  }

  // Overlap and duplicate prevention check
  const existingWindows = await Availability.find({
    businessId: user.businessId,
    staffId: staffId,
    dayOfWeek: data.dayOfWeek,
    isActive: true,
  });

  for (const win of existingWindows) {
    if (checkTimesOverlap(data.startTime, data.endTime, win.startTime, win.endTime)) {
      const error = new Error(
        `Availability window (${data.startTime} - ${data.endTime}) overlaps with an existing window (${win.startTime} - ${win.endTime}) on the same day.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const availability = await Availability.create({
    businessId: user.businessId,
    staffId: staffId,
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    isActive: data.isActive !== undefined ? data.isActive : true,
  });

  if (availability.staffId) {
    await availability.populate('staffId', 'name email');
  }

  return availability;
};

/**
 * Lists availability windows scoped exclusively to the authenticated tenant.
 *
 * @param {object} user - Authenticated user context
 * @param {object} [query={}] - Optional query parameters
 * @returns {Promise<Array>}
 */
export const listAvailability = async (user, query = {}) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  const filter = { businessId: user.businessId };

  if (query.staffId !== undefined) {
    if (query.staffId === 'null' || query.staffId === null) {
      filter.staffId = null;
    } else if (OBJECT_ID_REGEX.test(query.staffId)) {
      filter.staffId = query.staffId;
    }
  }

  const windows = await Availability.find(filter)
    .populate('staffId', 'name email')
    .sort({ dayOfWeek: 1, startTime: 1 });

  return windows;
};

/**
 * Retrieves a single availability window by ID with tenant ownership check.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - Availability record ID
 * @returns {Promise<object>}
 */
export const getAvailabilityById = async (user, id) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  if (!OBJECT_ID_REGEX.test(id)) {
    const error = new Error('Invalid availability ID format.');
    error.statusCode = 400;
    throw error;
  }

  const availability = await Availability.findById(id).populate('staffId', 'name email');
  if (!availability) {
    const error = new Error('Availability window not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(availability, user);
  return availability;
};

/**
 * Updates an availability window with ownership and overlap validation.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - Availability record ID
 * @param {object} updateData - Updated fields
 * @returns {Promise<object>}
 */
export const updateAvailability = async (user, id, updateData) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  if (!OBJECT_ID_REGEX.test(id)) {
    const error = new Error('Invalid availability ID format.');
    error.statusCode = 400;
    throw error;
  }

  const availability = await Availability.findById(id);
  if (!availability) {
    const error = new Error('Availability window not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(availability, user);

  if (updateData?.businessId && updateData.businessId.toString() !== user.businessId.toString()) {
    const error = new Error('You do not have permission to access resources belonging to another business.');
    error.statusCode = 403;
    throw error;
  }

  let targetStaffId = availability.staffId;
  if (updateData.staffId !== undefined) {
    if (updateData.staffId && updateData.staffId !== 'null') {
      if (!OBJECT_ID_REGEX.test(updateData.staffId)) {
        const error = new Error('Invalid staff ID format.');
        error.statusCode = 400;
        throw error;
      }
      const staff = await Staff.findById(updateData.staffId);
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
        const error = new Error('Cannot configure availability for an inactive staff member.');
        error.statusCode = 400;
        throw error;
      }
      targetStaffId = staff._id;
    } else {
      targetStaffId = null;
    }
  }

  const effectiveDay = updateData.dayOfWeek !== undefined ? updateData.dayOfWeek : availability.dayOfWeek;
  const effectiveStart = updateData.startTime || availability.startTime;
  const effectiveEnd = updateData.endTime || availability.endTime;
  const effectiveIsActive = updateData.isActive !== undefined ? updateData.isActive : availability.isActive;

  if (effectiveStart >= effectiveEnd) {
    const error = new Error('Start time must be strictly before end time.');
    error.statusCode = 400;
    throw error;
  }

  if (effectiveIsActive) {
    const otherWindows = await Availability.find({
      businessId: user.businessId,
      staffId: targetStaffId,
      dayOfWeek: effectiveDay,
      _id: { $ne: availability._id },
      isActive: true,
    });

    for (const win of otherWindows) {
      if (checkTimesOverlap(effectiveStart, effectiveEnd, win.startTime, win.endTime)) {
        const error = new Error(
          `Availability window (${effectiveStart} - ${effectiveEnd}) overlaps with an existing window (${win.startTime} - ${win.endTime}) on the same day.`
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  availability.staffId = targetStaffId;
  availability.dayOfWeek = effectiveDay;
  availability.startTime = effectiveStart;
  availability.endTime = effectiveEnd;
  availability.isActive = effectiveIsActive;

  await availability.save();
  if (availability.staffId) {
    await availability.populate('staffId', 'name email');
  }

  return availability;
};

/**
 * Deletes an availability window.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - Availability record ID
 * @returns {Promise<object>}
 */
export const deleteAvailability = async (user, id) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  if (!OBJECT_ID_REGEX.test(id)) {
    const error = new Error('Invalid availability ID format.');
    error.statusCode = 400;
    throw error;
  }

  const availability = await Availability.findById(id);
  if (!availability) {
    const error = new Error('Availability window not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(availability, user);

  await Availability.findByIdAndDelete(id);

  return { success: true, message: 'Availability window deleted successfully.' };
};
