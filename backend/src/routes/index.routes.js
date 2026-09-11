import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

// Phase 0: Health Check Route
router.use('/health', healthRoutes);

// Future Phase Route Placeholders:
// router.use('/auth', authRoutes);
// router.use('/businesses', businessRoutes);
// router.use('/services', serviceRoutes);
// router.use('/staff', staffRoutes);
// router.use('/availability', availabilityRoutes);
// router.use('/appointments', appointmentRoutes);
// router.use('/customers', customerRoutes);

export default router;
