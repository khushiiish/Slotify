import mongoose from 'mongoose';
import Staff from '../models/staff.model.js';
import Service from '../models/service.model.js';
import Appointment from '../models/appointment.model.js';
import Availability from '../models/availability.model.js';
import { assertTenantOwnership } from '../utils/tenant.js';

/**
 * Validates and verifies that an array of service IDs exists and belongs strictly to the tenant.
 *
 * @param {string|mongoose.Types.ObjectId} businessId - Authenticated tenant ID
 * @param {Array<string>} serviceIds - Array of candidate service IDs
 * @returns {Promise<Array<mongoose.Types.ObjectId>>} Verified ObjectId instances
 */
export const validateAndVerifyServices = async (businessId, serviceIds) => {
  if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
    return [];
  }

  // 1. Format validation
  for (const id of serviceIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error(`Invalid service ID: ${id}`);
      error.statusCode = 400;
      throw error;
    }
  }

  // 2. Deduplicate
  const uniqueIds = [...new Set(serviceIds.map((id) => id.toString()))];

  // 3. Query services
  const foundServices = await Service.find({ _id: { $in: uniqueIds } });
  if (foundServices.length !== uniqueIds.length) {
    const error = new Error('One or more referenced services do not exist.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Zero-trust cross-tenant check: every service must belong to this business
  for (const s of foundServices) {
    if (s.businessId.toString() !== businessId.toString()) {
      const error = new Error('Staff cannot be assigned a service belonging to another tenant.');
      error.statusCode = 403;
      throw error;
    }
  }

  return uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
};

/**
 * Create a new staff member for the authenticated business admin's tenant.
 *
 * @param {object} user - Authenticated user from req.user
 * @param {object} staffData - Validated staff fields
 * @returns {Promise<object>} Created staff document with populated services
 */
export const createStaff = async (user, staffData) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  // Prevent client from attempting to override or spoof businessId
  if (staffData?.businessId && staffData.businessId.toString() !== user.businessId.toString()) {
    const error = new Error('You do not have permission to access resources belonging to another business.');
    error.statusCode = 403;
    throw error;
  }

  const verifiedServiceIds = await validateAndVerifyServices(
    user.businessId,
    staffData.serviceIds
  );

  const staff = await Staff.create({
    name: staffData.name,
    email: staffData.email || undefined,
    phone: staffData.phone || '',
    status: staffData.status || 'ACTIVE',
    serviceIds: verifiedServiceIds,
    businessId: user.businessId,
  });

  return await staff.populate('serviceIds', 'name durationMinutes status');
};

/**
 * List all staff members belonging to the authenticated tenant.
 *
 * @param {object} user - Authenticated user from req.user
 * @returns {Promise<Array>} List of staff members with populated services
 */
export const listStaff = async (user) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  const staffList = await Staff.find({ businessId: user.businessId })
    .populate('serviceIds', 'name durationMinutes status')
    .sort({ name: 1 });

  return staffList;
};

/**
 * Get a single staff member by ID, verifying tenant boundary.
 *
 * @param {object} user - Authenticated user from req.user
 * @param {string} staffId - Target staff ID
 * @returns {Promise<object>} Staff document with populated services
 */
export const getStaffById = async (user, staffId) => {
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    const error = new Error('Invalid staff ID format.');
    error.statusCode = 400;
    throw error;
  }

  const staff = await Staff.findById(staffId).populate('serviceIds', 'name durationMinutes status');
  if (!staff) {
    const error = new Error('Staff member not found.');
    error.statusCode = 404;
    throw error;
  }

  assertTenantOwnership(staff, user);

  return staff;
};

/**
 * Update an existing staff member, verifying tenant ownership and service assignments.
 *
 * @param {object} user - Authenticated user from req.user
 * @param {string} staffId - Target staff ID
 * @param {object} updateData - Validated fields to update
 * @returns {Promise<object>} Updated staff document with populated services
 */
export const updateStaff = async (user, staffId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
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

  assertTenantOwnership(staff, user);

  if (updateData?.businessId && updateData.businessId.toString() !== user.businessId.toString()) {
    const error = new Error('You do not have permission to access resources belonging to another business.');
    error.statusCode = 403;
    throw error;
  }

  if (updateData.serviceIds !== undefined) {
    staff.serviceIds = await validateAndVerifyServices(user.businessId, updateData.serviceIds);
  }

  if (updateData.name !== undefined) staff.name = updateData.name;
  if (updateData.email !== undefined) staff.email = updateData.email || undefined;
  if (updateData.phone !== undefined) staff.phone = updateData.phone;
  if (updateData.status !== undefined) staff.status = updateData.status;

  await staff.save();
  return await staff.populate('serviceIds', 'name durationMinutes status');
};

/**
 * Safe deletion of a staff member.
 * Blocks deletion if referenced by Appointments or Availability schedules.
 *
 * @param {object} user - Authenticated user from req.user
 * @param {string} staffId - Target staff ID
 * @returns {Promise<object>} Success confirmation
 */
export const deleteStaff = async (user, staffId) => {
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
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

  assertTenantOwnership(staff, user);

  // 1. Check Appointment references
  const appointmentRef = await Appointment.findOne({ staffId: staff._id });
  if (appointmentRef) {
    const error = new Error(
      'Cannot delete staff member because they are referenced by existing appointments. Please deactivate them instead.'
    );
    error.statusCode = 400;
    throw error;
  }

  // 2. Check Availability schedule references
  const availabilityRef = await Availability.findOne({ staffId: staff._id });
  if (availabilityRef) {
    const error = new Error(
      'Cannot delete staff member because availability schedules exist. Please deactivate them instead.'
    );
    error.statusCode = 400;
    throw error;
  }

  await Staff.deleteOne({ _id: staff._id });
  return { message: 'Staff member deleted successfully.' };
};
