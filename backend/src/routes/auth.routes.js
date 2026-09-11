import { Router } from 'express';
import { login, me, logout } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// POST /api/auth/login - Authenticate with email/password
router.post('/login', authRateLimiter, validateBody(loginSchema), login);

// GET /api/auth/me - Retrieve current authenticated session
router.get('/me', authenticate, me);

// POST /api/auth/logout - Clear authentication cookie
router.post('/logout', logout);

export default router;
