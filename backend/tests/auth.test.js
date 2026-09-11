import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Business from '../src/models/business.model.js';
import { hashPassword } from '../src/utils/password.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';

describe('Phase 2 Authentication Endpoints', () => {
  let validPasswordHash;
  let mockSystemOwner;
  let mockBusinessAdmin;
  let mockDisabledUser;
  let mockAdminWithDisabledBiz;
  let mockActiveBiz;
  let mockDisabledBiz;

  beforeEach(async () => {
    vi.restoreAllMocks();
    validPasswordHash = await hashPassword('ValidPass123!');

    const sysOwnerId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const disabledUserId = new mongoose.Types.ObjectId();
    const adminDisabledBizId = new mongoose.Types.ObjectId();
    const activeBizId = new mongoose.Types.ObjectId();
    const disabledBizId = new mongoose.Types.ObjectId();

    mockSystemOwner = {
      _id: sysOwnerId,
      name: 'System Owner',
      email: 'owner@slotify.dev',
      role: 'SYSTEM_OWNER',
      businessId: null,
      status: 'ACTIVE',
      passwordHash: validPasswordHash,
    };

    mockActiveBiz = {
      _id: activeBizId,
      name: 'Active Business',
      status: 'ACTIVE',
    };

    mockDisabledBiz = {
      _id: disabledBizId,
      name: 'Disabled Business',
      status: 'DISABLED',
    };

    mockBusinessAdmin = {
      _id: adminId,
      name: 'Business Admin',
      email: 'admin@business.com',
      role: 'BUSINESS_ADMIN',
      businessId: activeBizId,
      status: 'ACTIVE',
      passwordHash: validPasswordHash,
    };

    mockDisabledUser = {
      _id: disabledUserId,
      name: 'Disabled User',
      email: 'disabled@slotify.dev',
      role: 'SYSTEM_OWNER',
      businessId: null,
      status: 'DISABLED',
      passwordHash: validPasswordHash,
    };

    mockAdminWithDisabledBiz = {
      _id: adminDisabledBizId,
      name: 'Admin with Disabled Biz',
      email: 'admin@disabledbiz.com',
      role: 'BUSINESS_ADMIN',
      businessId: disabledBizId,
      status: 'ACTIVE',
      passwordHash: validPasswordHash,
    };
  });

  describe('POST /api/auth/login', () => {
    it('should log in a System Owner with valid credentials', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockSystemOwner),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@slotify.dev', password: 'ValidPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data.user.email).toBe('owner@slotify.dev');
      expect(res.body.data.user.role).toBe('SYSTEM_OWNER');
      expect(res.body.data.user.businessId).toBeNull();
      // Security: passwordHash and token must never be in JSON response
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.token).toBeUndefined();

      // Cookie must be set and HTTP-only
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
    });

    it('should log in a Business Admin with valid credentials', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockBusinessAdmin),
      });
      vi.spyOn(Business, 'findById').mockResolvedValue(mockActiveBiz);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@business.com', password: 'ValidPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('BUSINESS_ADMIN');
      expect(res.body.data.user.businessId).toBe(mockActiveBiz._id.toString());
    });

    it('should reject invalid password with generic 401 error', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockSystemOwner),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@slotify.dev', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should reject non-existent email with generic 401 error', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notfound@slotify.dev', password: 'ValidPass123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should reject missing email with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'ValidPass123!' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'ValidPass123!' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing password with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@slotify.dev' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for disabled user with 403 error', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockDisabledUser),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'disabled@slotify.dev', password: 'ValidPass123!' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User account is disabled.');
    });

    it('should reject login for Business Admin if business is disabled with 403 error', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockAdminWithDisabledBiz),
      });
      vi.spyOn(Business, 'findById').mockResolvedValue(mockDisabledBiz);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@disabledbiz.com', password: 'ValidPass123!' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Business account is disabled.');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when no cookie is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No token provided');
    });

    it('should return 401 when invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${env.COOKIE_NAME}=invalid_token_string`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid authentication token.');
    });

    it('should return 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { userId: mockSystemOwner._id.toString(), role: mockSystemOwner.role },
        env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${env.COOKIE_NAME}=${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expired');
    });

    it('should return 200 with sanitized user profile when valid token provided', async () => {
      const validToken = generateAccessToken({
        userId: mockSystemOwner._id.toString(),
        role: mockSystemOwner.role,
        businessId: null,
      });

      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${env.COOKIE_NAME}=${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('owner@slotify.dev');
      expect(res.body.data.user.role).toBe('SYSTEM_OWNER');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject disabled user on /me even with valid token', async () => {
      const token = generateAccessToken({
        userId: mockDisabledUser._id.toString(),
        role: mockDisabledUser.role,
        businessId: null,
      });

      vi.spyOn(User, 'findById').mockResolvedValue(mockDisabledUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${env.COOKIE_NAME}=${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User account is disabled.');
    });

    it('should reject Business Admin on /me if business becomes disabled', async () => {
      const token = generateAccessToken({
        userId: mockAdminWithDisabledBiz._id.toString(),
        role: mockAdminWithDisabledBiz.role,
        businessId: mockDisabledBiz._id.toString(),
      });

      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminWithDisabledBiz);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockDisabledBiz);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `${env.COOKIE_NAME}=${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Business account is disabled.');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear authentication cookie and return 200', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logout successful');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`));
      expect(authCookie).toBeDefined();
      // Clearing cookie sets max-age/expires in past or empty value
      expect(authCookie).toMatch(/Expires=|Max-Age=0/);
    });
  });

  describe('Security Utilities', () => {
    it('should hash passwords and verify correctly with bcryptjs', async () => {
      const plain = 'MySecretPass123!';
      const hash = await hashPassword(plain);
      expect(hash).not.toBe(plain);
      const match = await (await import('../src/utils/password.js')).comparePassword(plain, hash);
      expect(match).toBe(true);
      const noMatch = await (await import('../src/utils/password.js')).comparePassword('WrongPass', hash);
      expect(noMatch).toBe(false);
    });

    it('should generate and verify valid JWT tokens', async () => {
      const payload = { userId: '12345', role: 'SYSTEM_OWNER', businessId: null };
      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      const decoded = (await import('../src/utils/jwt.js')).verifyAccessToken(token);
      expect(decoded.userId).toBe('12345');
      expect(decoded.role).toBe('SYSTEM_OWNER');
    });
  });
});
