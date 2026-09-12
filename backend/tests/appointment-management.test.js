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

describe('Phase 9: Business Admin Appointment Management & Calendar', () => {
  let businessA_Id;
  let businessB_Id;
  let adminA_Id;
  let adminB_Id;
  let systemOwnerId;

  let serviceA_Id;
  let serviceA2_Id;
  let serviceB_Id;
  let staffA1_Id;
  let staffA2_Id;
  let staffB_Id;

  let apptA1_Id;
  let apptA2_Id;
  let apptB1_Id;

  let mockBusinessA;
  let mockBusinessB;
  let mockAdminA;
  let mockAdminB;
  let mockSystemOwner;

  let tokenAdminA;
  let tokenAdminB;
  let tokenSystemOwner;

  let mockApptA1;
  let mockApptA2;
  let mockApptB1;

  beforeEach(() => {
    vi.restoreAllMocks();

    businessA_Id = new mongoose.Types.ObjectId();
    businessB_Id = new mongoose.Types.ObjectId();
    adminA_Id = new mongoose.Types.ObjectId();
    adminB_Id = new mongoose.Types.ObjectId();
    systemOwnerId = new mongoose.Types.ObjectId();

    serviceA_Id = new mongoose.Types.ObjectId();
    serviceA2_Id = new mongoose.Types.ObjectId();
    serviceB_Id = new mongoose.Types.ObjectId();
    staffA1_Id = new mongoose.Types.ObjectId();
    staffA2_Id = new mongoose.Types.ObjectId();
    staffB_Id = new mongoose.Types.ObjectId();

    apptA1_Id = new mongoose.Types.ObjectId();
    apptA2_Id = new mongoose.Types.ObjectId();
    apptB1_Id = new mongoose.Types.ObjectId();

    mockBusinessA = {
      _id: businessA_Id,
      name: 'Urban Wellness Studio',
      slug: 'urban-wellness-studio',
      timezone: 'America/New_York',
      status: 'ACTIVE',
    };

    mockBusinessB = {
      _id: businessB_Id,
      name: 'TechFix Services',
      slug: 'techfix-services',
      timezone: 'Asia/Kolkata',
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

    mockApptA1 = {
      _id: apptA1_Id,
      businessId: businessA_Id,
      serviceId: {
        _id: serviceA_Id,
        name: 'Holistic Massage',
        durationMinutes: 60,
        price: 90,
      },
      staffId: {
        _id: staffA1_Id,
        name: 'Sarah Connor',
        email: 'sarah@urbanwellness.slotify.dev',
        phone: '+1-555-0101',
      },
      customerName: 'Alice Walker',
      customerEmail: 'alice@example.com',
      customerPhone: '+1-555-0111',
      startTime: new Date('2026-10-15T14:00:00Z'), // 10:00 AM EDT
      endTime: new Date('2026-10-15T15:00:00Z'),   // 11:00 AM EDT
      status: 'CONFIRMED',
      notes: 'First time visit',
      save: vi.fn().mockResolvedValue(true),
    };

    mockApptA2 = {
      _id: apptA2_Id,
      businessId: businessA_Id,
      serviceId: {
        _id: serviceA2_Id,
        name: 'Aromatherapy',
        durationMinutes: 45,
        price: 75,
      },
      staffId: {
        _id: staffA2_Id,
        name: 'John Doe',
        email: 'john@urbanwellness.slotify.dev',
        phone: '+1-555-0102',
      },
      customerName: 'Bob Smith',
      customerEmail: 'bob@example.com',
      customerPhone: '+1-555-0222',
      startTime: new Date('2026-10-16T15:00:00Z'),
      endTime: new Date('2026-10-16T15:45:00Z'),
      status: 'COMPLETED',
      notes: 'Returning client',
      save: vi.fn().mockResolvedValue(true),
    };

    mockApptB1 = {
      _id: apptB1_Id,
      businessId: businessB_Id,
      serviceId: {
        _id: serviceB_Id,
        name: 'Screen Repair',
        durationMinutes: 30,
        price: 120,
      },
      staffId: {
        _id: staffB_Id,
        name: 'Tech Specialist',
        email: 'tech@techfix.slotify.dev',
      },
      customerName: 'Charlie Brown',
      customerEmail: 'charlie@example.com',
      customerPhone: '+1-555-0333',
      startTime: new Date('2026-10-15T09:00:00Z'),
      endTime: new Date('2026-10-15T09:30:00Z'),
      status: 'CONFIRMED',
      save: vi.fn().mockResolvedValue(true),
    };

    // Mock User findById
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

  const createMockQuery = (result) => ({
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve) => resolve(result),
  });

  // ==========================================
  // REQUIREMENT A & B: Tenant Appointment Listing
  // ==========================================
  describe('A & B: Appointment Listing & Tenant Scoping', () => {
    it('A. should allow Business Admin to list own appointments', async () => {
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(2);
      vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1, mockApptA2]));

      const res = await request(app)
        .get('/api/appointments')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.total).toBe(2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].customerName).toBe('Alice Walker');
    });

    it('B. should enforce tenant scoping: Admin A query cannot list Business B appointments', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      await request(app)
        .get('/api/appointments')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      // Verify the query sent to MongoDB explicitly uses adminA's businessId
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ businessId: expect.anything() })
      );
    });
  });


  // ==========================================
  // REQUIREMENT C & D: Appointment Details & Anti-IDOR
  // ==========================================
  describe('C & D: Appointment Details Retrieval & Anti-IDOR', () => {
    it('C. should allow Business Admin to retrieve own appointment by ID', async () => {
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        then: (resolve) => resolve(mockApptA1),
      });

      const res = await request(app)
        .get(`/api/appointments/${apptA1_Id}`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBe('Alice Walker');
      expect(res.body.data.customerToken).toBeUndefined(); // Security: no token exposed
    });

    it('D. should reject cross-tenant retrieval with 403 Forbidden', async () => {
      vi.spyOn(Appointment, 'findById').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        then: (resolve) => resolve(mockApptB1),
      });

      const res = await request(app)
        .get(`/api/appointments/${apptB1_Id}`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/permission/i);
    });
  });

  // ==========================================
  // REQUIREMENTS E, F, G, H: Filtering
  // ==========================================
  describe('E–H: Appointment Filtering', () => {
    it('E. should filter appointments by status', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/appointments?status=CONFIRMED')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONFIRMED' })
      );
    });

    it('F. should filter appointments by staffId', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/appointments?staffId=${staffA1_Id}`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: staffA1_Id.toString() })
      );
    });

    it('G. should filter appointments by serviceId', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/appointments?serviceId=${serviceA_Id}`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ serviceId: serviceA_Id.toString() })
      );
    });

    it('H. should filter appointments by bounded date range (startDate & endDate)', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/appointments?startDate=2026-10-01&endDate=2026-10-31')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: expect.objectContaining({
            $gte: expect.any(Date),
            $lt: expect.any(Date),
          }),
        })
      );
    });
  });

  // ==========================================
  // REQUIREMENTS I, J, K: Search
  // ==========================================
  describe('I–K: Customer Search', () => {
    it('I. should search appointments by customer name', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/appointments?search=alice')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ customerName: expect.any(RegExp) }),
          ]),
        })
      );
    });

    it('J. should search appointments by customer email', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/appointments?search=alice@example.com')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ customerEmail: expect.any(RegExp) }),
          ]),
        })
      );
    });

    it('K. should search appointments by customer phone', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/appointments?search=0111')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalled();
    });
  });


  // ==========================================
  // REQUIREMENTS L & M: Input Validation
  // ==========================================
  describe('L & M: Validation Guardrails', () => {
    it('L. should reject malformed appointment ObjectId with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/appointments/not-a-valid-id')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid appointment id/i);
    });

    it('M. should reject invalid status with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${apptA1_Id}/status`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`])
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // REQUIREMENTS N, O, P, Q: Lifecycle Status Transitions
  // ==========================================
  describe('N–Q: Status Lifecycle Management', () => {
    it('N. should transition CONFIRMED -> COMPLETED successfully', async () => {
      vi.spyOn(Appointment, 'findById')
        .mockResolvedValueOnce(mockApptA1) // initial find
        .mockReturnValueOnce({            // populated return
          populate: vi.fn().mockReturnThis(),
          then: (resolve) => resolve({ ...mockApptA1, status: 'COMPLETED' }),
        });

      const res = await request(app)
        .patch(`/api/appointments/${apptA1_Id}/status`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`])
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockApptA1.status).toBe('COMPLETED');
      expect(mockApptA1.save).toHaveBeenCalled();
    });

    it('O. should transition CONFIRMED -> CANCELLED via status endpoint', async () => {
      vi.spyOn(Appointment, 'findById')
        .mockResolvedValueOnce(mockApptA1)
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnThis(),
          then: (resolve) => resolve({ ...mockApptA1, status: 'CANCELLED' }),
        });

      const res = await request(app)
        .patch(`/api/appointments/${apptA1_Id}/status`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`])
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockApptA1.status).toBe('CANCELLED');
    });

    it('P. should transition CONFIRMED -> NO_SHOW successfully', async () => {
      vi.spyOn(Appointment, 'findById')
        .mockResolvedValueOnce(mockApptA1)
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnThis(),
          then: (resolve) => resolve({ ...mockApptA1, status: 'NO_SHOW' }),
        });

      const res = await request(app)
        .patch(`/api/appointments/${apptA1_Id}/status`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`])
        .send({ status: 'NO_SHOW' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockApptA1.status).toBe('NO_SHOW');
    });

    it('Q. should reject invalid status transition from terminal state (COMPLETED -> CONFIRMED)', async () => {
      vi.spyOn(Appointment, 'findById').mockResolvedValue(mockApptA2); // mockApptA2 is COMPLETED

      const res = await request(app)
        .patch(`/api/appointments/${apptA2_Id}/status`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`])
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot change status of a completed appointment/i);
    });

    it('Q2. should reject invalid status transition from terminal state (CANCELLED -> COMPLETED)', async () => {
      const cancelledAppt = {
        ...mockApptA1,
        status: 'CANCELLED',
      };
      vi.spyOn(Appointment, 'findById').mockResolvedValue(cancelledAppt);

      const res = await request(app)
        .patch(`/api/appointments/${apptA1_Id}/status`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`])
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot change status of a cancelled appointment/i);
    });
  });

  // ==========================================
  // REQUIREMENTS R & S: Cross-Tenant Mutation Security
  // ==========================================
  describe('R & S: Cross-Tenant Mutations', () => {
    it('R. should reject cross-tenant status update with 403 Forbidden', async () => {
      vi.spyOn(Appointment, 'findById').mockResolvedValue(mockApptB1);

      const res = await request(app)
        .patch(`/api/appointments/${apptB1_Id}/status`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`])
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/permission/i);
    });

    it('S. should reject cross-tenant cancellation with 403 Forbidden', async () => {
      vi.spyOn(Appointment, 'findById').mockResolvedValue(mockApptB1);

      const res = await request(app)
        .patch(`/api/appointments/${apptB1_Id}/cancel`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/permission/i);
    });
  });

  // ==========================================
  // REQUIREMENTS T, U, V: Historical Record & Slot Behavior
  // ==========================================
  describe('T–V: Historical Record & Slot Release Behavior', () => {
    it('T. should verify cancelled appointment preserves document in database (no deletion)', async () => {
      const deleteSpy = vi.spyOn(Appointment, 'findByIdAndDelete');
      vi.spyOn(Appointment, 'findById')
        .mockResolvedValueOnce(mockApptA1)
        .mockReturnValueOnce({
          populate: vi.fn().mockReturnThis(),
          then: (resolve) => resolve({ ...mockApptA1, status: 'CANCELLED' }),
        });

      const res = await request(app)
        .patch(`/api/appointments/${apptA1_Id}/cancel`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(mockApptA1.status).toBe('CANCELLED');
    });

    it('U. should ensure completed appointments remain historical and cannot be cancelled', async () => {
      vi.spyOn(Appointment, 'findById').mockResolvedValue(mockApptA2); // status: COMPLETED

      const res = await request(app)
        .patch(`/api/appointments/${apptA2_Id}/cancel`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot change status of a completed appointment/i);
    });

    it('V. should ensure no-show appointments remain historical and cannot be marked completed', async () => {
      const noShowAppt = {
        ...mockApptA1,
        status: 'NO_SHOW',
      };
      vi.spyOn(Appointment, 'findById').mockResolvedValue(noShowAppt);

      const res = await request(app)
        .patch(`/api/appointments/${apptA1_Id}/status`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`])
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot change status of a no-show appointment/i);
    });
  });

  // ==========================================
  // REQUIREMENTS W, X, Y, Z, AA: Security & Calendar
  // ==========================================
  describe('W–AA: Calendar & Security Rules', () => {
    it('W. should return only tenant appointments for calendar date range queries', async () => {
      const findSpy = vi.spyOn(Appointment, 'find').mockReturnValue(createMockQuery([mockApptA1]));
      vi.spyOn(Appointment, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/appointments?startDate=2026-10-01&endDate=2026-10-31')
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ businessId: expect.anything() })
      );
    });


    it('X. should reject excessively large calendar date ranges (> 62 days)', async () => {
      const res = await request(app)
        .get('/api/appointments?startDate=2026-01-01&endDate=2026-04-01') // 90 days
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/62 days/i);
    });

    it('Y. should reject unauthenticated access with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/appointments');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Z. should reject System Owner from Business Admin appointments endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Cookie', [`slotify_token=${tokenSystemOwner}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('AA. should prevent Business Admin from spoofing businessId in query parameters', async () => {
      const res = await request(app)
        .get(`/api/appointments?businessId=${businessB_Id}`)
        .set('Cookie', [`slotify_token=${tokenAdminA}`]);

      // requireBusinessAccess middleware rejects conflicting businessId in query with 403
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
