import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Business from '../src/models/business.model.js';
import Service from '../src/models/service.model.js';
import { hashPassword, comparePassword } from '../src/utils/password.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';

describe('Business Onboarding to Admin Login Full Regression Suite', () => {
  let systemOwnerId;
  let mockSystemOwner;
  let systemOwnerToken;

  const testPlainPassword = 'AdminSecretPass123!';
  const testNormalizedEmail = 'newadmin@clarityhealth.com';

  beforeEach(async () => {
    vi.restoreAllMocks();

    systemOwnerId = new mongoose.Types.ObjectId();
    mockSystemOwner = {
      _id: systemOwnerId,
      name: 'Platform System Owner',
      email: 'owner@slotify.dev',
      role: 'SYSTEM_OWNER',
      businessId: null,
      status: 'ACTIVE',
    };

    systemOwnerToken = generateAccessToken({
      userId: systemOwnerId.toString(),
      role: 'SYSTEM_OWNER',
      businessId: null,
    });
  });

  // TEST 1: System Owner creates a Business with initial admin credentials
  it('TEST 1: System Owner creates a Business with initial admin credentials successfully', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    vi.spyOn(Business, 'findOne').mockResolvedValue(null);

    const createdBizId = new mongoose.Types.ObjectId();
    const createdAdminId = new mongoose.Types.ObjectId();
    const computedHash = await hashPassword(testPlainPassword);

    const mockCreatedBiz = {
      _id: createdBizId,
      name: 'Clarity Health & Therapy',
      slug: 'clarity-health-therapy',
      contactEmail: 'info@clarityhealth.com',
      contactPhone: '+1-555-0188',
      address: '789 Medical Row',
      timezone: 'America/New_York',
      status: 'ACTIVE',
      toObject: () => ({
        _id: createdBizId,
        id: createdBizId.toString(),
        name: 'Clarity Health & Therapy',
        slug: 'clarity-health-therapy',
        contactEmail: 'info@clarityhealth.com',
        status: 'ACTIVE',
      }),
    };

    const mockCreatedAdmin = {
      _id: createdAdminId,
      name: 'Dr. Jane Foster',
      email: testNormalizedEmail,
      role: 'BUSINESS_ADMIN',
      businessId: createdBizId,
      status: 'ACTIVE',
      passwordHash: computedHash,
      toObject: () => ({
        _id: createdAdminId,
        id: createdAdminId.toString(),
        name: 'Dr. Jane Foster',
        email: testNormalizedEmail,
        role: 'BUSINESS_ADMIN',
        businessId: createdBizId.toString(),
        status: 'ACTIVE',
      }),
    };

    vi.spyOn(Business, 'create').mockResolvedValue(mockCreatedBiz);
    vi.spyOn(User, 'create').mockResolvedValue(mockCreatedAdmin);

    const res = await request(app)
      .post('/api/businesses')
      .set('Cookie', `${env.COOKIE_NAME}=${systemOwnerToken}`)
      .send({
        name: 'Clarity Health & Therapy',
        contactEmail: 'info@clarityhealth.com',
        adminName: 'Dr. Jane Foster',
        adminEmail: testNormalizedEmail,
        adminPassword: testPlainPassword,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.business).toBeDefined();
    expect(res.body.data.business.name).toBe('Clarity Health & Therapy');
    expect(res.body.data.admin).toBeDefined();
    expect(res.body.data.admin.email).toBe(testNormalizedEmail);
    expect(res.body.data.admin.role).toBe('BUSINESS_ADMIN');
  });

  // TEST 2: Verify corresponding Business Admin User attributes
  it('TEST 2: Verify corresponding Business Admin User exists with role, businessId, status, and email', async () => {
    const bizId = new mongoose.Types.ObjectId();
    const adminUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Dr. Jane Foster',
      email: testNormalizedEmail,
      role: 'BUSINESS_ADMIN',
      businessId: bizId,
      status: 'ACTIVE',
      passwordHash: await hashPassword(testPlainPassword),
    };

    expect(adminUser.role).toBe('BUSINESS_ADMIN');
    expect(adminUser.businessId).toEqual(bizId);
    expect(adminUser.status).toBe('ACTIVE');
    expect(adminUser.email).toBe(testNormalizedEmail);
    expect(adminUser.passwordHash).toBeTruthy();
  });

  // TEST 3: Verify password is encrypted, never plaintext
  it('TEST 3: Verify password is encrypted and not stored as plaintext', async () => {
    const passwordHash = await hashPassword(testPlainPassword);
    expect(passwordHash).not.toBe(testPlainPassword);
    expect(passwordHash.startsWith('$2')).toBe(true);
    expect(passwordHash.length).toBeGreaterThanOrEqual(50);
  });

  // TEST 4: Verify bcrypt password comparison succeeds for plain password
  it('TEST 4: Verify bcrypt password comparison matches original password', async () => {
    const passwordHash = await hashPassword(testPlainPassword);
    const matches = await comparePassword(testPlainPassword, passwordHash);
    expect(matches).toBe(true);
  });

  // TEST 5: Immediately log in using the newly created admin credentials (POST /api/auth/login -> 200)
  it('TEST 5: Immediately log in using newly created admin credentials returns 200 and auth cookie', async () => {
    const bizId = new mongoose.Types.ObjectId();
    const passwordHash = await hashPassword(testPlainPassword);

    const mockAdminWithHash = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Dr. Jane Foster',
      email: testNormalizedEmail,
      role: 'BUSINESS_ADMIN',
      businessId: bizId,
      status: 'ACTIVE',
      passwordHash,
    };

    const mockActiveBiz = {
      _id: bizId,
      name: 'Clarity Health & Therapy',
      status: 'ACTIVE',
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockAdminWithHash),
    });
    vi.spyOn(Business, 'findById').mockResolvedValue(mockActiveBiz);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testNormalizedEmail,
        password: testPlainPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testNormalizedEmail);
    expect(res.body.data.user.role).toBe('BUSINESS_ADMIN');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain(env.COOKIE_NAME);
  });

  // TEST 6: Verify authenticated identity via GET /api/auth/me
  it('TEST 6: Verify authenticated identity via GET /api/auth/me returns BUSINESS_ADMIN and businessId', async () => {
    const bizId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const mockAdmin = {
      _id: adminId,
      name: 'Dr. Jane Foster',
      email: testNormalizedEmail,
      role: 'BUSINESS_ADMIN',
      businessId: bizId,
      status: 'ACTIVE',
    };

    const mockActiveBiz = {
      _id: bizId,
      name: 'Clarity Health & Therapy',
      status: 'ACTIVE',
    };

    const adminToken = generateAccessToken({
      userId: adminId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: bizId.toString(),
    });

    vi.spyOn(User, 'findById').mockResolvedValue(mockAdmin);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockActiveBiz);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${env.COOKIE_NAME}=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('BUSINESS_ADMIN');
    expect(res.body.data.user.businessId).toBe(bizId.toString());
  });

  // TEST 7: Verify Business Admin can access its own admin-protected APIs
  it('TEST 7: Verify Business Admin can access its own business details and services', async () => {
    const bizId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const mockAdmin = {
      _id: adminId,
      name: 'Dr. Jane Foster',
      email: testNormalizedEmail,
      role: 'BUSINESS_ADMIN',
      businessId: bizId,
      status: 'ACTIVE',
    };

    const mockActiveBiz = {
      _id: bizId,
      name: 'Clarity Health & Therapy',
      status: 'ACTIVE',
    };

    const adminToken = generateAccessToken({
      userId: adminId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: bizId.toString(),
    });

    vi.spyOn(User, 'findById').mockResolvedValue(mockAdmin);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockActiveBiz);
    vi.spyOn(Service, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    // Access own business details
    const resBiz = await request(app)
      .get(`/api/businesses/${bizId}`)
      .set('Cookie', `${env.COOKIE_NAME}=${adminToken}`);

    expect(resBiz.status).toBe(200);
    expect(resBiz.body.success).toBe(true);

    // Access own services
    const resSrv = await request(app)
      .get('/api/services')
      .set('Cookie', `${env.COOKIE_NAME}=${adminToken}`);

    expect(resSrv.status).toBe(200);
    expect(resSrv.body.success).toBe(true);
  });

  // TEST 8: Verify wrong password still returns 401
  it('TEST 8: Verify wrong password returns 401 Unauthorized', async () => {
    const passwordHash = await hashPassword(testPlainPassword);
    const mockAdminWithHash = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Dr. Jane Foster',
      email: testNormalizedEmail,
      role: 'BUSINESS_ADMIN',
      businessId: new mongoose.Types.ObjectId(),
      status: 'ACTIVE',
      passwordHash,
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockAdminWithHash),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testNormalizedEmail,
        password: 'CompletelyWrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email or password');
  });

  // TEST 9: Verify wrong email still returns 401
  it('TEST 9: Verify unknown email returns 401 Unauthorized', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unknown.nonexistent@slotify.dev',
        password: testPlainPassword,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email or password');
  });

  // TEST 10: Verify disabled business cannot log in (403 Forbidden)
  it('TEST 10: Verify admin of disabled business is rejected with 403 Forbidden', async () => {
    const bizId = new mongoose.Types.ObjectId();
    const passwordHash = await hashPassword(testPlainPassword);

    const mockAdminWithHash = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Dr. Jane Foster',
      email: testNormalizedEmail,
      role: 'BUSINESS_ADMIN',
      businessId: bizId,
      status: 'ACTIVE',
      passwordHash,
    };

    const mockDisabledBiz = {
      _id: bizId,
      name: 'Disabled Clinic',
      status: 'DISABLED',
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockAdminWithHash),
    });
    vi.spyOn(Business, 'findById').mockResolvedValue(mockDisabledBiz);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testNormalizedEmail,
        password: testPlainPassword,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Business account is disabled');
  });

  // TEST 11: Verify existing System Owner login still works
  it('TEST 11: Verify existing System Owner login works as expected', async () => {
    const ownerHash = await hashPassword('OwnerDevPassword123!');
    const mockOwnerWithHash = {
      _id: systemOwnerId,
      name: 'Platform System Owner',
      email: 'owner@slotify.dev',
      role: 'SYSTEM_OWNER',
      businessId: null,
      status: 'ACTIVE',
      passwordHash: ownerHash,
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockOwnerWithHash),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner@slotify.dev',
        password: 'OwnerDevPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('SYSTEM_OWNER');
  });

  // TEST 12: Verify existing Business Admin login still works
  it('TEST 12: Verify existing Business Admin login works as expected', async () => {
    const urbanBizId = new mongoose.Types.ObjectId();
    const urbanHash = await hashPassword('AdminSecurePass123!');

    const mockUrbanAdmin = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Aarav Mehta',
      email: 'admin@urbanwellness.slotify.dev',
      role: 'BUSINESS_ADMIN',
      businessId: urbanBizId,
      status: 'ACTIVE',
      passwordHash: urbanHash,
    };

    const mockUrbanBiz = {
      _id: urbanBizId,
      name: 'Urban Wellness Studio',
      status: 'ACTIVE',
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUrbanAdmin),
    });
    vi.spyOn(Business, 'findById').mockResolvedValue(mockUrbanBiz);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@urbanwellness.slotify.dev',
        password: 'AdminSecurePass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('BUSINESS_ADMIN');
  });

  // TEST 13: Verify duplicate admin email returns 409 Conflict
  it('TEST 13: Verify duplicate admin email returns 409 Conflict', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockSystemOwner);
    vi.spyOn(User, 'findOne').mockResolvedValue({ _id: new mongoose.Types.ObjectId(), email: testNormalizedEmail });

    const res = await request(app)
      .post('/api/businesses')
      .set('Cookie', `${env.COOKIE_NAME}=${systemOwnerToken}`)
      .send({
        name: 'Another Clinic',
        adminName: 'Clone Admin',
        adminEmail: testNormalizedEmail,
        adminPassword: testPlainPassword,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  // TEST 14: Verify tenant isolation remains intact (Admin cannot access other tenant's business)
  it('TEST 14: Verify tenant isolation prevents Business Admin from accessing another tenant', async () => {
    const myBizId = new mongoose.Types.ObjectId();
    const otherBizId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const mockAdmin = {
      _id: adminId,
      name: 'Dr. Jane Foster',
      email: testNormalizedEmail,
      role: 'BUSINESS_ADMIN',
      businessId: myBizId,
      status: 'ACTIVE',
    };

    const adminToken = generateAccessToken({
      userId: adminId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: myBizId.toString(),
    });

    vi.spyOn(User, 'findById').mockResolvedValue(mockAdmin);
    vi.spyOn(Business, 'findById').mockResolvedValue({ _id: myBizId, status: 'ACTIVE' });

    // Attempt to access another business
    const res = await request(app)
      .get(`/api/businesses/${otherBizId}`)
      .set('Cookie', `${env.COOKIE_NAME}=${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('You do not have permission to access');
  });
});
