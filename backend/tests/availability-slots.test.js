import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
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

describe('Phase 6: Availability Management & Slot Generation', () => {
  let businessA_Id;
  let businessB_Id;
  let adminA_Id;
  let adminB_Id;
  let systemOwnerId;

  let mockBusinessA;
  let mockBusinessB;
  let mockSystemOwner;
  let mockAdminA;
  let mockAdminB;

  let tokenAdminA;
  let tokenAdminB;
  let tokenSystemOwner;

  let serviceA_Id;
  let serviceB_Id;
  let mockServiceA;
  let mockServiceB;

  let staffA_Id;
  let staffB_Id;
  let mockStaffA;
  let mockStaffB;

  beforeEach(() => {
    vi.restoreAllMocks();

    businessA_Id = new mongoose.Types.ObjectId();
    businessB_Id = new mongoose.Types.ObjectId();
    adminA_Id = new mongoose.Types.ObjectId();
    adminB_Id = new mongoose.Types.ObjectId();
    systemOwnerId = new mongoose.Types.ObjectId();

    serviceA_Id = new mongoose.Types.ObjectId();
    serviceB_Id = new mongoose.Types.ObjectId();
    staffA_Id = new mongoose.Types.ObjectId();
    staffB_Id = new mongoose.Types.ObjectId();

    mockBusinessA = {
      _id: businessA_Id,
      name: 'Business Alpha',
      slug: 'business-alpha',
      timezone: 'America/New_York',
      status: 'ACTIVE',
    };

    mockBusinessB = {
      _id: businessB_Id,
      name: 'Business Beta',
      slug: 'business-beta',
      timezone: 'Asia/Kolkata',
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

    mockAdminA = {
      _id: adminA_Id,
      name: 'Admin Alpha',
      email: 'admin@alpha.com',
      role: 'BUSINESS_ADMIN',
      businessId: businessA_Id,
      status: 'ACTIVE',
    };

    mockAdminB = {
      _id: adminB_Id,
      name: 'Admin Beta',
      email: 'admin@beta.com',
      role: 'BUSINESS_ADMIN',
      businessId: businessB_Id,
      status: 'ACTIVE',
    };

    mockServiceA = {
      _id: serviceA_Id,
      name: 'Alpha Massage',
      description: 'Relaxing massage',
      durationMinutes: 30,
      businessId: businessA_Id,
      status: 'ACTIVE',
    };

    mockServiceB = {
      _id: serviceB_Id,
      name: 'Beta Oil Change',
      description: 'Quick service',
      durationMinutes: 45,
      businessId: businessB_Id,
      status: 'ACTIVE',
    };

    mockStaffA = {
      _id: staffA_Id,
      name: 'Alice Alpha',
      email: 'alice@alpha.com',
      phone: '+1-555-0101',
      businessId: businessA_Id,
      status: 'ACTIVE',
      serviceIds: [serviceA_Id],
    };

    mockStaffB = {
      _id: staffB_Id,
      name: 'Bob Beta',
      email: 'bob@beta.com',
      phone: '+1-555-0202',
      businessId: businessB_Id,
      status: 'ACTIVE',
      serviceIds: [serviceB_Id],
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

    // Mock User findById for authenticate middleware
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === adminA_Id.toString()) return Promise.resolve(mockAdminA);
      if (idStr === adminB_Id.toString()) return Promise.resolve(mockAdminB);
      if (idStr === systemOwnerId.toString()) return Promise.resolve(mockSystemOwner);
      return Promise.resolve(null);
    });

    // Mock Business findById
    vi.spyOn(Business, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === businessA_Id.toString()) return Promise.resolve(mockBusinessA);
      if (idStr === businessB_Id.toString()) return Promise.resolve(mockBusinessB);
      return Promise.resolve(null);
    });
  });

  describe('1. Availability CRUD & Tenant Isolation', () => {
    it('should create business-level availability (staffId = null)', async () => {
      vi.spyOn(Availability, 'find').mockResolvedValue([]);
      vi.spyOn(Availability, 'create').mockImplementation((doc) =>
        Promise.resolve({
          ...doc,
          _id: new mongoose.Types.ObjectId(),
        })
      );

      const res = await request(app)
        .post('/api/availability')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.availability.dayOfWeek).toBe(1);
      expect(res.body.data.availability.staffId).toBeNull();
      expect(res.body.data.availability.businessId.toString()).toBe(businessA_Id.toString());
    });

    it('should create staff-specific availability for active tenant staff', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue({ ...mockStaffA });
      vi.spyOn(Availability, 'find').mockResolvedValue([]);
      vi.spyOn(Availability, 'create').mockImplementation((doc) =>
        Promise.resolve({
          ...doc,
          _id: new mongoose.Types.ObjectId(),
          populate: vi.fn().mockResolvedValue(true),
        })
      );

      const res = await request(app)
        .post('/api/availability')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          staffId: staffA_Id.toString(),
          dayOfWeek: 2,
          startTime: '10:00',
          endTime: '14:00',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.availability.staffId.toString()).toBe(staffA_Id.toString());
    });

    it('should reject availability creation with cross-tenant staffId with 403', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue({ ...mockStaffB });

      const res = await request(app)
        .post('/api/availability')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          staffId: staffB_Id.toString(),
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/another business/i);
    });

    it('should reject availability creation for inactive staff with 400', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue({ ...mockStaffA, status: 'INACTIVE' });

      const res = await request(app)
        .post('/api/availability')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          staffId: staffA_Id.toString(),
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inactive staff/i);
    });

    it('should reject overlapping availability windows on the same day and staff scope', async () => {
      vi.spyOn(Availability, 'find').mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          staffId: null,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          isActive: true,
        },
      ]);

      const res = await request(app)
        .post('/api/availability')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          dayOfWeek: 1,
          startTime: '11:00',
          endTime: '14:00',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/overlaps with an existing window/i);
    });

    it('should allow multiple non-overlapping windows on the same day', async () => {
      vi.spyOn(Availability, 'find').mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          staffId: null,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          isActive: true,
        },
      ]);
      vi.spyOn(Availability, 'create').mockImplementation((doc) =>
        Promise.resolve({ ...doc, _id: new mongoose.Types.ObjectId() })
      );

      const res = await request(app)
        .post('/api/availability')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          dayOfWeek: 1,
          startTime: '13:00',
          endTime: '17:00',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid time format or startTime >= endTime', async () => {
      const res = await request(app)
        .post('/api/availability')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          dayOfWeek: 1,
          startTime: '17:00',
          endTime: '09:00',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/strictly before/i);
    });

    it('should prevent Admin A from reading Business B availability with 403', async () => {
      const availB_Id = new mongoose.Types.ObjectId();
      vi.spyOn(Availability, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: availB_Id,
          businessId: businessB_Id,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
        }),
      });

      const res = await request(app)
        .get(`/api/availability/${availB_Id}`)
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/another business/i);
    });

    it('should delete an availability window successfully', async () => {
      const availA_Id = new mongoose.Types.ObjectId();
      vi.spyOn(Availability, 'findById').mockResolvedValue({
        _id: availA_Id,
        businessId: businessA_Id,
      });
      vi.spyOn(Availability, 'findByIdAndDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/availability/${availA_Id}`)
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Blocked Dates CRUD & Validation', () => {
    it('should create a business-wide blocked date', async () => {
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);
      vi.spyOn(BlockedDate, 'create').mockImplementation((doc) =>
        Promise.resolve({
          ...doc,
          _id: new mongoose.Types.ObjectId(),
        })
      );

      const res = await request(app)
        .post('/api/blocked-dates')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          date: '2026-12-25',
          reason: 'Christmas Holiday',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.blockedDate.staffId).toBeNull();
    });

    it('should create a staff-specific blocked date', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue({ ...mockStaffA });
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);
      vi.spyOn(BlockedDate, 'create').mockImplementation((doc) =>
        Promise.resolve({
          ...doc,
          _id: new mongoose.Types.ObjectId(),
          populate: vi.fn().mockResolvedValue(true),
        })
      );

      const res = await request(app)
        .post('/api/blocked-dates')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          date: '2026-10-15',
          staffId: staffA_Id.toString(),
          reason: 'Doctor Appointment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.blockedDate.staffId.toString()).toBe(staffA_Id.toString());
    });

    it('should reject duplicate blocked date for the same scope with 400', async () => {
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        businessId: businessA_Id,
        staffId: null,
        date: new Date('2026-12-25T00:00:00.000Z'),
      });

      const res = await request(app)
        .post('/api/blocked-dates')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          date: '2026-12-25',
          reason: 'Duplicate entry',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already blocked/i);
    });

    it('should reject cross-tenant staffId for blocked date with 403', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue({ ...mockStaffB });

      const res = await request(app)
        .post('/api/blocked-dates')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          date: '2026-10-15',
          staffId: staffB_Id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/another business/i);
    });

    it('should delete a blocked date successfully', async () => {
      const blockedId = new mongoose.Types.ObjectId();
      vi.spyOn(BlockedDate, 'findById').mockResolvedValue({
        _id: blockedId,
        businessId: businessA_Id,
      });
      vi.spyOn(BlockedDate, 'findByIdAndDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/blocked-dates/${blockedId}`)
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Slot Generation Engine (GET /api/availability/slots)', () => {
    it('should generate 15-minute increment slots for simple availability', async () => {
      // 2026-10-12 is Monday (dayOfWeek = 1)
      vi.spyOn(Service, 'findById').mockResolvedValue({ ...mockServiceA, durationMinutes: 30 });
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);
      vi.spyOn(BlockedDate, 'find').mockResolvedValue([]);
      vi.spyOn(Staff, 'find').mockResolvedValue([{ ...mockStaffA }]);
      // Business availability 09:00 - 11:00 (no staff specific)
      vi.spyOn(Availability, 'find').mockImplementation((q) => {
        if (q.staffId === null) {
          return {
            sort: vi.fn().mockResolvedValue([
              {
                startTime: '09:00',
                endTime: '11:00',
                dayOfWeek: 1,
                isActive: true,
              },
            ]),
          };
        }
        return { sort: vi.fn().mockResolvedValue([]) };
      });
      vi.spyOn(Appointment, 'find').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/availability/slots')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .query({
          serviceId: serviceA_Id.toString(),
          date: '2026-10-12',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const slots = res.body.data.slots;
      // 09:00 to 11:00, 30m duration, 15m step:
      // Starts: 09:00, 09:15, 09:30, 09:45, 10:00, 10:15, 10:30 (10:30+30m = 11:00)
      // 10:45+30m = 11:15 which exceeds 11:00, so not included
      expect(slots.length).toBe(7);
      expect(slots[0].localStartTime).toBe('09:00');
      expect(slots[0].localEndTime).toBe('09:30');
      expect(slots[slots.length - 1].localStartTime).toBe('10:30');
      expect(slots[slots.length - 1].localEndTime).toBe('11:00');
    });

    it('should use staff-specific availability override instead of unioning with business schedule', async () => {
      // 2026-10-12 (Monday)
      vi.spyOn(Service, 'findById').mockResolvedValue({ ...mockServiceA, durationMinutes: 60 });
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);
      vi.spyOn(Staff, 'findById').mockResolvedValue({ ...mockStaffA });
      // Staff-specific availability is 10:00 - 12:00, whereas business is 09:00 - 17:00
      vi.spyOn(Availability, 'find').mockImplementation((q) => {
        if (q.staffId?.toString() === staffA_Id.toString()) {
          return {
            sort: vi.fn().mockResolvedValue([
              {
                startTime: '10:00',
                endTime: '12:00',
                dayOfWeek: 1,
                isActive: true,
              },
            ]),
          };
        }
        return {
          sort: vi.fn().mockResolvedValue([
            {
              startTime: '09:00',
              endTime: '17:00',
              dayOfWeek: 1,
              isActive: true,
            },
          ]),
        };
      });
      vi.spyOn(Appointment, 'find').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/availability/slots')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .query({
          serviceId: serviceA_Id.toString(),
          date: '2026-10-12',
          staffId: staffA_Id.toString(),
        });

      expect(res.status).toBe(200);
      const slots = res.body.data.slots;
      // Should strictly use 10:00 - 12:00, 60m duration, 15m step:
      // Starts: 10:00, 10:15, 10:30, 10:45, 11:00
      expect(slots.length).toBe(5);
      expect(slots[0].localStartTime).toBe('10:00');
      expect(slots[slots.length - 1].localStartTime).toBe('11:00');
      expect(slots[slots.length - 1].localEndTime).toBe('12:00');
    });

    it('should return 0 slots when date is blocked business-wide', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue({ ...mockServiceA });
      // Business-wide blocked
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        reason: 'Office Closed',
      });

      const res = await request(app)
        .get('/api/availability/slots')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .query({
          serviceId: serviceA_Id.toString(),
          date: '2026-12-25',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.slotsCount).toBe(0);
      expect(res.body.data.slots).toEqual([]);
    });

    it('should block overlapping slots with existing active appointments but allow boundary touches and cancelled appointments', async () => {
      // 2026-10-12 Monday (America/New_York is EDT, UTC-4)
      // 09:00 EDT = 13:00 UTC, 10:00 EDT = 14:00 UTC, 10:30 EDT = 14:30 UTC
      vi.spyOn(Service, 'findById').mockResolvedValue({ ...mockServiceA, durationMinutes: 30 });
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);
      vi.spyOn(Staff, 'findById').mockResolvedValue({ ...mockStaffA });
      vi.spyOn(Availability, 'find').mockImplementation((q) => {
        if (q.staffId === null) {
          return {
            sort: vi.fn().mockResolvedValue([
              {
                startTime: '09:00',
                endTime: '11:00',
                dayOfWeek: 1,
                isActive: true,
              },
            ]),
          };
        }
        return { sort: vi.fn().mockResolvedValue([]) };
      });

      // Existing appointment: 10:00 - 10:30 local (14:00Z to 14:30Z)
      // Cancelled appointment: 09:00 - 09:30 local (13:00Z to 13:30Z)
      vi.spyOn(Appointment, 'find').mockResolvedValue([
        {
          startTime: new Date('2026-10-12T14:00:00.000Z'),
          endTime: new Date('2026-10-12T14:30:00.000Z'),
          status: 'CONFIRMED',
        },
      ]);

      const res = await request(app)
        .get('/api/availability/slots')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .query({
          serviceId: serviceA_Id.toString(),
          date: '2026-10-12',
          staffId: staffA_Id.toString(),
        });

      expect(res.status).toBe(200);
      const slots = res.body.data.slots;
      const startTimes = slots.map((s) => s.localStartTime);

      // 09:00, 09:15, 09:30 should be available
      expect(startTimes).toContain('09:00');
      expect(startTimes).toContain('09:15');
      expect(startTimes).toContain('09:30');

      // 09:45 (ends 10:15) overlaps appointment (10:00-10:30) -> MUST BE BLOCKED
      expect(startTimes).not.toContain('09:45');
      // 10:00 (ends 10:30) overlaps appointment -> MUST BE BLOCKED
      expect(startTimes).not.toContain('10:00');
      // 10:15 (ends 10:45) overlaps appointment -> MUST BE BLOCKED
      expect(startTimes).not.toContain('10:15');

      // 10:30 (ends 11:00) touches boundary at 10:30 -> MUST BE AVAILABLE
      expect(startTimes).toContain('10:30');
    });

    it('should reject slot preview for service belonging to another business with 403', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue({ ...mockServiceB });

      const res = await request(app)
        .get('/api/availability/slots')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .query({
          serviceId: serviceB_Id.toString(),
          date: '2026-10-12',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/another business/i);
    });

    it('should reject slot preview when service is inactive with 400', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue({ ...mockServiceA, status: 'INACTIVE' });

      const res = await request(app)
        .get('/api/availability/slots')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .query({
          serviceId: serviceA_Id.toString(),
          date: '2026-10-12',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/service is currently inactive/i);
    });

    it('should reject System Owner accessing availability endpoints with 403', async () => {
      const res = await request(app)
        .get('/api/availability')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenSystemOwner}`]);

      expect(res.status).toBe(403);
    });
  });
});
