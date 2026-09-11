import mongoose from 'mongoose';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import Appointment from '../models/appointment.model.js';
import { assertTenantOwnership } from '../utils/tenant.js';

/**
 * Service management business logic.
 * Enforces strict tenant scoping for BUSINESS_ADMIN operations.
 */

/**
 * Create a new service for the authenticated business admin's tenant.
 *
 * @param {object} user - Authenticated user from req.user
 * @param {object} serviceData - Validated service fields
 * @returns {Promise<object>} Created service document
 */
export const createService = async (user, serviceData) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  // Prevent client from attempting to override or spoof businessId
  if (serviceData?.businessId && serviceData.businessId.toString() !== user.businessId.toString()) {
    const error = new Error('You do not have permission to access resources belonging to another business.');
    error.statusCode = 403;
    throw error;
  }

  const service = await Service.create({
    name: serviceData.name,
    description: serviceData.description || '',
    durationMinutes: serviceData.durationMinutes,
    businessId: user.businessId,
    status: serviceData.status || 'ACTIVE',
  });

  return service;
};

/**
 * List all services belonging exclusively to the authenticated tenant.
 *
 * @param {object} user - Authenticated user from req.user
 * @returns {Promise<Array>} List of services
 */
export const listServices = async (user) => {
  if (!user?.businessId) {
    const error = new Error('User is not associated with any business.');
    error.statusCode = 403;
    throw error;
  }

  const services = await Service.find({ businessId: user.businessId }).sort({ name: 1 });
  return services;
};

/**
 * Get a specific service by ID, asserting tenant boundary.
 *
 * @param {object} user - Authenticated user from req.user
 * @param {string} serviceId - Target service ID
 * @returns {Promise<object>} Service document
 */
export const getServiceById = async (user, serviceId) => {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
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

  // Assert ownership: throws 403 if service belongs to another business
  assertTenantOwnership(service, user);

  return service;
};

/**
 * Update an existing service, verifying tenant ownership.
 *
 * @param {object} user - Authenticated user from req.user
 * @param {string} serviceId - Target service ID
 * @param {object} updateData - Validated fields to update
 * @returns {Promise<object>} Updated service document
 */
export const updateService = async (user, serviceId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
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

  assertTenantOwnership(service, user);

  if (updateData?.businessId && updateData.businessId.toString() !== user.businessId.toString()) {
    const error = new Error('You do not have permission to access resources belonging to another business.');
    error.statusCode = 403;
    throw error;
  }

  if (updateData.name !== undefined) service.name = updateData.name;
  if (updateData.description !== undefined) service.description = updateData.description;
  if (updateData.durationMinutes !== undefined) service.durationMinutes = updateData.durationMinutes;
  if (updateData.status !== undefined) service.status = updateData.status;

  await service.save();
  return service;
};

/**
 * Safe deletion of a service.
 * Enforces reference integrity: blocks deletion if referenced by Appointments or assigned to Staff.
 *
 * @param {object} user - Authenticated user from req.user
 * @param {string} serviceId - Target service ID
 * @returns {Promise<object>} Success confirmation
 */
export const deleteService = async (user, serviceId) => {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
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

  assertTenantOwnership(service, user);

  // 1. Check Appointment references
  const appointmentRef = await Appointment.findOne({ serviceId: service._id });
  if (appointmentRef) {
    const error = new Error(
      'Cannot delete service because it is referenced by existing appointments. Please deactivate it instead.'
    );
    error.statusCode = 400;
    throw error;
  }

  // 2. Check Staff serviceIds assignment
  const staffRef = await Staff.findOne({
    businessId: user.businessId,
    serviceIds: service._id,
  });
  if (staffRef) {
    const error = new Error(
      'Cannot delete service because it is assigned to one or more staff members. Unassign it from staff or deactivate it instead.'
    );
    error.statusCode = 400;
    throw error;
  }

  await Service.deleteOne({ _id: service._id });
  return { message: 'Service deleted successfully.' };
};
