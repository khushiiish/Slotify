import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Business from '../src/models/business.model.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';

describe('Phase 4 System Owner Business Onboarding & Management', () => {
  let systemOwnerId;
  let businessAdminId;
  let businessId;
  let mockSystemOwner;
  let mockBusinessAdmin;
  let mockBusiness;
  let tokenSystemOwner;
  let tokenBusinessAdmin;

  beforeEach(() => {
    vi.restoreAllMocks();

    systemOwnerId = new mongoose.Types.ObjectId();
    businessAdminId = new mongoose.Types.ObjectId();
    businessId = new mongoose.Types.ObjectId();

    mockSystemOwner = {
      _id: systemOwnerId,
      name: 'Platform System Owner',
      email: 'owner@slotify.dev',
      role: 'SYSTEM_OWNER',
      businessId: null,
      status: 'ACTIVE',
    };

    mockBusiness = {
      _id: businessId,
      name: 'Apex Dental Care',
      slug: 'apex-dental-care',
      contactEmail: 'contact@apexdental.com',
      contactPhone: '+1-555-0100',
      address: '123 Main St, Boston, MA',
      timezone: 'America/New_York',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockBusinessAdmin = {
      _id: businessAdminId,
      name: 'Dr. Marcus Vance',
      email: 'admin@apexdental.com',
      role: 'BUSINESS_ADMIN',
      businessId: businessId,
      status: 'ACTIVE',
    };

    tokenSystemOwner = generateAccessToken({
      userId: systemOwnerId.toString(),
      role: 'SYSTEM_OWNER',
      businessId: null,
    });

    tokenBusinessAdmin = generateAccessToken({
      userId: businessAdminId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: businessId.toString(),
    });
  });

  // =========================================================================
  // 1. Authorization Tests
  // =========================================================================
  describe('System Owner Route Authorization', () => {
    it('1. should reject unauthenticated POST /api/businesses with 401', async () => {
      const res = await request(app).post('/api/businesses').send({
        name: 'New Business',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication required');
    });

    it('2. should reject Business Admin from POST /api/businesses with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockBusinessAdmin);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusiness);

      const res = await request(app)
        .post('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenBusinessAdmin}`)
        .send({
          name: 'Unauthorized Business',
          adminName: 'Hacker Admin',
          adminEmail: 'hack@admin.com',
          adminPassword: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to perform this action.');
    });

    it('3. should reject Business Admin from GET /api/businesses (platform list) with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockBusinessAdmin);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusiness);

      const res = await request(app)
        .get('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenBusinessAdmin}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4. should reject Business Admin from PATCH /api/businesses/:id/status with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockBusinessAdmin);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusiness);

      const res = await request(app)
        .patch(`/api/businesses/${businessId}/status`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenBusinessAdmin}`)
        .send({ status: 'DISABLED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to perform this action.');
    });
  });

  // =========================================================================
  // 2. Business Onboarding Tests
  // =========================================================================
  describe('Business Onboarding Flow (POST /api/businesses)', () => {
    it('5. should reject onboarding with invalid body (missing required fields) with 400', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);

      const res = await request(app)
        .post('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`)
        .send({
          name: 'A', // too short (min 2)
          adminEmail: 'not-an-email',
          adminPassword: 'short', // too short (min 8)
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('6. should reject onboarding if admin email already exists with 409 Conflict', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(User, 'findOne').mockResolvedValue(mockBusinessAdmin); // admin email collision

      const res = await request(app)
        .post('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`)
        .send({
          name: 'Apex Dental Care',
          contactEmail: 'contact@apexdental.com',
          adminName: 'Dr. Marcus Vance',
          adminEmail: 'admin@apexdental.com',
          adminPassword: 'SecurePassword123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('7. should successfully onboard a new business and create initial Business Admin', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(User, 'findOne').mockResolvedValue(null); // email is unique
      vi.spyOn(Business, 'findOne').mockResolvedValue(null); // slug is unique

      vi.spyOn(Business, 'create').mockResolvedValue(mockBusiness);
      vi.spyOn(User, 'create').mockResolvedValue(mockBusinessAdmin);

      const res = await request(app)
        .post('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`)
        .send({
          name: 'Apex Dental Care',
          contactEmail: 'contact@apexdental.com',
          contactPhone: '+1-555-0100',
          address: '123 Main St, Boston, MA',
          timezone: 'America/New_York',
          adminName: 'Dr. Marcus Vance',
          adminEmail: 'admin@apexdental.com',
          adminPassword: 'SecurePassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('onboarded successfully');
      expect(res.body.data.business).toBeDefined();
      expect(res.body.data.business.name).toBe('Apex Dental Care');
      expect(res.body.data.admin).toBeDefined();
      expect(res.body.data.admin.email).toBe('admin@apexdental.com');
      expect(res.body.data.admin.role).toBe('BUSINESS_ADMIN');
      expect(res.body.data.admin.businessId).toBe(businessId.toString());

      // Security: never leak passwordHash
      expect(res.body.data.admin.passwordHash).toBeUndefined();
      expect(res.body.data.admin.password).toBeUndefined();
    });

    it('8. should auto-resolve slug collisions with numeric counter', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(User, 'findOne').mockResolvedValue(null);

      // First call finds collision with 'apex-dental-care', second call finds null for 'apex-dental-care-2'
      vi.spyOn(Business, 'findOne')
        .mockResolvedValueOnce(mockBusiness)
        .mockResolvedValueOnce(null);

      const resolvedBusiness = { ...mockBusiness, slug: 'apex-dental-care-2' };
      vi.spyOn(Business, 'create').mockResolvedValue(resolvedBusiness);
      vi.spyOn(User, 'create').mockResolvedValue(mockBusinessAdmin);

      const res = await request(app)
        .post('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`)
        .send({
          name: 'Apex Dental Care',
          adminName: 'Dr. Marcus Vance',
          adminEmail: 'admin2@apexdental.com',
          adminPassword: 'SecurePassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.business.slug).toBe('apex-dental-care-2');
    });
  });

  // =========================================================================
  // 3. Platform Business Listing & Details
  // =========================================================================
  describe('Business Retrieval (GET /api/businesses)', () => {
    it('9. should allow System Owner to list platform businesses', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(Business, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockBusiness]),
      });

      const res = await request(app)
        .get('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.businesses).toHaveLength(1);
      expect(res.body.data.businesses[0].name).toBe('Apex Dental Care');
    });

    it('10. should allow System Owner to retrieve a specific business with details', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusiness);

      const res = await request(app)
        .get(`/api/businesses/${businessId}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business.name).toBe('Apex Dental Care');
    });

    it('11. should return 404 when retrieving a non-existent business', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(Business, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/businesses/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Business not found.');
    });
  });

  // =========================================================================
  // 4. Business Status Management (Enable/Disable)
  // =========================================================================
  describe('Business Lifecycle Status (PATCH /api/businesses/:id/status)', () => {
    it('12. should allow System Owner to disable an active business', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);

      const targetBiz = {
        ...mockBusiness,
        status: 'ACTIVE',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Business, 'findById').mockResolvedValue(targetBiz);

      const res = await request(app)
        .patch(`/api/businesses/${businessId}/status`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`)
        .send({ status: 'DISABLED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business.status).toBe('DISABLED');
      expect(targetBiz.status).toBe('DISABLED');
    });

    it('13. should allow System Owner to re-enable a disabled business', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);

      const disabledBiz = {
        ...mockBusiness,
        status: 'DISABLED',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Business, 'findById').mockResolvedValue(disabledBiz);

      const res = await request(app)
        .patch(`/api/businesses/${businessId}/status`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business.status).toBe('ACTIVE');
      expect(disabledBiz.status).toBe('ACTIVE');
    });

    it('14. should reject status update with invalid status value with 400', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);

      const res = await request(app)
        .patch(`/api/businesses/${businessId}/status`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/ACTIVE.*DISABLED/i);
    });

    it('15. should prevent disabled Business Admin from accessing protected operations', async () => {
      // Disabled business
      const disabledBiz = { ...mockBusiness, status: 'DISABLED' };
      vi.spyOn(User, 'findById').mockResolvedValue(mockBusinessAdmin);
      vi.spyOn(Business, 'findById').mockResolvedValue(disabledBiz);

      // Business Admin attempting to access own business route
      const res = await request(app)
        .get(`/api/businesses/${businessId}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenBusinessAdmin}`);

      // auth.middleware checks business.status === 'DISABLED' and blocks with 403
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Business account is disabled.');
    });

    it('16. should allow System Owner to access a disabled business', async () => {
      const disabledBiz = { ...mockBusiness, status: 'DISABLED' };
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(Business, 'findById').mockResolvedValue(disabledBiz);

      const res = await request(app)
        .get(`/api/businesses/${businessId}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business.status).toBe('DISABLED');
    });
  });
});
