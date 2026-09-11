import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Business from '../src/models/business.model.js';
import Service from '../src/models/service.model.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';

describe('Phase 3 RBAC & Multi-Tenant Authorization', () => {
  let businessA_Id;
  let businessB_Id;
  let adminA_Id;
  let adminB_Id;
  let systemOwnerId;
  let adminWithoutBizId;
  let disabledUserId;
  let adminWithDisabledBizId;
  let disabledBizId;

  let mockBusinessA;
  let mockBusinessB;
  let mockDisabledBiz;

  let mockSystemOwner;
  let mockAdminA;
  let mockAdminB;
  let mockAdminWithoutBiz;
  let mockDisabledUser;
  let mockAdminWithDisabledBiz;

  let serviceA_Id;
  let serviceB_Id;
  let mockServiceA;
  let mockServiceB;

  let tokenSystemOwner;
  let tokenAdminA;
  let tokenAdminB;
  let tokenAdminWithoutBiz;
  let tokenDisabledUser;
  let tokenAdminWithDisabledBiz;

  beforeEach(() => {
    vi.restoreAllMocks();

    businessA_Id = new mongoose.Types.ObjectId();
    businessB_Id = new mongoose.Types.ObjectId();
    disabledBizId = new mongoose.Types.ObjectId();

    adminA_Id = new mongoose.Types.ObjectId();
    adminB_Id = new mongoose.Types.ObjectId();
    systemOwnerId = new mongoose.Types.ObjectId();
    adminWithoutBizId = new mongoose.Types.ObjectId();
    disabledUserId = new mongoose.Types.ObjectId();
    adminWithDisabledBizId = new mongoose.Types.ObjectId();

    serviceA_Id = new mongoose.Types.ObjectId();
    serviceB_Id = new mongoose.Types.ObjectId();

    mockBusinessA = {
      _id: businessA_Id,
      name: 'Business Alpha',
      slug: 'business-alpha',
      status: 'ACTIVE',
    };

    mockBusinessB = {
      _id: businessB_Id,
      name: 'Business Beta',
      slug: 'business-beta',
      status: 'ACTIVE',
    };

    mockDisabledBiz = {
      _id: disabledBizId,
      name: 'Disabled Business',
      slug: 'disabled-biz',
      status: 'DISABLED',
    };

    mockSystemOwner = {
      _id: systemOwnerId,
      name: 'System Owner',
      email: 'owner@slotify.dev',
      role: 'SYSTEM_OWNER',
      businessId: null,
      status: 'ACTIVE',
    };

    mockAdminA = {
      _id: adminA_Id,
      name: 'Admin Alpha',
      email: 'admina@alpha.com',
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id,
      status: 'ACTIVE',
    };

    mockAdminB = {
      _id: adminB_Id,
      name: 'Admin Beta',
      email: 'adminb@beta.com',
      role: 'BUSINESS_ADMIN',
      businessId: businessB_Id,
      status: 'ACTIVE',
    };

    mockAdminWithoutBiz = {
      _id: adminWithoutBizId,
      name: 'Admin No Biz',
      email: 'nobiz@admin.com',
      role: 'BUSINESS_ADMIN',
      businessId: null,
      status: 'ACTIVE',
    };

    mockDisabledUser = {
      _id: disabledUserId,
      name: 'Disabled Admin',
      email: 'disabled@alpha.com',
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id,
      status: 'DISABLED',
    };

    mockAdminWithDisabledBiz = {
      _id: adminWithDisabledBizId,
      name: 'Admin Disabled Biz',
      email: 'admin@disabledbiz.com',
      role: 'BUSINESS_ADMIN',
      businessId: disabledBizId,
      status: 'ACTIVE',
    };

    mockServiceA = {
      _id: serviceA_Id,
      name: 'Alpha Haircut',
      durationMinutes: 45,
      businessId: businessA_Id,
      status: 'ACTIVE',
    };

    mockServiceB = {
      _id: serviceB_Id,
      name: 'Beta Tire Repair',
      durationMinutes: 60,
      businessId: businessB_Id,
      status: 'ACTIVE',
    };

    tokenSystemOwner = generateAccessToken({
      userId: systemOwnerId.toString(),
      role: 'SYSTEM_OWNER',
      businessId: null,
    });

    tokenAdminA = generateAccessToken({
      userId: adminA_Id.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id.toString(),
    });

    tokenAdminB = generateAccessToken({
      userId: adminB_Id.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: businessB_Id.toString(),
    });

    tokenAdminWithoutBiz = generateAccessToken({
      userId: adminWithoutBizId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: null,
    });

    tokenDisabledUser = generateAccessToken({
      userId: disabledUserId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id.toString(),
    });

    tokenAdminWithDisabledBiz = generateAccessToken({
      userId: adminWithDisabledBizId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: disabledBizId.toString(),
    });
  });

  // =========================================================================
  // 1. Role-Based Access Control (RBAC) Tests
  // =========================================================================
  describe('RBAC (requireRole)', () => {
    it('1. should return 401 for unauthenticated request to protected route', async () => {
      const res = await request(app).get('/api/businesses');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication required');
    });

    it('2. should allow SYSTEM_OWNER to access owner-only platform route (/api/businesses)', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(Business, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockBusinessA, mockBusinessB]),
      });

      const res = await request(app)
        .get('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.businesses).toHaveLength(2);
    });

    it('3. should reject BUSINESS_ADMIN with 403 when accessing owner-only route', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

      const res = await request(app)
        .get('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to perform this action.');
    });

    it('4. should allow BUSINESS_ADMIN to access business-admin authorized route', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);
      vi.spyOn(Service, 'create').mockResolvedValue(mockServiceA);

      const res = await request(app)
        .post(`/api/businesses/${businessA_Id}/services`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Alpha Haircut',
          durationMinutes: 45,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service.name).toBe('Alpha Haircut');
    });

    it('5. should allow SYSTEM_OWNER to access platform-level businesses list', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(Business, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockBusinessA]),
      });

      const res = await request(app)
        .get('/api/businesses')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.businesses[0].name).toBe('Business Alpha');
    });
  });

  // =========================================================================
  // 2. Multi-Tenant Authorization Tests
  // =========================================================================
  describe('Tenant Authorization & Isolation (requireBusinessAccess)', () => {
    it('6. should allow Business Admin A to access Business A resource', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

      const res = await request(app)
        .get(`/api/businesses/${businessA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business.name).toBe('Business Alpha');
    });

    it('7. should reject Business Admin A with 403 when accessing Business B resource', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

      const res = await request(app)
        .get(`/api/businesses/${businessB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access resources belonging to another business.');
    });

    it('8. should reject Business Admin B with 403 when accessing Business A resource', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminB);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessB);

      const res = await request(app)
        .get(`/api/businesses/${businessA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access resources belonging to another business.');
    });

    it('9. should reject Business Admin attempt to spoof businessId in body', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

      // Admin A tries to create service specifying Business B in body
      const res = await request(app)
        .post(`/api/businesses/${businessA_Id}/services`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Unauthorized Service',
          durationMinutes: 30,
          businessId: businessB_Id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access resources belonging to another business.');
    });

    it('10. should reject Business Admin if user has no businessId associated', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminWithoutBiz);

      const res = await request(app)
        .get(`/api/businesses/${businessA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminWithoutBiz}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User is not associated with any business.');
    });

    it('11. should allow System Owner with null businessId to access any business details', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessB);

      const res = await request(app)
        .get(`/api/businesses/${businessB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business.name).toBe('Business Beta');
    });
  });

  // =========================================================================
  // 3. Resource IDOR Protection Tests
  // =========================================================================
  describe('Resource Ownership & Anti-IDOR Protections', () => {
    it('12. should reject Admin A with 403 when manually substituting service ID of Business B', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);
      // Service B exists in DB, but belongs to Business B
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceB);

      const res = await request(app)
        .get(`/api/businesses/${businessA_Id}/services/${serviceB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access resources belonging to another business.');
    });

    it('13. should reject Admin A attempting to access another tenant through query parameter', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

      const res = await request(app)
        .get(`/api/businesses/${businessA_Id}/services?businessId=${businessB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access resources belonging to another business.');
    });

    it('14. should reject Admin A attempting to inject another tenant through request body on mutation', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

      const res = await request(app)
        .post(`/api/businesses/${businessA_Id}/services`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Malicious Service Injection',
          durationMinutes: 30,
          businessId: businessB_Id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access resources belonging to another business.');
    });

    it('15. should reject Admin A attempting to target another tenant through route parameters', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

      const res = await request(app)
        .get(`/api/businesses/${businessB_Id}/services`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You do not have permission to access resources belonging to another business.');
    });
  });

  // =========================================================================
  // 4. Disabled Account & Disabled Business State Tests
  // =========================================================================
  describe('Disabled State Protections', () => {
    it('16. should reject disabled user from proceeding to authorization checks', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockDisabledUser);

      const res = await request(app)
        .get(`/api/businesses/${businessA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenDisabledUser}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User account is disabled.');
    });

    it('17. should reject Business Admin if their associated business is disabled', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminWithDisabledBiz);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockDisabledBiz);

      const res = await request(app)
        .get(`/api/businesses/${disabledBizId}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminWithDisabledBiz}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Business account is disabled.');
    });
  });

  // =========================================================================
  // 5. Mandatory Multi-Tenant Security Scenario (Section 19)
  // =========================================================================
  describe('Mandatory Security Scenario: Admin A vs Admin B Tenant Isolation', () => {
    it('should cleanly deny Admin A from accessing Business B resource, while Admin B succeeds', async () => {
      // Step 1: Admin A attempts to access Business B's service -> MUST be rejected (403)
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

      const attackResponse = await request(app)
        .get(`/api/businesses/${businessB_Id}/services`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(attackResponse.status).toBe(403);
      expect(attackResponse.body.success).toBe(false);
      expect(attackResponse.body.message).toBe('You do not have permission to access resources belonging to another business.');

      // Step 2: Admin B attempts the exact same request against Business B -> MUST succeed (200)
      vi.spyOn(User, 'findById').mockResolvedValue(mockAdminB);
      vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessB);
      vi.spyOn(Service, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockServiceB]),
      });

      const legitimateResponse = await request(app)
        .get(`/api/businesses/${businessB_Id}/services`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminB}`);

      expect(legitimateResponse.status).toBe(200);
      expect(legitimateResponse.body.success).toBe(true);
      expect(legitimateResponse.body.data.services).toHaveLength(1);
      expect(legitimateResponse.body.data.services[0].name).toBe('Beta Tire Repair');
    });
  });
});
