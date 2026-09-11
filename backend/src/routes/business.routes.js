import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { requireBusinessAccess } from '../middleware/tenant.middleware.js';
import {
  getAllBusinesses,
  getBusinessById,
  getBusinessServices,
  createBusinessService,
  getServiceById,
} from '../controllers/business.controller.js';

const router = Router();

// ==========================================
// 1. Platform-Level: SYSTEM_OWNER Only
// ==========================================
// Retrieves all businesses registered across the platform.
// BUSINESS_ADMIN receives 403 Forbidden.
router.get(
  '/',
  authenticate,
  requireRole('SYSTEM_OWNER'),
  getAllBusinesses
);

// ==========================================
// 2. Business Details: SYSTEM_OWNER or matching BUSINESS_ADMIN
// ==========================================
// SYSTEM_OWNER can view any business.
// BUSINESS_ADMIN can view ONLY their own business (verified by requireBusinessAccess).
router.get(
  '/:businessId',
  authenticate,
  requireRole('SYSTEM_OWNER', 'BUSINESS_ADMIN'),
  requireBusinessAccess('businessId'),
  getBusinessById
);

// ==========================================
// 3. Tenant-Scoped Services: Read
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
// 4. Tenant-Scoped Services: Create
// ==========================================
// Creates a service for the business.
// Authoritative businessId is forced from req.user.businessId.
router.post(
  '/:businessId/services',
  authenticate,
  requireRole('BUSINESS_ADMIN'),
  requireBusinessAccess('businessId'),
  createBusinessService
);

// ==========================================
// 5. Tenant-Scoped Services: IDOR Protection
// ==========================================
// Retrieves a specific service by ID, asserting tenant ownership.
router.get(
  '/:businessId/services/:serviceId',
  authenticate,
  requireRole('SYSTEM_OWNER', 'BUSINESS_ADMIN'),
  requireBusinessAccess('businessId'),
  getServiceById
);

export default router;
