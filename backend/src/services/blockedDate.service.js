import mongoose from 'mongoose';
import BlockedDate from '../models/blockedDate.model.js';
import Staff from '../models/staff.model.js';
import { assertTenantOwnership } from '../utils/tenant.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Normalizes a YYYY-MM-DD string into a UTC midnight Date object.
 */
const normalizeDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
};

/**
 * Creates a blocked date entry for the business or specific staff member.
 *
 * @param {object} user - Authenticated user context
 * @param {object} data - Validated payload
 * @returns {Promise<object>}
 */
export const createBlockedDate = async (user, data) => {
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
      const error = new Error('Cannot block dates for an inactive staff member.');
      error.statusCode = 400;
      throw error;
    }
    staffId = staff._id;
  }

  const targetDate = normalizeDate(data.date);

  // Duplicate check
  const existing = await BlockedDate.findOne({
    businessId: user.businessId,
    staffId: staffId,
    date: targetDate,
  });

  if (existing) {
    const error = new Error('This date is already blocked for the specified scope.');
    error.statusCode = 400;
    throw error;
  }

  const blockedDate = await BlockedDate.create({
    businessId: user.businessId,
    staffId: staffId,
    date: targetDate,
    reason: data.reason || '',
  });

  if (blockedDate.staffId) {
    await blockedDate.populate('staffId', 'name email');
  }

  return blockedDate;
};

/**
 * Lists all blocked dates for the tenant.
 *
 * @param {object} user - Authenticated user context
 * @returns {Promise<Array>}
 */
export const listBlockedDates = async (user) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  const blockedDates = await BlockedDate.find({ businessId: user.businessId })
    .populate('staffId', 'name email')
    .sort({ date: 1 });

  return blockedDates;
};

/**
 * Retrieves a single blocked date by ID with tenant ownership check.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - BlockedDate record ID
 * @returns {Promise<object>}
 */
export const getBlockedDateById = async (user, id) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  if (!OBJECT_ID_REGEX.test(id)) {
    const error = new Error('Invalid blocked date ID format.');
    error.statusCode = 400;
    throw error;
  }

  const blockedDate = await BlockedDate.findById(id).populate('staffId', 'name email');
  if (!blockedDate) {
    const error = new Error('Blocked date not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(blockedDate, user);
  return blockedDate;
};

/**
 * Updates an existing blocked date.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - BlockedDate record ID
 * @param {object} updateData - Updated fields
 * @returns {Promise<object>}
 */
export const updateBlockedDate = async (user, id, updateData) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  if (!OBJECT_ID_REGEX.test(id)) {
    const error = new Error('Invalid blocked date ID format.');
    error.statusCode = 400;
    throw error;
  }

  const blockedDate = await BlockedDate.findById(id);
  if (!blockedDate) {
    const error = new Error('Blocked date not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(blockedDate, user);

  if (updateData?.businessId && updateData.businessId.toString() !== user.businessId.toString()) {
    const error = new Error('You do not have permission to access resources belonging to another business.');
    error.statusCode = 403;
    throw error;
  }

  let targetStaffId = blockedDate.staffId;
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
      targetStaffId = staff._id;
    } else {
      targetStaffId = null;
    }
  }

  const targetDate = updateData.date ? normalizeDate(updateData.date) : blockedDate.date;

  // Duplicate check against other records
  const existing = await BlockedDate.findOne({
    businessId: user.businessId,
    staffId: targetStaffId,
    date: targetDate,
    _id: { $ne: blockedDate._id },
  });

  if (existing) {
    const error = new Error('This date is already blocked for the specified scope.');
    error.statusCode = 400;
    throw error;
  }

  blockedDate.staffId = targetStaffId;
  blockedDate.date = targetDate;
  if (updateData.reason !== undefined) {
    blockedDate.reason = updateData.reason;
  }

  await blockedDate.save();
  if (blockedDate.staffId) {
    await blockedDate.populate('staffId', 'name email');
  }

  return blockedDate;
};

/**
 * Deletes a blocked date.
 *
 * @param {object} user - Authenticated user context
 * @param {string} id - BlockedDate record ID
 * @returns {Promise<object>}
 */
export const deleteBlockedDate = async (user, id) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  if (!OBJECT_ID_REGEX.test(id)) {
    const error = new Error('Invalid blocked date ID format.');
    error.statusCode = 400;
    throw error;
  }

  const blockedDate = await BlockedDate.findById(id);
  if (!blockedDate) {
    const error = new Error('Blocked date not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(blockedDate, user);

  await BlockedDate.findByIdAndDelete(id);

  return { success: true, message: 'Blocked date removed successfully.' };
};
