import { Router } from 'express';
import { validateBody, validateQuery } from '../validators/auth.validator.js';
import {
  publicSlotQuerySchema,
  publicBookingSchema,
} from '../validators/public.validator.js';
import {
  getBusinessBySlug,
  getSlotsBySlug,
  createAppointment,
  getAppointment,
  cancelAppointment,
} from '../controllers/public.controller.js';
import { publicBookingRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Public Business & Scheduling Discovery
router.get('/businesses/:slug', getBusinessBySlug);
router.get('/businesses/:slug/slots', validateQuery(publicSlotQuerySchema), getSlotsBySlug);
router.post('/businesses/:slug/appointments', publicBookingRateLimiter, validateBody(publicBookingSchema), createAppointment);

// Secure Customer Appointment Access & Cancellation
router.get('/appointments/:id', getAppointment);
router.patch('/appointments/:id/cancel', publicBookingRateLimiter, cancelAppointment);

export default router;
