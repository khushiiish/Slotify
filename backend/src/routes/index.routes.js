import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import businessRoutes from './business.routes.js';
import serviceRoutes from './service.routes.js';
import staffRoutes from './staff.routes.js';
import availabilityRoutes from './availability.routes.js';
import blockedDateRoutes from './blockedDate.routes.js';

const router = Router();

// Health Check Route
router.use('/health', healthRoutes);

// Phase 2: Authentication Routes
router.use('/auth', authRoutes);

// Phase 3 & 4: Tenant & Role Protected Business Routes
router.use('/businesses', businessRoutes);

// Phase 5: Business Admin Service & Staff Management Routes
router.use('/services', serviceRoutes);
router.use('/staff', staffRoutes);

// Phase 6: Availability Management, Blocked Dates & Slot Generation Preview
router.use('/availability', availabilityRoutes);
router.use('/blocked-dates', blockedDateRoutes);

// Future Phase Routes
// router.use('/appointments', appointmentRoutes);
// router.use('/customers', customerRoutes);

export default router;
