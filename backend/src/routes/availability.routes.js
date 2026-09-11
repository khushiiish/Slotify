import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireBusinessAccess } from '../middleware/tenant.middleware.js';
import { validateBody, validateQuery } from '../validators/auth.validator.js';
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  slotQuerySchema,
} from '../validators/availability.validator.js';
import {
  create,
  list,
  getById,
  update,
  remove,
  getSlotsPreview,
} from '../controllers/availability.controller.js';

const router = Router();

// Availability endpoints are strictly scoped to authenticated BUSINESS_ADMIN users
router.use(authenticate);
router.use(requireRole('BUSINESS_ADMIN'));
router.use(requireBusinessAccess());

// Slot preview calculation endpoint (must be defined before /:id)
router.get('/slots', validateQuery(slotQuerySchema), getSlotsPreview);

// Availability CRUD endpoints
router.post('/', validateBody(createAvailabilitySchema), create);
router.get('/', list);
router.get('/:id', getById);
router.patch('/:id', validateBody(updateAvailabilitySchema), update);
router.delete('/:id', remove);

export default router;
