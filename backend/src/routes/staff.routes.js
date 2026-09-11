import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireBusinessAccess } from '../middleware/tenant.middleware.js';
import { validateBody } from '../validators/auth.validator.js';
import {
  createStaffSchema,
  updateStaffSchema,
} from '../validators/staff.validator.js';
import {
  create,
  list,
  getById,
  update,
  remove,
} from '../controllers/staff.controller.js';

const router = Router();

// All staff endpoints are strictly scoped to authenticated BUSINESS_ADMIN users
router.use(authenticate);
router.use(requireRole('BUSINESS_ADMIN'));
router.use(requireBusinessAccess());

router.post('/', validateBody(createStaffSchema), create);
router.get('/', list);
router.get('/:staffId', getById);
router.patch('/:staffId', validateBody(updateStaffSchema), update);
router.delete('/:staffId', remove);

export default router;
