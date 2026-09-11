import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireBusinessAccess } from '../middleware/tenant.middleware.js';
import { validateBody } from '../validators/auth.validator.js';
import {
  createBusinessSchema,
  updateBusinessStatusSchema,
} from '../validators/business.validator.js';
import {
  getAllBusinesses,
  onboardBusiness,
  getBusinessById,
  updateStatus,
  getBusinessServices,
  createBusinessService,
  getServiceById,
} from '../controllers/business.controller.js';

const router = Router();

// ==========================================
// 1. Platform-Level: System Owner Onboarding & Management
// ==========================================

// Create/onboard a new business with initial Business Admin (System Owner only)
router.post(
  '/',
  authenticate,
  requireRole('SYSTEM_OWNER'),
  validateBody(createBusinessSchema),
  onboardBusiness
);

// Retrieves all businesses registered across the platform (System Owner only)
router.get(
  '/',
  authenticate,
  requireRole('SYSTEM_OWNER'),
  getAllBusinesses
);

// Enable or disable a business (System Owner only)
router.patch(
  '/:businessId/status',
  authenticate,
  requireRole('SYSTEM_OWNER'),
  validateBody(updateBusinessStatusSchema),
  updateStatus
);

// ==========================================
// 2. Business Details: SYSTEM_OWNER or matching BUSINESS_ADMIN
// ==========================================
// SYSTEM_OWNER can view any business with enriched admin data.
// BUSINESS_ADMIN can view ONLY their own business (verified by requireBusinessAccess).
router.get(
  '/:businessId',
  authenticate,
  requireRole('SYSTEM_OWNER', 'BUSINESS_ADMIN'),
  requireBusinessAccess('businessId'),
  getBusinessById
);

// ==========================================
// 3. Tenant-Scoped Services: Read (Phase 3)
// ==========================================
// Lists services for the specified business.
router.get(
  '/:businessId/services',
  authenticate,
  requireRole('SYSTEM_OWNER', 'BUSINESS_ADMIN'),
  requireBusinessAccess('businessId'),
  getBusinessServices
);

// ==========================================
// 4. Tenant-Scoped Services: Create (Phase 3)
// ==========================================
// Creates a service for the business. Authoritative businessId from req.user.
router.post(
  '/:businessId/services',
  authenticate,
  requireRole('BUSINESS_ADMIN'),
  requireBusinessAccess('businessId'),
  createBusinessService
);

// ==========================================
// 5. Tenant-Scoped Services: IDOR Protection (Phase 3)
// ==========================================
router.get(
  '/:businessId/services/:serviceId',
  authenticate,
  requireRole('SYSTEM_OWNER', 'BUSINESS_ADMIN'),
  requireBusinessAccess('businessId'),
  getServiceById
);

export default router;
