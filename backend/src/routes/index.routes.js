import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import businessRoutes from './business.routes.js';

const router = Router();

// Health Check Route
router.use('/health', healthRoutes);

// Phase 2: Authentication Routes
router.use('/auth', authRoutes);

// Phase 3: Tenant & Role Protected Business Routes
router.use('/businesses', businessRoutes);
// router.use('/services', serviceRoutes);
// router.use('/staff', staffRoutes);
// router.use('/availability', availabilityRoutes);
// router.use('/appointments', appointmentRoutes);
// router.use('/customers', customerRoutes);

export default router;
