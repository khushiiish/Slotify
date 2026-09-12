import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Business from '../src/models/business.model.js';
import Service from '../src/models/service.model.js';
import Staff from '../src/models/staff.model.js';
import Appointment from '../src/models/appointment.model.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';

describe('Phase 10: Business Admin Analytics & Platform Analytics', () => {
  let businessA_Id;
  let businessB_Id;
  let adminA_Id;
  let adminB_Id;
  let systemOwnerId;

  let serviceA1_Id;
  let serviceA2_Id;
  let serviceB_Id;
  let staffA1_Id;
  let staffA2_Id;
  let staffB_Id;

  let mockBusinessA;
  let mockBusinessB;
  let mockAdminA;
  let mockAdminB;
  let mockSystemOwner;

  let tokenAdminA;
  let tokenAdminB;
  let tokenSystemOwner;

  beforeEach(() => {
    vi.restoreAllMocks();

    businessA_Id = new mongoose.Types.ObjectId();
    businessB_Id = new mongoose.Types.ObjectId();
    adminA_Id = new mongoose.Types.ObjectId();
    adminB_Id = new mongoose.Types.ObjectId();
    systemOwnerId = new mongoose.Types.ObjectId();

    serviceA1_Id = new mongoose.Types.ObjectId();
    serviceA2_Id = new mongoose.Types.ObjectId();
    serviceB_Id = new mongoose.Types.ObjectId();
    staffA1_Id = new mongoose.Types.ObjectId();
    staffA2_Id = new mongoose.Types.ObjectId();
    staffB_Id = new mongoose.Types.ObjectId();

    mockBusinessA = {
      _id: businessA_Id,
      name: 'Urban Wellness Studio',
      slug: 'urban-wellness-studio',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    };

    mockBusinessB = {
      _id: businessB_Id,
      name: 'TechFix Hub',
      slug: 'techfix-hub',
      timezone: 'America/New_York',
      status: 'ACTIVE',
    };

    mockAdminA = {
      _id: adminA_Id,
      name: 'Admin Alpha',
      email: 'admin@urbanwellness.slotify.dev',
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id,
      status: 'ACTIVE',
    };

    mockAdminB = {
      _id: adminB_Id,
      name: 'Admin Beta',
      email: 'admin@techfix.slotify.dev',
      role: 'BUSINESS_ADMIN',
      businessId: businessB_Id,
      status: 'ACTIVE',
    };

    mockSystemOwner = {
      _id: systemOwnerId,
      name: 'Platform Owner',
      email: 'owner@slotify.dev',
      role: 'SYSTEM_OWNER',
      businessId: null,
      status: 'ACTIVE',
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
      businessId: null,
    });

    // Default auth mocks
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === adminA_Id.toString()) return Promise.resolve(mockAdminA);
      if (idStr === adminB_Id.toString()) return Promise.resolve(mockAdminB);
      if (idStr === systemOwnerId.toString()) return Promise.resolve(mockSystemOwner);
      return Promise.resolve(null);
    });

    vi.spyOn(Business, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === businessA_Id.toString()) return Promise.resolve(mockBusinessA);
      if (idStr === businessB_Id.toString()) return Promise.resolve(mockBusinessB);
      return Promise.resolve(null);
    });
  });

  // Helper for mock query chain with .populate and .lean
  const createMockQuery = (result) => {
    const chain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(result),
      then: (resolve) => resolve(result),
    };
    return chain;
  };

  describe('Authentication, Authorization & Security', () => {
    it('B. should reject unauthenticated analytics request with 401', async () => {
      const res = await request(app).get('/api/analytics/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('C. should reject non-BUSINESS_ADMIN role for tenant overview with 403', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenSystemOwner}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('E. should block businessId query parameter spoofing attempt with 403', async () => {
      const res = await request(app)
        .get(`/api/analytics/overview?businessId=${businessB_Id}`)
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('D. should enforce tenant isolation so Admin B cannot access Admin A data', async () => {
      // Mock find returning data only matching the requested businessId
      vi.spyOn(Appointment, 'find').mockImplementation((filter) => {
        if (filter.businessId.toString() === businessB_Id.toString()) {
          return createMockQuery([]);
        }
        return createMockQuery([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            status: 'CONFIRMED',
            startTime: new Date(),
          },
        ]);
      });

      const resB = await request(app)
        .get('/api/analytics/overview?range=30d')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminB}`]);

      expect(resB.status).toBe(200);
      expect(resB.body.data.summary.total).toBe(0);
    });
  });

  describe('Validation & Date Range Bounds', () => {
    it('N. should reject invalid date format with 400', async () => {
      const res = await request(app)
        .get('/api/analytics/overview?startDate=invalid-date&endDate=2026-09-20')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject endDate before startDate with 400', async () => {
      const res = await request(app)
        .get('/api/analytics/overview?startDate=2026-09-20&endDate=2026-09-10')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('End date must be on or after start date');
    });

    it('O. should reject excessive date range (> 92 days) with 400', async () => {
      const res = await request(app)
        .get('/api/analytics/overview?startDate=2026-01-01&endDate=2026-06-01')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Date range cannot exceed 92 days');
    });

    it('should accept valid preset ranges (7d, 30d, 90d)', async () => {
      vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([]));

      for (const range of ['7d', '30d', '90d']) {
        const res = await request(app)
          .get(`/api/analytics/overview?range=${range}`)
          .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

        expect(res.status).toBe(200);
        expect(res.body.data.trend).toBeDefined();
        if (range === '7d') expect(res.body.data.trend.length).toBe(7);
        if (range === '30d') expect(res.body.data.trend.length).toBe(30);
        if (range === '90d') expect(res.body.data.trend.length).toBe(90);
      }
    });
  });

  describe('Core Metrics & Aggregations', () => {
    it('A & F, G, H, I. should compute correct summary metrics, completion rate, and cancellation rate', async () => {
      const mockAppointments = [
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          status: 'COMPLETED',
          startTime: new Date('2026-09-10T10:00:00.000Z'),
          serviceId: { _id: serviceA1_Id, name: 'Massage' },
          staffId: { _id: staffA1_Id, name: 'Alice' },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          status: 'COMPLETED',
          startTime: new Date('2026-09-11T10:00:00.000Z'),
          serviceId: { _id: serviceA1_Id, name: 'Massage' },
          staffId: { _id: staffA1_Id, name: 'Alice' },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          status: 'CONFIRMED',
          startTime: new Date('2026-09-12T10:00:00.000Z'),
          serviceId: { _id: serviceA2_Id, name: 'Facial' },
          staffId: { _id: staffA2_Id, name: 'Bob' },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          status: 'CANCELLED',
          startTime: new Date('2026-09-13T10:00:00.000Z'),
          serviceId: { _id: serviceA1_Id, name: 'Massage' },
          staffId: { _id: staffA1_Id, name: 'Alice' },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          status: 'NO_SHOW',
          startTime: new Date('2026-09-14T10:00:00.000Z'),
          serviceId: { _id: serviceA2_Id, name: 'Facial' },
          staffId: { _id: staffA2_Id, name: 'Bob' },
        },
      ];

      vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery(mockAppointments));

      const res = await request(app)
        .get('/api/analytics/overview?startDate=2026-09-08&endDate=2026-09-15')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      const { summary, statusBreakdown, servicePerformance, staffPerformance } = res.body.data;

      // Total = 5
      expect(summary.total).toBe(5);
      expect(summary.confirmed).toBe(1);
      expect(summary.completed).toBe(2);
      expect(summary.cancelled).toBe(1);
      expect(summary.noShow).toBe(1);

      // Completion Rate: 2 / 5 = 40.0%
      expect(summary.completionRate).toBe(40);
      // Cancellation Rate: 1 / 5 = 20.0%
      expect(summary.cancellationRate).toBe(20);

      // Status breakdown percentages
      const completedBreakdown = statusBreakdown.find((s) => s.status === 'COMPLETED');
      expect(completedBreakdown.count).toBe(2);
      expect(completedBreakdown.percentage).toBe(40);

      // K. Service Performance
      expect(servicePerformance.length).toBe(2);
      expect(servicePerformance[0].serviceName).toBe('Massage');
      expect(servicePerformance[0].total).toBe(3);
      expect(servicePerformance[0].completed).toBe(2);
      expect(servicePerformance[1].serviceName).toBe('Facial');
      expect(servicePerformance[1].total).toBe(2);

      // L. Staff Performance
      expect(staffPerformance.length).toBe(2);
      expect(staffPerformance[0].staffName).toBe('Alice');
      expect(staffPerformance[0].total).toBe(3);
      expect(staffPerformance[1].staffName).toBe('Bob');
      expect(staffPerformance[1].total).toBe(2);
    });

    it('M. should gracefully handle empty dataset without NaN or division by zero', async () => {
      vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([]));

      const res = await request(app)
        .get('/api/analytics/overview?range=7d')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      const { summary, trend, statusBreakdown, servicePerformance, staffPerformance } = res.body.data;

      expect(summary.total).toBe(0);
      expect(summary.confirmed).toBe(0);
      expect(summary.completed).toBe(0);
      expect(summary.cancelled).toBe(0);
      expect(summary.noShow).toBe(0);
      expect(summary.cancellationRate).toBe(0);
      expect(summary.completionRate).toBe(0);

      // Trend has 7 zero-filled days
      expect(trend.length).toBe(7);
      expect(trend.every((d) => d.count === 0)).toBe(true);

      // Status breakdown has 0% percentages
      expect(statusBreakdown.every((s) => s.percentage === 0 && s.count === 0)).toBe(true);

      // Service and staff lists are empty
      expect(servicePerformance).toEqual([]);
      expect(staffPerformance).toEqual([]);
    });

    it('J. should ensure continuous trend data with zero gaps across dates', async () => {
      vi.spyOn(Appointment, 'find').mockReturnValue(
        createMockQuery([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            status: 'COMPLETED',
            startTime: new Date('2026-09-10T10:00:00.000Z'),
          },
        ])
      );

      const res = await request(app)
        .get('/api/analytics/overview?startDate=2026-09-08&endDate=2026-09-12')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      const trend = res.body.data.trend;

      // 5 continuous dates: 08, 09, 10, 11, 12
      expect(trend.length).toBe(5);
      expect(trend[0].date).toBe('2026-09-08');
      expect(trend[4].date).toBe('2026-09-12');
    });
  });

  describe('Timezone & Account Status Handling', () => {
    it('P. should convert date boundaries according to business timezone', async () => {
      let capturedFilter = null;
      vi.spyOn(Appointment, 'find').mockImplementation((filter) => {
        capturedFilter = filter;
        return createMockQuery([]);
      });

      // Business B is America/New_York (EDT UTC-4 in September)
      const res = await request(app)
        .get('/api/analytics/overview?startDate=2026-09-10&endDate=2026-09-10')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminB}`]);

      expect(res.status).toBe(200);
      expect(capturedFilter).toBeDefined();
      expect(capturedFilter.businessId.toString()).toBe(businessB_Id.toString());
      // 2026-09-10 00:00 EDT is 2026-09-10 04:00 UTC
      expect(capturedFilter.startTime.$gte.toISOString()).toContain('2026-09-10T04:00:00');
    });

    it('should reject analytics if business is disabled with 403', async () => {
      vi.spyOn(Business, 'findById').mockResolvedValue({
        ...mockBusinessA,
        status: 'DISABLED',
      });

      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject analytics if user account is disabled with 403', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue({
        ...mockAdminA,
        status: 'DISABLED',
      });

      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('System Owner Platform Analytics', () => {
    it('should reject non-SYSTEM_OWNER role from platform analytics with 403', async () => {
      const res = await request(app)
        .get('/api/analytics/platform')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(403);
    });

    it('should return platform overview metrics for SYSTEM_OWNER', async () => {
      vi.spyOn(Business, 'countDocuments')
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(4) // active
        .mockResolvedValueOnce(1); // disabled

      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(120);

      const res = await request(app)
        .get('/api/analytics/platform')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenSystemOwner}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        totalBusinesses: 5,
        activeBusinesses: 4,
        disabledBusinesses: 1,
        totalAppointments: 120,
      });
    });
  });
});
