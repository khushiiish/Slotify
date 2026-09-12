import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireBusinessAccess } from '../middleware/tenant.middleware.js';
import { validateBody, validateQuery } from '../validators/auth.validator.js';
import {
  createAppointmentSchema,
  getAppointmentsQuerySchema,
  updateAppointmentStatusSchema,
} from '../validators/appointment.validator.js';
import {
  createAppointment,
  listAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
} from '../controllers/appointment.controller.js';

const router = Router();

// Appointment management endpoints are strictly scoped to authenticated BUSINESS_ADMIN users
router.use(authenticate);
router.use(requireRole('BUSINESS_ADMIN'));
router.use(requireBusinessAccess());

// Protected admin appointment endpoints
router.post('/', validateBody(createAppointmentSchema), createAppointment);
router.get('/', validateQuery(getAppointmentsQuerySchema), listAppointments);
router.get('/:id', getAppointmentById);
router.patch('/:id/status', validateBody(updateAppointmentStatusSchema), updateAppointmentStatus);
router.patch('/:id/cancel', cancelAppointment);

export default router;

