import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireBusinessAccess } from '../middleware/tenant.middleware.js';
import { validateBody } from '../validators/auth.validator.js';
import {
  createBlockedDateSchema,
  updateBlockedDateSchema,
} from '../validators/blockedDate.validator.js';
import {
  create,
  list,
  getById,
  update,
  remove,
} from '../controllers/blockedDate.controller.js';

const router = Router();

// Blocked dates endpoints are strictly scoped to authenticated BUSINESS_ADMIN users
router.use(authenticate);
router.use(requireRole('BUSINESS_ADMIN'));
router.use(requireBusinessAccess());

router.post('/', validateBody(createBlockedDateSchema), create);
router.get('/', list);
router.get('/:id', getById);
router.patch('/:id', validateBody(updateBlockedDateSchema), update);
router.delete('/:id', remove);

export default router;
