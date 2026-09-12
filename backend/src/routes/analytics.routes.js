import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireBusinessAccess } from '../middleware/tenant.middleware.js';
import { validateQuery } from '../validators/auth.validator.js';
import { analyticsQuerySchema } from '../validators/analytics.validator.js';
import {
  getTenantOverview,
  getPlatformOverview,
} from '../controllers/analytics.controller.js';

const router = Router();

// Base authentication required for all analytics
router.use(authenticate);

// Business Admin tenant analytics
router.get(
  '/overview',
  requireRole('BUSINESS_ADMIN'),
  requireBusinessAccess(),
  validateQuery(analyticsQuerySchema),
  getTenantOverview
);

// System Owner platform analytics
router.get(
  '/platform',
  requireRole('SYSTEM_OWNER'),
  getPlatformOverview
);

export default router;
