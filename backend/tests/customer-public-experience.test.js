import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import Business from '../src/models/business.model.js';
import Service from '../src/models/service.model.js';
import Staff from '../src/models/staff.model.js';
import Availability from '../src/models/availability.model.js';
import BlockedDate from '../src/models/blockedDate.model.js';
import Appointment from '../src/models/appointment.model.js';
import { env } from '../src/config/env.js';

describe('Phase 8: Customer Experience & Public Scheduling', () => {
  let businessA_Id;
  let businessB_Id;
  let serviceA_Id;
  let serviceA2_Id;
  let serviceB_Id;
  let staffA_Id;
  let staffB_Id;

  let mockBusinessA;
  let mockBusinessB;
  let mockServiceA;
  let mockServiceA2_Inactive;
  let mockServiceB;
  let mockStaffA;
  let mockStaffB;

  const FUTURE_DATE = '2026-10-12'; // Monday

  beforeEach(() => {
    vi.restoreAllMocks();

    businessA_Id = new mongoose.Types.ObjectId();
    businessB_Id = new mongoose.Types.ObjectId();
    serviceA_Id = new mongoose.Types.ObjectId();
    serviceA2_Id = new mongoose.Types.ObjectId();
    serviceB_Id = new mongoose.Types.ObjectId();
    staffA_Id = new mongoose.Types.ObjectId();
    staffB_Id = new mongoose.Types.ObjectId();

    mockBusinessA = {
      _id: businessA_Id,
      name: 'Urban Wellness Studio',
      slug: 'urban-wellness-studio',
      contactEmail: 'contact@urbanwellness.slotify.dev',
      contactPhone: '+91-9876543210',
      address: '104 MG Road, Bengaluru',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    };

    mockBusinessB = {
      _id: businessB_Id,
      name: 'TechFix Services',
      slug: 'techfix-services',
      contactEmail: 'support@techfix.slotify.dev',
      contactPhone: '+1-415-555-0199',
      address: '500 Market St, San Francisco',
      timezone: 'America/Los_Angeles',
      status: 'ACTIVE',
    };

    mockServiceA = {
      _id: serviceA_Id,
      name: 'Swedish Massage',
      description: 'Relaxing 60m session',
      durationMinutes: 60,
      businessId: businessA_Id,
      status: 'ACTIVE',
    };

    mockServiceA2_Inactive = {
      _id: serviceA2_Id,
      name: 'Seasonal Herbal Bath',
      description: 'Inactive seasonal service',
      durationMinutes: 45,
      businessId: businessA_Id,
      status: 'INACTIVE',
    };

    mockServiceB = {
      _id: serviceB_Id,
      name: 'Laptop Diagnostic',
      description: '30m hardware check',
      durationMinutes: 30,
      businessId: businessB_Id,
      status: 'ACTIVE',
    };

    mockStaffA = {
      _id: staffA_Id,
      name: 'Alice Therapist',
      email: 'private.alice@urbanwellness.com', // Private field
      phone: '+91-9999999999', // Private field
      businessId: businessA_Id,
      status: 'ACTIVE',
      serviceIds: [serviceA_Id],
    };

    mockStaffB = {
      _id: staffB_Id,
      name: 'Bob Technician',
      email: 'private.bob@techfix.com',
      phone: '+1-555-0222',
      businessId: businessB_Id,
      status: 'ACTIVE',
      serviceIds: [serviceB_Id],
    };

    // Default Business findOne mock
    vi.spyOn(Business, 'findOne').mockImplementation((query) => {
      if (query.slug === 'urban-wellness-studio') return Promise.resolve(mockBusinessA);
      if (query.slug === 'techfix-services') return Promise.resolve(mockBusinessB);
      return Promise.resolve(null);
    });

    vi.spyOn(Business, 'findById').mockImplementation((id) => {
      if (id?.toString() === businessA_Id.toString()) return Promise.resolve(mockBusinessA);
      if (id?.toString() === businessB_Id.toString()) return Promise.resolve(mockBusinessB);
      return Promise.resolve(null);
    });
  });

  describe('1. Public Business Lookup & Data Leakage Protection (Requirements A to G)', () => {
    it('A & B: should successfully look up public business by slug', async () => {
      vi.spyOn(Service, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue([mockServiceA]),
        }),
      });

      const res = await request(app).get('/api/public/businesses/urban-wellness-studio');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Urban Wellness Studio');
      expect(res.body.data.slug).toBe('urban-wellness-studio');
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.services).toHaveLength(1);
      expect(res.body.data.services[0].name).toBe('Swedish Massage');
    });

    it('C: should return 404 for nonexistent business slug', async () => {
      const res = await request(app).get('/api/public/businesses/non-existent-slug');

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('D: should indicate disabled status when business is DISABLED', async () => {
      vi.spyOn(Business, 'findOne').mockResolvedValue({
        ...mockBusinessA,
        status: 'DISABLED',
      });
      vi.spyOn(Service, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue([]),
        }),
      });

      const res = await request(app).get('/api/public/businesses/urban-wellness-studio');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DISABLED');
      expect(res.body.data.isBookingDisabled).toBe(true);
    });

    it('E: should not leak private admin, passwords, or internal security fields in public response', async () => {
      vi.spyOn(Service, 'find').mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue([mockServiceA]),
        }),
      });

      const res = await request(app).get('/api/public/businesses/urban-wellness-studio');

      expect(res.status).toBe(200);
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.adminPassword).toBeUndefined();
      expect(res.body.data.adminEmail).toBeUndefined();
      expect(res.body.data.__v).toBeUndefined();
    });

    it('F & G: should only return active services and reject inactive services', async () => {
      // Service.find called with status: 'ACTIVE'
      const selectSpy = vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockServiceA]),
      });
      const findSpy = vi.spyOn(Service, 'find').mockReturnValue({ select: selectSpy });

      const res = await request(app).get('/api/public/businesses/urban-wellness-studio');

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: businessA_Id,
          status: 'ACTIVE',
        })
      );
      expect(res.body.data.services.some((s) => s.name === 'Seasonal Herbal Bath')).toBe(false);
    });
  });

  describe('2. Public Slot Discovery (Requirements H & I)', () => {
    it('H & I: should calculate available slots using the business timezone', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);
      vi.spyOn(Staff, 'find').mockResolvedValue([mockStaffA]);
      vi.spyOn(BlockedDate, 'find').mockResolvedValue([]);

      // Monday availability window 09:00 - 12:00
      vi.spyOn(Availability, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            businessId: businessA_Id,
            staffId: staffA_Id,
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '12:00',
            isActive: true,
          },
        ]),
      });

      vi.spyOn(Appointment, 'find').mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/public/businesses/urban-wellness-studio/slots?serviceId=${serviceA_Id}&date=${FUTURE_DATE}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.slotsCount).toBeGreaterThan(0);
      expect(res.body.data.slots[0].localStartTime).toBe('09:00');
    });

    it('should return empty slots when business is DISABLED', async () => {
      vi.spyOn(Business, 'findOne').mockResolvedValue({
        ...mockBusinessA,
        status: 'DISABLED',
      });

      const res = await request(app)
        .get(`/api/public/businesses/urban-wellness-studio/slots?serviceId=${serviceA_Id}&date=${FUTURE_DATE}`);

      expect(res.status).toBe(200);
      expect(res.body.data.slotsCount).toBe(0);
      expect(res.body.data.isBookingDisabled).toBe(true);
    });
  });

  describe('3. Public Booking Engine Reusability & Validations (Requirements J to S, AB, AC)', () => {
    it('J & T: should successfully book appointment and return signed customerToken', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA);
      vi.spyOn(Staff, 'find').mockResolvedValue([mockStaffA]);
      vi.spyOn(BlockedDate, 'find').mockResolvedValue([]);
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

      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);

      const createdApptId = new mongoose.Types.ObjectId();
      const mockCreated = {
        _id: createdApptId,
        businessId: businessA_Id,
        serviceId: serviceA_Id,
        staffId: staffA_Id,
        customerName: 'Sarah Connor',
        customerEmail: 'sarah@example.com',
        customerPhone: '+1-555-0199',
        startTime: new Date('2026-10-12T04:30:00.000Z'),
        endTime: new Date('2026-10-12T05:30:00.000Z'),
        status: 'CONFIRMED',
      };

      vi.spyOn(Appointment, 'create').mockResolvedValue([mockCreated]);
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue({
            ...mockCreated,
            serviceId: { name: mockServiceA.name, durationMinutes: 60 },
            staffId: { name: mockStaffA.name },
          }),
        }),
      });

      const res = await request(app)
        .post('/api/public/businesses/urban-wellness-studio/appointments')
        .send({
          serviceId: serviceA_Id.toString(),
          date: FUTURE_DATE,
          startTime: '10:00',
          customerName: 'Sarah Connor',
          customerEmail: 'sarah@example.com',
          customerPhone: '+1-555-0199',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerToken).toBeDefined();
      expect(res.body.data.appointment.customerName).toBe('Sarah Connor');
      expect(res.body.data.appointment.serviceName).toBe('Swedish Massage');
      expect(res.body.data.appointment.durationMinutes).toBe(60);

      // Verify customer token signature and payload
      const decoded = jwt.verify(res.body.data.customerToken, env.JWT_SECRET);
      expect(decoded.type).toBe('CUSTOMER_APPOINTMENT_ACCESS');
      expect(decoded.appointmentId).toBe(createdApptId.toString());
      expect(decoded.customerEmail).toBe('sarah@example.com');
    });

    it('K: should reject invalid service ID format', async () => {
      const res = await request(app)
        .post('/api/public/businesses/urban-wellness-studio/appointments')
        .send({
          serviceId: 'malformed-id',
          date: FUTURE_DATE,
          startTime: '10:00',
          customerName: 'Sarah Connor',
          customerEmail: 'sarah@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Service ID must be a valid 24-character ObjectId/);
    });

    it('L: should reject service from another business (tenant boundary check)', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceB); // Belongs to TechFix

      const res = await request(app)
        .post('/api/public/businesses/urban-wellness-studio/appointments')
        .send({
          serviceId: serviceB_Id.toString(),
          date: FUTURE_DATE,
          startTime: '10:00',
          customerName: 'Sarah Connor',
          customerEmail: 'sarah@example.com',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/does not belong to the selected business/);
    });

    it('N: should reject appointment booking when business is DISABLED', async () => {
      vi.spyOn(Business, 'findOne').mockResolvedValue({
        ...mockBusinessA,
        status: 'DISABLED',
      });

      const res = await request(app)
        .post('/api/public/businesses/urban-wellness-studio/appointments')
        .send({
          serviceId: serviceA_Id.toString(),
          date: FUTURE_DATE,
          startTime: '10:00',
          customerName: 'Sarah Connor',
          customerEmail: 'sarah@example.com',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/unavailable for bookings/);
    });

    it('O: should reject booking dates in the past', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/public/businesses/urban-wellness-studio/appointments')
        .send({
          serviceId: serviceA_Id.toString(),
          date: '2020-01-01',
          startTime: '10:00',
          customerName: 'Sarah Connor',
          customerEmail: 'sarah@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot book an appointment in the past/);
    });

    it('Q: should reject booking on blocked dates with 409 Conflict', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(BlockedDate, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        businessId: businessA_Id,
        staffId: null,
        reason: 'National Holiday',
      });

      const res = await request(app)
        .post('/api/public/businesses/urban-wellness-studio/appointments')
        .send({
          serviceId: serviceA_Id.toString(),
          date: FUTURE_DATE,
          startTime: '10:00',
          customerName: 'Sarah Connor',
          customerEmail: 'sarah@example.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/The business is closed on/);
    });

    it('R & S: should return 409 Conflict for overlapping or stale slot', async () => {
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

      // Existing conflicting active appointment
      vi.spyOn(Appointment, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post('/api/public/businesses/urban-wellness-studio/appointments')
        .send({
          serviceId: serviceA_Id.toString(),
          staffId: staffA_Id.toString(),
          date: FUTURE_DATE,
          startTime: '10:00',
          customerName: 'Sarah Connor',
          customerEmail: 'sarah@example.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Selected time slot is no longer available/);
    });

    it('AB: should reject invalid customer email or non-15m interval in booking form', async () => {
      const res = await request(app)
        .post('/api/public/businesses/urban-wellness-studio/appointments')
        .send({
          serviceId: serviceA_Id.toString(),
          date: FUTURE_DATE,
          startTime: '10:07', // Not aligned to 15m
          customerName: 'S', // Too short
          customerEmail: 'not-an-email',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Secure Customer Appointment Access & Anti-IDOR (Requirements U to W)', () => {
    let apptId;
    let validToken;

    beforeEach(() => {
      apptId = new mongoose.Types.ObjectId();
      validToken = jwt.sign(
        {
          appointmentId: apptId.toString(),
          customerEmail: 'sarah@example.com',
          businessId: businessA_Id.toString(),
          type: 'CUSTOMER_APPOINTMENT_ACCESS',
        },
        env.JWT_SECRET,
        { expiresIn: '30d' }
      );
    });

    it('U: should allow customer to view their own appointment with valid token', async () => {
      const mockPopulated = {
        _id: apptId,
        businessId: mockBusinessA,
        serviceId: { name: 'Swedish Massage', durationMinutes: 60, price: 80 },
        staffId: { name: 'Alice Therapist' },
        customerName: 'Sarah Connor',
        customerEmail: 'sarah@example.com',
        customerPhone: '+1-555-0199',
        startTime: new Date('2026-10-12T04:30:00.000Z'),
        endTime: new Date('2026-10-12T05:30:00.000Z'),
        status: 'CONFIRMED',
      };

      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue(mockPopulated),
          }),
        }),
      });

      const res = await request(app).get(`/api/public/appointments/${apptId}?token=${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBe('Sarah Connor');
      expect(res.body.data.business.name).toBe('Urban Wellness Studio');
      expect(res.body.data.service.name).toBe('Swedish Massage');
    });

    it('V: should reject access when customer token belongs to a different appointment (Anti-IDOR)', async () => {
      const otherApptId = new mongoose.Types.ObjectId();
      const foreignToken = jwt.sign(
        {
          appointmentId: otherApptId.toString(),
          customerEmail: 'attacker@example.com',
          businessId: businessA_Id.toString(),
          type: 'CUSTOMER_APPOINTMENT_ACCESS',
        },
        env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      const res = await request(app).get(`/api/public/appointments/${apptId}?token=${foreignToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission to view or manage/);
    });

    it('W: should reject access when token is missing or tampered', async () => {
      const res = await request(app).get(`/api/public/appointments/${apptId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/access token is required/);

      const tamperedRes = await request(app).get(`/api/public/appointments/${apptId}?token=invalid.jwt.token`);

      expect(tamperedRes.status).toBe(403);
      expect(tamperedRes.body.message).toMatch(/Invalid or expired/);
    });
  });

  describe('5. Customer Cancellation & Slot Release (Requirements X to AA)', () => {
    let apptId;
    let validToken;

    beforeEach(() => {
      apptId = new mongoose.Types.ObjectId();
      validToken = jwt.sign(
        {
          appointmentId: apptId.toString(),
          customerEmail: 'sarah@example.com',
          businessId: businessA_Id.toString(),
          type: 'CUSTOMER_APPOINTMENT_ACCESS',
        },
        env.JWT_SECRET,
        { expiresIn: '30d' }
      );
    });

    it('X & AA: should cancel appointment with valid token and update status to CANCELLED', async () => {
      const mockAppt = {
        _id: apptId,
        businessId: businessA_Id,
        customerEmail: 'sarah@example.com',
        status: 'CONFIRMED',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Appointment, 'findById')
        .mockResolvedValueOnce(mockAppt) // for lookup
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              populate: vi.fn().mockResolvedValue({
                ...mockAppt,
                status: 'CANCELLED',
                businessId: mockBusinessA,
                serviceId: { name: 'Swedish Massage' },
                staffId: { name: 'Alice Therapist' },
              }),
            }),
          }),
        });

      const res = await request(app)
        .patch(`/api/public/appointments/${apptId}/cancel`)
        .send({ token: validToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(mockAppt.save).toHaveBeenCalled();
    });

    it('Y & Z: should reject cancellation attempt using token for another appointment or tenant', async () => {
      const foreignToken = jwt.sign(
        {
          appointmentId: new mongoose.Types.ObjectId().toString(),
          customerEmail: 'attacker@example.com',
          businessId: businessB_Id.toString(), // Business B
          type: 'CUSTOMER_APPOINTMENT_ACCESS',
        },
        env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      const res = await request(app)
        .patch(`/api/public/appointments/${apptId}/cancel`)
        .send({ token: foreignToken });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission to view or manage/);
    });
  });
});
