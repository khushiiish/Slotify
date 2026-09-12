import * as appointmentService from '../services/appointment.service.js';
import { assertTenantOwnership } from '../utils/tenant.js';

/**
 * Create a new appointment.
 * Derives businessId from authenticated user context (req.user.businessId).
 * Blocks payload spoofing attempts with 403 Forbidden.
 */
export const createAppointment = async (req, res, next) => {
  try {
    if (req.body.businessId && req.body.businessId.toString() !== req.user.businessId.toString()) {
      const error = new Error('You do not have permission to access resources belonging to another business.');
      error.statusCode = 403;
      throw error;
    }

    const result = await appointmentService.createAppointment(req.user.businessId, req.body);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List appointments for the authenticated business.
 * Supports optional filters: date, startDate, endDate, status, staffId, serviceId, search, page, limit.
 */
export const listAppointments = async (req, res, next) => {
  try {
    const query = req.validatedQuery || req.query || {};
    const result = await appointmentService.listAppointments(req.user, query);

    res.status(200).json({
      success: true,
      count: result.appointments.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: result.appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve an appointment by ID with tenant isolation check.
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById(req.user, req.params.id);

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update appointment status (CONFIRMED -> COMPLETED, CANCELLED, NO_SHOW).
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointmentStatus(
      req.user,
      req.params.id,
      req.body.status
    );

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${req.body.status}.`,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an appointment and immediately release the time slot.
 */
export const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.cancelAppointment(req.user, req.params.id);

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

