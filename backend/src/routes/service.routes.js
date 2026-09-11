import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireBusinessAccess } from '../middleware/tenant.middleware.js';
import { validateBody } from '../validators/auth.validator.js';
import {
  createServiceSchema,
  updateServiceSchema,
} from '../validators/service.validator.js';
import {
  create,
  list,
  getById,
  update,
  remove,
} from '../controllers/service.controller.js';

const router = Router();

// All service endpoints are strictly scoped to authenticated BUSINESS_ADMIN users
router.use(authenticate);
router.use(requireRole('BUSINESS_ADMIN'));
router.use(requireBusinessAccess());

router.post('/', validateBody(createServiceSchema), create);
router.get('/', list);
router.get('/:serviceId', getById);
router.patch('/:serviceId', validateBody(updateServiceSchema), update);
router.delete('/:serviceId', remove);

export default router;
