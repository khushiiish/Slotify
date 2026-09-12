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

describe('Phase 7: Booking Engine & Appointment Creation', () => {
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

  let staffA1_Id;
  let staffA2_Id;
  let staffB_Id;
  let mockStaffA1;
  let mockStaffA2;
  let mockStaffB;

  // Use a future date for all booking tests (e.g., 2026-10-12 is a Monday)
  const FUTURE_MONDAY = '2026-10-12';

  beforeEach(() => {
    vi.restoreAllMocks();

    businessA_Id = new mongoose.Types.ObjectId();
    businessB_Id = new mongoose.Types.ObjectId();
    adminA_Id = new mongoose.Types.ObjectId();
    adminB_Id = new mongoose.Types.ObjectId();
    systemOwnerId = new mongoose.Types.ObjectId();

    serviceA_Id = new mongoose.Types.ObjectId();
    serviceB_Id = new mongoose.Types.ObjectId();
    staffA1_Id = new mongoose.Types.ObjectId();
    staffA2_Id = new mongoose.Types.ObjectId();
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
      name: 'Alpha Deep Massage',
      description: 'Relaxing 60-min deep tissue massage',
      durationMinutes: 60,
      businessId: businessA_Id,
      status: 'ACTIVE',
    };

    mockServiceB = {
      _id: serviceB_Id,
      name: 'Beta Tune Up',
      description: '45-min tune up',
      durationMinutes: 45,
      businessId: businessB_Id,
      status: 'ACTIVE',
    };

    mockStaffA1 = {
      _id: staffA1_Id,
      name: 'Alice Alpha',
      email: 'alice@alpha.com',
      phone: '+1-555-0101',
      businessId: businessA_Id,
      status: 'ACTIVE',
      serviceIds: [serviceA_Id],
    };

    mockStaffA2 = {
      _id: staffA2_Id,
      name: 'Aaron Alpha',
      email: 'aaron@alpha.com',
      phone: '+1-555-0102',
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

  describe('Validation & Eligibility Rules', () => {
    it('should successfully create an appointment with valid data', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      // Staff availability: Monday 09:00 - 17:00
      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            staffId: staffA1_Id,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '17:00',
            isActive: true,
          },
        ]),
      });

      // No conflicting appointments
      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);

      const createdApptId = new mongoose.Types.ObjectId();
      const mockCreated = {
        _id: createdApptId,
        businessId: businessA_Id,
        serviceId: serviceA_Id,
        staffId: staffA1_Id,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerPhone: '+1-555-0303',
        status: 'CONFIRMED',
      };

      vi.spyOn(Appointment, 'create').mockResolvedValue([mockCreated]);
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            ...mockCreated,
            serviceId: { name: mockServiceA.name, durationMinutes: mockServiceA.durationMinutes },
            staffId: { name: mockStaffA1.name, email: mockStaffA1.email },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
          customerPhone: '+1-555-0303',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.localStartTime).toBe('10:00');
      expect(res.body.data.localEndTime).toBe('11:00'); // 60 mins service
      expect(res.body.data.timezone).toBe('America/New_York');
      expect(res.body.data.appointment.customerName).toBe('Jane Doe');
    });

    it('should reject non-15-minute start time intervals (e.g. 10:07)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:07',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/15-minute booking interval/);
    });

    it('should reject booking when service belongs to another business', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceB); // Belongs to Business B

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceB_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/does not belong to the selected business/);
    });

    it('should reject booking when service is inactive', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue({
        ...mockServiceA,
        status: 'INACTIVE',
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Service is currently inactive/);
    });

    it('should reject booking when staff member is inactive', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue({
        ...mockStaffA1,
        status: 'INACTIVE',
      });
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Staff member is currently inactive/);
    });

    it('should reject booking when staff member is not assigned to the service', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue({
        ...mockStaffA1,
        serviceIds: [], // Not assigned to serviceA
      });
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not assigned to provide this service/);
    });

    it('should reject booking when business is closed due to business-wide blocked date', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        businessId: businessA_Id,
        staffId: null,
        reason: 'National Holiday',
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/The business is closed on/);
    });

    it('should reject booking when staff member is blocked on requested date', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);

      // Business not blocked, but staff is blocked
      vi.spyOn(BlockedDate, 'findOne').mockImplementation((query) => {
        if (!query.staffId) return Promise.resolve(null);
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          staffId: staffA1_Id,
          reason: 'Sick leave',
        });
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Staff member is unavailable/);
    });

    it('should reject booking when slot falls outside working hours', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA); // 60 mins duration
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      // Available window: 09:00 - 12:00
      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            staffId: staffA1_Id,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '12:00',
            isActive: true,
          },
        ]),
      });

      // Requesting 11:30 -> with 60m duration ends at 12:30 (exceeds window end of 12:00)
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '11:30',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/outside working hours/);
    });

    it('should reject past appointment slots', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: '2020-01-01',
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot book an appointment in the past/);
    });

    it('should reject malformed serviceId format', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: 'invalid-id-format',
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Service ID must be a valid 24-character ObjectId/);
    });

    it('should reject malformed staffId format', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: 'invalid-id-format',
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Staff ID must be a valid 24-character ObjectId/);
    });

    it('should reject staff member belonging to another business', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffB); // Belongs to Business B
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffB_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Staff member does not belong to this business/);
    });

    it('should reject malformed date format', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: '12-10-2026', // wrong format
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Date must be formatted as YYYY-MM-DD/);
    });

    it('should reject malformed time format', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '25:00', // invalid hour
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Start time must be formatted as HH:mm/);
    });

    it('should respect staff-specific availability override', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      // Staff has specific window 14:00 - 18:00
      vi.spyOn(Availability, 'find').mockImplementation((query) => {
        if (query.staffId) {
          return {
            sort: vi.fn().mockResolvedValue([
              {
                _id: new mongoose.Types.ObjectId(),
                businessId: businessA_Id,
                staffId: staffA1_Id,
                dayOfWeek: 1,
                startTime: '14:00',
                endTime: '18:00',
                isActive: true,
              },
            ]),
          };
        }
        return { sort: vi.fn().mockResolvedValue([]) };
      });

      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);
      const createdApptId = new mongoose.Types.ObjectId();
      const mockCreated = {
        _id: createdApptId,
        businessId: businessA_Id,
        serviceId: serviceA_Id,
        staffId: staffA1_Id,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        status: 'CONFIRMED',
      };
      vi.spyOn(Appointment, 'create').mockResolvedValue([mockCreated]);
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            ...mockCreated,
            serviceId: { name: mockServiceA.name, durationMinutes: 60 },
            staffId: { name: mockStaffA1.name, email: mockStaffA1.email },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '15:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should fallback to business availability when staff has no specific availability', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      // Staff query returns empty, Business fallback query returns 09:00 - 17:00
      vi.spyOn(Availability, 'find').mockImplementation((query) => {
        if (query.staffId === null) {
          return {
            sort: vi.fn().mockResolvedValue([
              {
                _id: new mongoose.Types.ObjectId(),
                businessId: businessA_Id,
                staffId: null,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isActive: true,
              },
            ]),
          };
        }
        return { sort: vi.fn().mockResolvedValue([]) };
      });

      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);
      const createdApptId = new mongoose.Types.ObjectId();
      const mockCreated = {
        _id: createdApptId,
        businessId: businessA_Id,
        serviceId: serviceA_Id,
        staffId: staffA1_Id,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        status: 'CONFIRMED',
      };
      vi.spyOn(Appointment, 'create').mockResolvedValue([mockCreated]);
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            ...mockCreated,
            serviceId: { name: mockServiceA.name, durationMinutes: 60 },
            staffId: { name: mockStaffA1.name, email: mockStaffA1.email },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Appointment Conflict & Overlap Logic', () => {
    it('should reject booking with 409 Conflict when overlapping active appointment exists', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            staffId: staffA1_Id,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '17:00',
            isActive: true,
          },
        ]),
      });

      // Existing overlapping appointment
      vi.spyOn(Appointment, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        businessId: businessA_Id,
        staffId: staffA1_Id,
        startTime: new Date('2026-10-12T14:30:00.000Z'),
        endTime: new Date('2026-10-12T15:30:00.000Z'),
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Selected time slot is no longer available/);
    });

    it('should allow booking when existing appointment is CANCELLED (does not block)', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            staffId: staffA1_Id,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '17:00',
            isActive: true,
          },
        ]),
      });

      // No active non-cancelled appointment found
      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);

      const createdApptId = new mongoose.Types.ObjectId();
      const mockCreated = {
        _id: createdApptId,
        businessId: businessA_Id,
        serviceId: serviceA_Id,
        staffId: staffA1_Id,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        status: 'CONFIRMED',
      };

      vi.spyOn(Appointment, 'create').mockResolvedValue([mockCreated]);
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            ...mockCreated,
            serviceId: { name: mockServiceA.name, durationMinutes: 60 },
            staffId: { name: mockStaffA1.name, email: mockStaffA1.email },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should allow back-to-back appointment (touching boundary)', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            staffId: staffA1_Id,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '17:00',
            isActive: true,
          },
        ]),
      });

      // findOne checks overlap: startTime < slotEnd && endTime > slotStart
      // If previous appointment ends exactly when slot starts (10:00), endTime > 10:00 is FALSE, so findOne returns null
      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);

      const createdApptId = new mongoose.Types.ObjectId();
      const mockCreated = {
        _id: createdApptId,
        businessId: businessA_Id,
        serviceId: serviceA_Id,
        staffId: staffA1_Id,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        status: 'CONFIRMED',
      };

      vi.spyOn(Appointment, 'create').mockResolvedValue([mockCreated]);
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            ...mockCreated,
            serviceId: { name: mockServiceA.name, durationMinutes: 60 },
            staffId: { name: mockStaffA1.name, email: mockStaffA1.email },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane Doe',
          customerEmail: 'jane@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Any-Staff Booking Logic', () => {
    it('should select an eligible and available staff member when staffId is omitted', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null); // Business not blocked
      vi.spyOn(Staff, 'find').mockResolvedValue([mockStaffA1, mockStaffA2]);
      vi.spyOn(BlockedDate, 'find').mockResolvedValue([]); // Neither staff blocked

      // Both staff have availability windows
      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            staffId: staffA1_Id,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '17:00',
            isActive: true,
          },
        ]),
      });

      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);

      const createdApptId = new mongoose.Types.ObjectId();
      const mockCreated = {
        _id: createdApptId,
        businessId: businessA_Id,
        serviceId: serviceA_Id,
        staffId: staffA1_Id,
        customerName: 'Jane AnyStaff',
        customerEmail: 'jane.any@example.com',
        status: 'CONFIRMED',
      };

      vi.spyOn(Appointment, 'create').mockResolvedValue([mockCreated]);
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            ...mockCreated,
            serviceId: { name: mockServiceA.name, durationMinutes: 60 },
            staffId: { name: mockStaffA1.name, email: mockStaffA1.email },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane AnyStaff',
          customerEmail: 'jane.any@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.staffId).toBeDefined();
    });

    it('should skip busy staff and assign another available staff member', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);
      vi.spyOn(Staff, 'find').mockResolvedValue([mockStaffA1, mockStaffA2]);
      vi.spyOn(BlockedDate, 'find').mockResolvedValue([]);

      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '17:00',
            isActive: true,
          },
        ]),
      });

      // StaffA1 has a conflicting appointment, StaffA2 is free
      vi.spyOn(Appointment, 'findOne').mockImplementation((query) => {
        if (query.staffId.toString() === staffA1_Id.toString()) {
          return Promise.resolve({
            _id: new mongoose.Types.ObjectId(),
            status: 'CONFIRMED',
          });
        }
        return Promise.resolve(null);
      });

      const createdApptId = new mongoose.Types.ObjectId();
      const mockCreated = {
        _id: createdApptId,
        businessId: businessA_Id,
        serviceId: serviceA_Id,
        staffId: staffA2_Id, // assigned to StaffA2
        customerName: 'Jane AnyStaff',
        customerEmail: 'jane.any@example.com',
        status: 'CONFIRMED',
      };

      vi.spyOn(Appointment, 'create').mockResolvedValue([mockCreated]);
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            ...mockCreated,
            serviceId: { name: mockServiceA.name, durationMinutes: 60 },
            staffId: { name: mockStaffA2.name, email: mockStaffA2.email },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane AnyStaff',
          customerEmail: 'jane.any@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.appointment.staffId.name).toBe('Aaron Alpha');
    });

    it('should reject any-staff booking when no active staff are available for the service', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);
      vi.spyOn(Staff, 'find').mockResolvedValue([]); // No active staff

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          serviceId: serviceA_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Jane AnyStaff',
          customerEmail: 'jane.any@example.com',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/No active staff members are available for this service/);
    });
  });

  describe('Race Condition & Concurrency Protection', () => {
    it('should serialize concurrent competing requests and return 409 for the loser', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA1);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            staffId: staffA1_Id,
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
            endTime: '17:00',
            isActive: true,
          },
        ]),
      });

      // Simulate first request finding no appointment, second request finding the newly created one
      let createdDoc = null;
      vi.spyOn(Appointment, 'findOne').mockImplementation(() => {
        if (createdDoc) {
          return Promise.resolve(createdDoc);
        }
        return Promise.resolve(null);
      });

      vi.spyOn(Appointment, 'create').mockImplementation((docs) => {
        createdDoc = {
          _id: new mongoose.Types.ObjectId(),
          ...docs[0],
        };
        return Promise.resolve([createdDoc]);
      });

      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(),
            serviceId: { name: mockServiceA.name, durationMinutes: 60 },
            staffId: { name: mockStaffA1.name, email: mockStaffA1.email },
          }),
        }),
      });

      const sendBooking = (name, emailPrefix) =>
        request(app)
          .post('/api/appointments')
          .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
          .send({
            serviceId: serviceA_Id.toString(),
            staffId: staffA1_Id.toString(),
            date: FUTURE_MONDAY,
            startTime: '10:00',
            customerName: name,
            customerEmail: `${emailPrefix}@example.com`,
          });

      // Fire 2 concurrent competing requests simultaneously
      const [res1, res2] = await Promise.all([
        sendBooking('Concurrent Competitor 1', 'competitor1'),
        sendBooking('Concurrent Competitor 2', 'competitor2'),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.message).toMatch(/Selected time slot is no longer available/);
    });
  });

  describe('Tenant Isolation & Security', () => {
    it('should reject appointment creation if body specifies a different businessId (anti-spoofing)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`])
        .send({
          businessId: businessB_Id.toString(), // Tampering attempt
          serviceId: serviceA_Id.toString(),
          staffId: staffA1_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Attacker',
          customerEmail: 'attacker@example.com',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/You do not have permission/);
    });

    it('should reject access to another business appointment on GET /api/appointments/:id', async () => {
      const otherApptId = new mongoose.Types.ObjectId();
      const mockOtherAppt = {
        _id: otherApptId,
        businessId: businessB_Id, // Belongs to Business B
        serviceId: serviceB_Id,
        staffId: staffB_Id,
        customerName: 'Secret Customer',
      };

      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockOtherAppt),
        }),
      });

      const res = await request(app)
        .get(`/api/appointments/${otherApptId}`)
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]); // Admin A attempting access

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/You do not have permission/);
    });

    it('should reject appointment listing/creation for disabled business', async () => {
      vi.spyOn(Business, 'findById').mockResolvedValue({
        ...mockBusinessA,
        status: 'DISABLED',
      });

      const res = await request(app)
        .get('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Business account is disabled|inactive/);
    });
  });

  describe('Admin Appointment Management Lifecycle', () => {
    it('should list appointments filtered by date and status', async () => {
      const mockList = [
        {
          _id: new mongoose.Types.ObjectId(),
          businessId: businessA_Id,
          serviceId: { name: 'Alpha Deep Massage', durationMinutes: 60 },
          staffId: { name: 'Alice Alpha' },
          customerName: 'Client 1',
          startTime: new Date('2026-10-12T14:00:00.000Z'),
          status: 'CONFIRMED',
        },
      ];

      vi.spyOn(Appointment, 'find').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockResolvedValue(mockList),
          }),
        }),
      });

      const res = await request(app)
        .get(`/api/appointments?date=${FUTURE_MONDAY}&status=CONFIRMED`)
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].customerName).toBe('Client 1');
    });

    it('should cancel an appointment on PATCH /api/appointments/:id/cancel', async () => {
      const apptId = new mongoose.Types.ObjectId();
      const mockAppt = {
        _id: apptId,
        businessId: businessA_Id,
        status: 'CONFIRMED',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Appointment, 'findById')
        .mockResolvedValueOnce(mockAppt) // for cancelAppointment findById
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue({
              ...mockAppt,
              status: 'CANCELLED',
              serviceId: { name: 'Alpha Deep Massage' },
              staffId: { name: 'Alice Alpha' },
            }),
          }),
        });

      const res = await request(app)
        .patch(`/api/appointments/${apptId}/cancel`)
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/cancelled successfully/);
      expect(res.body.data.status).toBe('CANCELLED');
    });
  });

  describe('Authoritative Timezone Handling (Requirements AH & AI)', () => {
    it('should correctly convert local time to UTC in non-UTC Asia/Kolkata timezone', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceB); // Belongs to Business B (Asia/Kolkata)
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffB);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessB_Id,
            staffId: staffB_Id,
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '18:00',
            isActive: true,
          },
        ]),
      });

      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);
      let capturedDoc = null;
      vi.spyOn(Appointment, 'create').mockImplementation((docs) => {
        capturedDoc = {
          _id: new mongoose.Types.ObjectId(),
          ...docs[0],
        };
        return Promise.resolve([capturedDoc]);
      });

      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(),
            serviceId: { name: mockServiceB.name, durationMinutes: 45 },
            staffId: { name: mockStaffB.name, email: mockStaffB.email },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/appointments')
        .set('Cookie', [`${env.COOKIE_NAME}=${tokenAdminB}`])
        .send({
          serviceId: serviceB_Id.toString(),
          staffId: staffB_Id.toString(),
          date: FUTURE_MONDAY,
          startTime: '10:00',
          customerName: 'Kolkata Customer',
          customerEmail: 'kolkata@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.localStartTime).toBe('10:00');
      expect(res.body.data.localEndTime).toBe('10:45'); // 45 min duration
      // 10:00 AM IST (UTC+5:30) is 04:30 AM UTC
      expect(capturedDoc.startTime.toISOString()).toBe('2026-10-12T04:30:00.000Z');
      expect(capturedDoc.endTime.toISOString()).toBe('2026-10-12T05:15:00.000Z');
    });
  });
});
