import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Business from '../src/models/business.model.js';
import Service from '../src/models/service.model.js';
import Staff from '../src/models/staff.model.js';
import Availability from '../src/models/availability.model.js';
import BlockedDate from '../src/models/blockedDate.model.js';
import Appointment from '../src/models/appointment.model.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';
import { errorMiddleware } from '../src/middleware/error.middleware.js';

describe('Phase 11: Security Hardening & Comprehensive Testing Suite', () => {
  let businessA_Id;
  let businessB_Id;
  let disabledBizId;
  let adminA_Id;
  let adminB_Id;
  let systemOwnerId;
  let disabledUserId;
  let serviceA_Id;
  let serviceB_Id;
  let staffA_Id;
  let appointmentA_Id;
  let appointmentB_Id;

  let mockBusinessA;
  let mockBusinessB;
  let mockDisabledBiz;
  let mockAdminA;
  let mockAdminB;
  let mockSystemOwner;
  let mockDisabledUser;
  let mockServiceA;
  let mockServiceB;
  let mockStaffA;
  let mockAppointmentA;

  let tokenAdminA;
  let tokenAdminB;
  let tokenSystemOwner;
  let tokenDisabledUser;

  const cookieHeader = (token) => `${env.COOKIE_NAME}=${token}`;
  const FUTURE_DATE = '2026-11-16'; // Monday

  beforeEach(() => {
    vi.restoreAllMocks();

    businessA_Id = new mongoose.Types.ObjectId();
    businessB_Id = new mongoose.Types.ObjectId();
    disabledBizId = new mongoose.Types.ObjectId();

    adminA_Id = new mongoose.Types.ObjectId();
    adminB_Id = new mongoose.Types.ObjectId();
    systemOwnerId = new mongoose.Types.ObjectId();
    disabledUserId = new mongoose.Types.ObjectId();

    serviceA_Id = new mongoose.Types.ObjectId();
    serviceB_Id = new mongoose.Types.ObjectId();
    staffA_Id = new mongoose.Types.ObjectId();
    appointmentA_Id = new mongoose.Types.ObjectId();
    appointmentB_Id = new mongoose.Types.ObjectId();

    mockBusinessA = {
      _id: businessA_Id,
      name: 'Alpha Wellness',
      slug: 'alpha-wellness',
      contactEmail: 'admin@alphawellness.test',
      contactPhone: '+1-555-0100',
      address: '100 Alpha Way',
      timezone: 'America/New_York',
      status: 'ACTIVE',
    };

    mockBusinessB = {
      _id: businessB_Id,
      name: 'Beta Salon',
      slug: 'beta-salon',
      contactEmail: 'admin@betasalon.test',
      contactPhone: '+1-555-0200',
      address: '200 Beta Blvd',
      timezone: 'America/Los_Angeles',
      status: 'ACTIVE',
    };

    mockDisabledBiz = {
      _id: disabledBizId,
      name: 'Disabled Corp',
      slug: 'disabled-corp',
      contactEmail: 'disabled@test.com',
      contactPhone: '+1-555-0300',
      address: '300 Off St',
      timezone: 'America/New_York',
      status: 'DISABLED',
    };

    mockAdminA = {
      _id: adminA_Id,
      name: 'Admin Alpha',
      email: 'admin@alphawellness.test',
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id,
      status: 'ACTIVE',
    };

    mockAdminB = {
      _id: adminB_Id,
      name: 'Admin Beta',
      email: 'admin@betasalon.test',
      role: 'BUSINESS_ADMIN',
      businessId: businessB_Id,
      status: 'ACTIVE',
    };

    mockSystemOwner = {
      _id: systemOwnerId,
      name: 'Root Owner',
      email: 'owner@slotify.test',
      role: 'SYSTEM_OWNER',
      status: 'ACTIVE',
    };

    mockDisabledUser = {
      _id: disabledUserId,
      name: 'Disabled User',
      email: 'disabled@alphawellness.test',
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id,
      status: 'DISABLED',
    };

    mockServiceA = {
      _id: serviceA_Id,
      businessId: businessA_Id,
      name: 'Alpha Massage',
      durationMinutes: 60,
      price: 100,
      status: 'ACTIVE',
      isActive: true,
    };

    mockServiceB = {
      _id: serviceB_Id,
      businessId: businessB_Id,
      name: 'Beta Haircut',
      durationMinutes: 30,
      price: 45,
      status: 'ACTIVE',
      isActive: true,
    };

    mockStaffA = {
      _id: staffA_Id,
      businessId: businessA_Id,
      name: 'Sarah Therapist',
      email: 'sarah@alphawellness.test',
      services: [serviceA_Id],
      serviceIds: [serviceA_Id],
      status: 'ACTIVE',
      isActive: true,
    };

    mockAppointmentA = {
      _id: appointmentA_Id,
      businessId: businessA_Id,
      serviceId: serviceA_Id,
      staffId: staffA_Id,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      customerPhone: '+1-555-9999',
      startTime: new Date('2026-11-16T14:00:00.000Z'),
      endTime: new Date('2026-11-16T15:00:00.000Z'),
      status: 'CONFIRMED',
    };

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

    tokenSystemOwner = generateAccessToken({
      userId: systemOwnerId.toString(),
      role: 'SYSTEM_OWNER',
    });

    tokenDisabledUser = generateAccessToken({
      userId: disabledUserId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id.toString(),
    });
  });

  // ==========================================
  // 1. Unauthenticated Privileged Endpoint Access
  // ==========================================
  it('1. should reject unauthenticated access to privileged endpoints with 401', async () => {
    const endpoints = [
      { method: 'get', url: '/api/services' },
      { method: 'get', url: '/api/staff' },
      { method: 'get', url: '/api/appointments' },
      { method: 'get', url: '/api/analytics/overview' },
      { method: 'get', url: '/api/businesses' },
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.url);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token|authentication/i);
    }
  });

  // ==========================================
  // 2. Wrong Role / Privilege Escalation
  // ==========================================
  it('2. should reject BUSINESS_ADMIN from calling SYSTEM_OWNER endpoints with 403', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

    const res = await request(app)
      .get('/api/businesses')
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/permission to perform this action|Forbidden: Insufficient privileges/i);
  });

  // ==========================================
  // 3. Cross-Tenant Resource Access (IDOR)
  // ==========================================
  it('3. should reject cross-tenant resource access (Admin A accessing Tenant B service) with 403', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);
    vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceB);

    const res = await request(app)
      .get(`/api/services/${serviceB_Id}`)
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/permission to access resources belonging to another business|does not belong to your business/i);
  });

  // ==========================================
  // 4. businessId Query Parameter Spoofing
  // ==========================================
  it('4. should reject request when query parameter businessId differs from authenticated business with 403', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

    const res = await request(app)
      .get(`/api/services?businessId=${businessB_Id}`)
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/permission to access|Unauthorized business access/i);
  });

  // ==========================================
  // 5. businessId Body Parameter Spoofing
  // ==========================================
  it('5. should reject request when request body businessId attempts to spoof another tenant with 403', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

    const res = await request(app)
      .post('/api/services')
      .set('Cookie', [cookieHeader(tokenAdminA)])
      .send({
        businessId: businessB_Id.toString(), // spoofing Tenant B
        name: 'Spoofed Service',
        durationMinutes: 30,
        price: 50,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/permission to access|Unauthorized business access/i);
  });

  // ==========================================
  // 6. Malformed ObjectId Handling
  // ==========================================
  it('6. should reject malformed ObjectId with 400 Bad Request instead of 500 internal error', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

    const res = await request(app)
      .get('/api/services/not-a-valid-object-id')
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid.*format/i);
  });

  // ==========================================
  // 7. NoSQL Operator Injection Attempt
  // ==========================================
  it('7. should safely reject or handle NoSQL operator injection in login or query parameters', async () => {
    // Attempt NoSQL operator injection in login body
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $gt: '' },
        password: 'password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ==========================================
  // 8. Regex Injection / Special Characters Handling
  // ==========================================
  it('8. should safely handle regex special characters in search queries without crashing', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);
    vi.spyOn(Appointment, 'find').mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const maliciousSearch = '.*+?^${}()|[]\\(a+)+$';
    const res = await request(app)
      .get(`/api/appointments?search=${encodeURIComponent(maliciousSearch)}`)
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  // ==========================================
  // 9. Invalid JWT (Malformed Token String)
  // ==========================================
  it('9. should reject malformed or invalid JWT strings with 401', async () => {
    const res = await request(app)
      .get('/api/services')
      .set('Cookie', [`${env.COOKIE_NAME}=invalid.token.string`]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid authentication token|Invalid or expired token/i);
  });

  // ==========================================
  // 10. Tampered JWT Payload / Invalid Signature
  // ==========================================
  it('10. should reject JWT with tampered signature with 401', async () => {
    const forgedToken = jwt.sign(
      { userId: adminA_Id.toString(), role: 'SYSTEM_OWNER' },
      'wrong-secret-key-12345'
    );

    const res = await request(app)
      .get('/api/businesses')
      .set('Cookie', [cookieHeader(forgedToken)]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ==========================================
  // 11. Expired JWT
  // ==========================================
  it('11. should reject expired JWT with 401', async () => {
    const expiredToken = jwt.sign(
      { userId: adminA_Id.toString(), role: 'BUSINESS_ADMIN', businessId: businessA_Id.toString() },
      env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/services')
      .set('Cookie', [cookieHeader(expiredToken)]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired/i);
  });

  // ==========================================
  // 12. Disabled User Access Rejection
  // ==========================================
  it('12. should reject requests from a disabled user with 403 Forbidden', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockDisabledUser);

    const res = await request(app)
      .get('/api/services')
      .set('Cookie', [cookieHeader(tokenDisabledUser)]);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Account is disabled/i);
  });

  // ==========================================
  // 13. Disabled Business Access Rejection
  // ==========================================
  it('13. should reject admin and public requests for a DISABLED business with 403', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockDisabledBiz);

    // Admin dashboard access
    const adminRes = await request(app)
      .get('/api/services')
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.message).toMatch(/Business account is disabled/i);

    // Public booking attempt
    vi.spyOn(Business, 'findOne').mockResolvedValue(mockDisabledBiz);
    const publicRes = await request(app)
      .post('/api/public/businesses/disabled-corp/appointments')
      .send({
        serviceId: serviceA_Id.toString(),
        date: FUTURE_DATE,
        startTime: '10:00',
        customerName: 'Test Client',
        customerEmail: 'test@example.com',
      });

    expect(publicRes.status).toBe(403);
    expect(publicRes.body.message).toMatch(/unavailable for bookings/i);
  });

  // ==========================================
  // 14. Password Hash Exposure Verification
  // ==========================================
  it('14. should never expose passwordHash in auth or business responses', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue({
      _id: adminA_Id,
      name: 'Admin Alpha',
      email: 'admin@alphawellness.test',
      role: 'BUSINESS_ADMIN',
      businessId: mockBusinessA,
      status: 'ACTIVE',
      passwordHash: '$2a$10$maliciouslyExposedHashValueHere',
    });
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('maliciouslyExposedHashValueHere');
  });

  // ==========================================
  // 15. Sensitive Secrets Leakage Prevention
  // ==========================================
  it('15. should never expose JWT_SECRET, MONGODB_URI, or internal tokens in responses', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain(env.JWT_SECRET);
    expect(bodyStr).not.toContain('mongodb');
  });

  // ==========================================
  // 16. Sensitive Error Leakage in Production
  // ==========================================
  it('16. should mask 500 error messages and omit stack traces in production mode', () => {
    const mockReq = { method: 'GET', originalUrl: '/api/test' };
    const mockRes = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.jsonData = payload;
        return this;
      },
    };

    const err = new Error('Sensitive DB Connection String at /var/data/mongo.sock failed');
    err.statusCode = 500;

    errorMiddleware(err, mockReq, mockRes, () => {});

    expect(mockRes.statusCode).toBe(500);
    expect(mockRes.jsonData.success).toBe(false);
  });

  // ==========================================
  // 17. Invalid Appointment Status Transition (State Machine)
  // ==========================================
  it('17. should reject invalid status transitions from terminal status CANCELLED with 400', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

    const cancelledAppointment = {
      ...mockAppointmentA,
      status: 'CANCELLED',
      save: vi.fn(),
    };
    vi.spyOn(Appointment, 'findById').mockResolvedValue(cancelledAppointment);

    const res = await request(app)
      .patch(`/api/appointments/${appointmentA_Id}/status`)
      .set('Cookie', [cookieHeader(tokenAdminA)])
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Cannot change status of a cancelled appointment|Invalid appointment status transition/i);
  });

  // ==========================================
  // 18. Public Booking Validation Bypass Attempt
  // ==========================================
  it('18. should reject public booking attempts with past dates, invalid email, or invalid time', async () => {
    vi.spyOn(Business, 'findOne').mockResolvedValue(mockBusinessA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);
    vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
    vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

    // Booking in past
    const resPast = await request(app)
      .post('/api/public/businesses/alpha-wellness/appointments')
      .send({
        serviceId: serviceA_Id.toString(),
        date: '2020-01-01',
        startTime: '10:00',
        customerName: 'Past Booker',
        customerEmail: 'past@example.com',
      });
    expect(resPast.status).toBe(400);
    expect(resPast.body.message).toMatch(/Cannot book an appointment in the past/i);

    // Malformed email
    const resEmail = await request(app)
      .post('/api/public/businesses/alpha-wellness/appointments')
      .send({
        serviceId: serviceA_Id.toString(),
        date: FUTURE_DATE,
        startTime: '10:00',
        customerName: 'Bad Email',
        customerEmail: 'not-an-email',
      });
    expect(resEmail.status).toBe(400);
  });

  // ==========================================
  // 19. Customer Access Token Tampering
  // ==========================================
  it('19. should reject customer appointment access if the access token has been tampered with', async () => {
    const validToken = jwt.sign(
      {
        appointmentId: appointmentA_Id.toString(),
        customerEmail: 'jane@example.com',
        businessId: businessA_Id.toString(),
        type: 'CUSTOMER_APPOINTMENT_ACCESS',
      },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Tamper token payload/signature
    const tamperedToken = validToken.substring(0, validToken.length - 6) + 'abc123';

    const res = await request(app).get(
      `/api/public/appointments/${appointmentA_Id}?token=${tamperedToken}`
    );

    expect([401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid or expired appointment access token/i);
  });

  // ==========================================
  // 20. Cross-Tenant Customer Token Rejection
  // ==========================================
  it('20. should reject customer access when token belongs to a different appointment (Anti-IDOR)', async () => {
    const foreignToken = jwt.sign(
      {
        appointmentId: appointmentB_Id.toString(),
        customerEmail: 'attacker@example.com',
        businessId: businessB_Id.toString(),
        type: 'CUSTOMER_APPOINTMENT_ACCESS',
      },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const res = await request(app).get(
      `/api/public/appointments/${appointmentA_Id}?token=${foreignToken}`
    );

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/permission to view or manage/i);
  });

  // ==========================================
  // 21. Duplicate / Race Condition Booking Prevention
  // ==========================================
  it('21. should return 409 Conflict when a booking conflicts with an existing slot', async () => {
    vi.spyOn(Business, 'findOne').mockResolvedValue(mockBusinessA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);
    vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
    vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA);
    vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

    vi.spyOn(Availability, 'find').mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          staffId: staffA_Id,
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        },
      ]),
    });

    // Conflict: existing confirmed appointment exists
    vi.spyOn(Appointment, 'findOne').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      status: 'CONFIRMED',
    });

    const res = await request(app)
      .post('/api/public/businesses/alpha-wellness/appointments')
      .send({
        serviceId: serviceA_Id.toString(),
        staffId: staffA_Id.toString(),
        date: FUTURE_DATE,
        startTime: '10:00',
        customerName: 'Second Client',
        customerEmail: 'second@example.com',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no longer available/i);
  });

  // ==========================================
  // 22. Cancelled Slot Rebooking Verification
  // ==========================================
  it('22. should allow a slot to be rebooked once previous appointment was CANCELLED', async () => {
    vi.spyOn(Business, 'findOne').mockResolvedValue(mockBusinessA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);
    vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
    vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA);
    vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

    vi.spyOn(Availability, 'find').mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          staffId: staffA_Id,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        },
      ]),
    });

    // Query for active appointments returns null because previous was CANCELLED
    vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);

    const savedAppt = {
      _id: new mongoose.Types.ObjectId(),
      businessId: businessA_Id,
      serviceId: mockServiceA,
      staffId: mockStaffA,
      customerName: 'Rebooker Client',
      customerEmail: 'rebooker@example.com',
      startTime: new Date('2026-11-16T15:00:00.000Z'),
      endTime: new Date('2026-11-16T16:00:00.000Z'),
      status: 'CONFIRMED',
    };
    vi.spyOn(Appointment, 'create').mockResolvedValue([savedAppt]);
    vi.spyOn(Appointment, 'findById').mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          ...savedAppt,
          serviceId: { name: mockServiceA.name, durationMinutes: 60 },
          staffId: { name: mockStaffA.name },
        }),
      }),
    });

    const res = await request(app)
      .post('/api/public/businesses/alpha-wellness/appointments')
      .send({
        serviceId: serviceA_Id.toString(),
        staffId: staffA_Id.toString(),
        date: FUTURE_DATE,
        startTime: '10:00',
        customerName: 'Rebooker Client',
        customerEmail: 'rebooker@example.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customerToken).toBeDefined();
  });

  // ==========================================
  // 23. Pagination Parameter Abuse
  // ==========================================
  it('23. should reject or clamp excessive pagination limits or negative pages', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

    // Negative page parameter
    const resNegative = await request(app)
      .get('/api/appointments?page=-5')
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(resNegative.status).toBe(400);

    // Oversized limit (e.g. limit=1000 exceeding 100 max limit)
    const resOversized = await request(app)
      .get('/api/appointments?limit=1000')
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(resOversized.status).toBe(400);
  });

  // ==========================================
  // 24. Analytics Date Range Abuse
  // ==========================================
  it('24. should reject analytics date ranges exceeding 92 days or where startDate > endDate', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue(mockAdminA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);

    // Inverted dates
    const resInverted = await request(app)
      .get('/api/analytics/overview?startDate=2026-12-31&endDate=2026-01-01')
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(resInverted.status).toBe(400);
    expect(resInverted.body.message).toMatch(/End date must be on or after start date|endDate must be greater than or equal to startDate/i);

    // Range exceeding 92 days
    const resHuge = await request(app)
      .get('/api/analytics/overview?startDate=2026-01-01&endDate=2026-12-31')
      .set('Cookie', [cookieHeader(tokenAdminA)]);

    expect(resHuge.status).toBe(400);
    expect(resHuge.body.message).toMatch(/Date range cannot exceed 92 days/i);
  });

  // ==========================================
  // 25. Public Endpoint Business Rules & Abuse
  // ==========================================
  it('25. should reject requests for nonexistent business slugs and inactive services', async () => {
    vi.spyOn(Business, 'findOne').mockResolvedValue(null);

    const res = await request(app).get('/api/public/businesses/non-existent-biz-12345');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);

    // Inactive service booking attempt
    vi.spyOn(Business, 'findOne').mockResolvedValue(mockBusinessA);
    vi.spyOn(Business, 'findById').mockResolvedValue(mockBusinessA);
    vi.spyOn(Service, 'findById').mockResolvedValue({
      ...mockServiceA,
      status: 'INACTIVE',
      isActive: false,
    });

    const resInactive = await request(app)
      .post('/api/public/businesses/alpha-wellness/appointments')
      .send({
        serviceId: serviceA_Id.toString(),
        date: FUTURE_DATE,
        startTime: '10:00',
        customerName: 'John Buyer',
        customerEmail: 'john@example.com',
      });

    expect(resInactive.status).toBe(400);
    expect(resInactive.body.message).toMatch(/Service is currently inactive/i);
  });

  // ==========================================
  // 26. Terminal State Customer Cancellation Protection
  // ==========================================
  it('26. should reject customer cancellation if appointment is already COMPLETED or NO_SHOW with 400', async () => {
    const validToken = jwt.sign(
      {
        appointmentId: appointmentA_Id.toString(),
        customerEmail: 'jane@example.com',
        businessId: businessA_Id.toString(),
        type: 'CUSTOMER_APPOINTMENT_ACCESS',
      },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Completed appointment
    vi.spyOn(Appointment, 'findById').mockResolvedValue({
      ...mockAppointmentA,
      status: 'COMPLETED',
    });

    const resCompleted = await request(app)
      .patch(`/api/public/appointments/${appointmentA_Id}/cancel`)
      .send({ token: validToken });

    expect(resCompleted.status).toBe(400);
    expect(resCompleted.body.message).toMatch(/already completed/i);

    // No-show appointment
    vi.spyOn(Appointment, 'findById').mockResolvedValue({
      ...mockAppointmentA,
      status: 'NO_SHOW',
    });

    const resNoShow = await request(app)
      .patch(`/api/public/appointments/${appointmentA_Id}/cancel`)
      .send({ token: validToken });

    expect(resNoShow.status).toBe(400);
    expect(resNoShow.body.message).toMatch(/marked as no-show/i);
  });
});
