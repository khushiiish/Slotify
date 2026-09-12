import * as publicService from '../services/public.service.js';

/**
 * Public business discovery endpoint.
 * GET /api/public/businesses/:slug
 */
export const getBusinessBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const business = await publicService.getPublicBusiness(slug);

    res.status(200).json({
      success: true,
      data: business,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public slot discovery endpoint.
 * GET /api/public/businesses/:slug/slots
 */
export const getSlotsBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const query = req.validatedQuery || req.query;
    const result = await publicService.getPublicSlots(slug, query);

    res.status(200).json({
      success: true,
      message: 'Available slots calculated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public appointment creation endpoint.
 * POST /api/public/businesses/:slug/appointments
 */
export const createAppointment = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const result = await publicService.createPublicAppointment(slug, req.body);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Secure customer appointment view endpoint.
 * GET /api/public/appointments/:id?token=...
 */
export const getAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = req.query.token || req.headers['x-customer-token'];
    const appointment = await publicService.getPublicAppointment(id, token);

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Secure customer appointment cancellation endpoint.
 * PATCH /api/public/appointments/:id/cancel
 */
export const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = req.body.token || req.query.token || req.headers['x-customer-token'];
    const appointment = await publicService.cancelPublicAppointment(id, token);

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};
