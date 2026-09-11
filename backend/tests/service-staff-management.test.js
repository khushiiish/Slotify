import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Business from '../src/models/business.model.js';
import Service from '../src/models/service.model.js';
import Staff from '../src/models/staff.model.js';
import Appointment from '../src/models/appointment.model.js';
import Availability from '../src/models/availability.model.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';

describe('Phase 5: Business Admin Service & Staff Management', () => {
  let businessA_Id;
  let businessB_Id;
  let adminA_Id;
  let adminB_Id;
  let systemOwnerId;
  let disabledBizId;
  let adminWithDisabledBizId;

  let mockBusinessA;
  let mockBusinessB;
  let mockDisabledBiz;

  let mockSystemOwner;
  let mockAdminA;
  let mockAdminB;
  let mockAdminWithDisabledBiz;

  let tokenSystemOwner;
  let tokenAdminA;
  let tokenAdminB;
  let tokenAdminWithDisabledBiz;

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
    disabledBizId = new mongoose.Types.ObjectId();

    adminA_Id = new mongoose.Types.ObjectId();
    adminB_Id = new mongoose.Types.ObjectId();
    systemOwnerId = new mongoose.Types.ObjectId();
    adminWithDisabledBizId = new mongoose.Types.ObjectId();

    serviceA_Id = new mongoose.Types.ObjectId();
    serviceB_Id = new mongoose.Types.ObjectId();

    staffA_Id = new mongoose.Types.ObjectId();
    staffB_Id = new mongoose.Types.ObjectId();

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
      slug: 'disabled-business',
      status: 'DISABLED',
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

    mockAdminWithDisabledBiz = {
      _id: adminWithDisabledBizId,
      name: 'Disabled Admin',
      email: 'admin@disabled.com',
      role: 'BUSINESS_ADMIN',
      businessId: disabledBizId,
      status: 'ACTIVE',
    };

    mockServiceA = {
      _id: serviceA_Id,
      name: 'Alpha Haircut',
      description: 'Standard Alpha Haircut',
      durationMinutes: 45,
      businessId: businessA_Id,
      status: 'ACTIVE',
      save: vi.fn().mockResolvedValue(true),
    };

    mockServiceB = {
      _id: serviceB_Id,
      name: 'Beta Tire Alignment',
      description: 'Standard Beta Alignment',
      durationMinutes: 60,
      businessId: businessB_Id,
      status: 'ACTIVE',
      save: vi.fn().mockResolvedValue(true),
    };

    mockStaffA = {
      _id: staffA_Id,
      name: 'Alice Alpha',
      email: 'alice@alpha.com',
      phone: '+1-555-0101',
      businessId: businessA_Id,
      status: 'ACTIVE',
      serviceIds: [serviceA_Id],
      save: vi.fn().mockResolvedValue(true),
      populate: vi.fn().mockResolvedValue({
        _id: staffA_Id,
        name: 'Alice Alpha',
        email: 'alice@alpha.com',
        phone: '+1-555-0101',
        businessId: businessA_Id,
        status: 'ACTIVE',
        serviceIds: [mockServiceA],
      }),
    };

    mockStaffB = {
      _id: staffB_Id,
      name: 'Bob Beta',
      email: 'bob@beta.com',
      phone: '+1-555-0202',
      businessId: businessB_Id,
      status: 'ACTIVE',
      serviceIds: [serviceB_Id],
      save: vi.fn().mockResolvedValue(true),
      populate: vi.fn().mockResolvedValue({
        _id: staffB_Id,
        name: 'Bob Beta',
        email: 'bob@beta.com',
        phone: '+1-555-0202',
        businessId: businessB_Id,
        status: 'ACTIVE',
        serviceIds: [mockServiceB],
      }),
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

    tokenAdminWithDisabledBiz = generateAccessToken({
      userId: adminWithDisabledBizId.toString(),
      role: 'BUSINESS_ADMIN',
      businessId: disabledBizId.toString(),
    });

    // Default User/Business lookups for authenticate middleware
    vi.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === systemOwnerId.toString()) return Promise.resolve(mockSystemOwner);
      if (idStr === adminA_Id.toString()) return Promise.resolve(mockAdminA);
      if (idStr === adminB_Id.toString()) return Promise.resolve(mockAdminB);
      if (idStr === adminWithDisabledBizId.toString()) return Promise.resolve(mockAdminWithDisabledBiz);
      return Promise.resolve(null);
    });

    vi.spyOn(Business, 'findById').mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === businessA_Id.toString()) return Promise.resolve(mockBusinessA);
      if (idStr === businessB_Id.toString()) return Promise.resolve(mockBusinessB);
      if (idStr === disabledBizId.toString()) return Promise.resolve(mockDisabledBiz);
      return Promise.resolve(null);
    });
  });

  // =========================================================================
  // 1. Service Management Tests (1 to 12)
  // =========================================================================
  describe('Service Management (POST, GET, PATCH, DELETE /api/services)', () => {
    it('1. Admin A can create a service', async () => {
      vi.spyOn(Service, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        name: 'Deluxe Facial',
        description: 'Soothing organic facial',
        durationMinutes: 60,
        businessId: businessA_Id,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/services')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Deluxe Facial',
          description: 'Soothing organic facial',
          durationMinutes: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service.name).toBe('Deluxe Facial');
      expect(res.body.data.service.durationMinutes).toBe(60);
    });

    it('2. Admin A can list only Business A services', async () => {
      vi.spyOn(Service, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockServiceA]),
      });

      const res = await request(app)
        .get('/api/services')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.services).toHaveLength(1);
      expect(res.body.data.services[0].name).toBe('Alpha Haircut');
      expect(Service.find.mock.calls[0][0].businessId.toString()).toBe(businessA_Id.toString());
    });

    it('3. Admin A can read Business A service', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);

      const res = await request(app)
        .get(`/api/services/${serviceA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service.name).toBe('Alpha Haircut');
    });

    it('4. Admin A can update Business A service', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);

      const res = await request(app)
        .patch(`/api/services/${serviceA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Alpha Haircut & Beard Trim',
          durationMinutes: 50,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockServiceA.name).toBe('Alpha Haircut & Beard Trim');
      expect(mockServiceA.durationMinutes).toBe(50);
      expect(mockServiceA.save).toHaveBeenCalled();
    });

    it('5. Admin A can delete Business A service when no references exist', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);
      vi.spyOn(Staff, 'findOne').mockResolvedValue(null);
      vi.spyOn(Service, 'deleteOne').mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/api/services/${serviceA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
      expect(Service.deleteOne).toHaveBeenCalledWith({ _id: serviceA_Id });
    });

    it('6. Admin A cannot read Business B service', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceB);

      const res = await request(app)
        .get(`/api/services/${serviceB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not have permission to access resources belonging to another business');
    });

    it('7. Admin A cannot update Business B service', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceB);

      const res = await request(app)
        .patch(`/api/services/${serviceB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Hacked Service Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not have permission to access resources belonging to another business');
    });

    it('8. Admin A cannot delete Business B service', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceB);

      const res = await request(app)
        .delete(`/api/services/${serviceB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not have permission to access resources belonging to another business');
    });

    it('9. Admin A cannot create a service for Business B using businessId in request body', async () => {
      const res = await request(app)
        .post('/api/services')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Unauthorized Cross-Tenant Service',
          durationMinutes: 30,
          businessId: businessB_Id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not have permission to access resources belonging to another business');
    });

    it('10. Invalid service data returns 400', async () => {
      const res = await request(app)
        .post('/api/services')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: '', // Too short
          durationMinutes: -10, // Negative duration
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('11. Invalid service ID format is handled correctly (400 Bad Request)', async () => {
      const res = await request(app)
        .get('/api/services/invalid-object-id')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid service ID format');
    });

    it('12. Nonexistent service returns 404', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(null);
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/services/${nonExistentId}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Service not found');
    });
  });

  // =========================================================================
  // 2. Staff Management Tests (13 to 25)
  // =========================================================================
  describe('Staff Management (POST, GET, PATCH, DELETE /api/staff)', () => {
    it('13. Admin A can create staff', async () => {
      vi.spyOn(Service, 'find').mockResolvedValue([mockServiceA]);
      vi.spyOn(Staff, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        name: 'Maria Stylist',
        email: 'maria@alpha.com',
        phone: '+1-555-0105',
        businessId: businessA_Id,
        status: 'ACTIVE',
        serviceIds: [serviceA_Id],
        populate: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          name: 'Maria Stylist',
          email: 'maria@alpha.com',
          phone: '+1-555-0105',
          businessId: businessA_Id,
          status: 'ACTIVE',
          serviceIds: [mockServiceA],
        }),
      });

      const res = await request(app)
        .post('/api/staff')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Maria Stylist',
          email: 'maria@alpha.com',
          phone: '+1-555-0105',
          serviceIds: [serviceA_Id.toString()],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff.name).toBe('Maria Stylist');
      expect(res.body.data.staff.serviceIds).toHaveLength(1);
    });

    it('14. Admin A can list only Business A staff', async () => {
      vi.spyOn(Staff, 'find').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue([mockStaffA]),
        }),
      });

      const res = await request(app)
        .get('/api/staff')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff).toHaveLength(1);
      expect(res.body.data.staff[0].name).toBe('Alice Alpha');
      expect(Staff.find.mock.calls[0][0].businessId.toString()).toBe(businessA_Id.toString());
    });

    it('15. Admin A can read Business A staff', async () => {
      vi.spyOn(Staff, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockStaffA),
      });

      const res = await request(app)
        .get(`/api/staff/${staffA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff.name).toBe('Alice Alpha');
    });

    it('16. Admin A can update Business A staff', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA);

      const res = await request(app)
        .patch(`/api/staff/${staffA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Alice Senior Alpha',
          phone: '+1-555-9999',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockStaffA.name).toBe('Alice Senior Alpha');
      expect(mockStaffA.phone).toBe('+1-555-9999');
      expect(mockStaffA.save).toHaveBeenCalled();
    });

    it('17. Admin A can delete Business A staff where allowed', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA);
      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);
      vi.spyOn(Availability, 'findOne').mockResolvedValue(null);
      vi.spyOn(Staff, 'deleteOne').mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/api/staff/${staffA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
      expect(Staff.deleteOne).toHaveBeenCalledWith({ _id: staffA_Id });
    });

    it('18. Admin A cannot read Business B staff', async () => {
      vi.spyOn(Staff, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockStaffB),
      });

      const res = await request(app)
        .get(`/api/staff/${staffB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not have permission to access resources belonging to another business');
    });

    it('19. Admin A cannot update Business B staff', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffB);

      const res = await request(app)
        .patch(`/api/staff/${staffB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Hacked Staff Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not have permission to access resources belonging to another business');
    });

    it('20. Admin A cannot delete Business B staff', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffB);

      const res = await request(app)
        .delete(`/api/staff/${staffB_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not have permission to access resources belonging to another business');
    });

    it('21. Admin A cannot create Business B staff through request body manipulation', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Cross-Tenant Staff',
          businessId: businessB_Id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You do not have permission to access resources belonging to another business');
    });

    it('22. Invalid staff data returns 400', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: '', // Empty name
          email: 'invalid-email-format',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('23. Invalid staff ID handled correctly (400 Bad Request)', async () => {
      const res = await request(app)
        .get('/api/staff/not-a-valid-id')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid staff ID format');
    });

    it('24. Invalid service IDs rejected (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Valid Name',
          serviceIds: ['non-hex-id'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('25. Staff cannot be assigned a service belonging to another tenant', async () => {
      // Return Service B when queried
      vi.spyOn(Service, 'find').mockResolvedValue([mockServiceB]);

      const res = await request(app)
        .post('/api/staff')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`)
        .send({
          name: 'Alpha Staff Assigned Beta Service',
          serviceIds: [serviceB_Id.toString()],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Staff cannot be assigned a service belonging to another tenant');
    });
  });

  // =========================================================================
  // 3. Authorization & Lifecycle Tests (26 to 28)
  // =========================================================================
  describe('Authorization & Lifecycle Enforcement (26 to 28)', () => {
    it('26. Unauthenticated users cannot access service or staff management APIs', async () => {
      const resService = await request(app).get('/api/services');
      expect(resService.status).toBe(401);
      expect(resService.body.success).toBe(false);

      const resStaff = await request(app).get('/api/staff');
      expect(resStaff.status).toBe(401);
      expect(resStaff.body.success).toBe(false);
    });

    it('27. System Owner cannot access Business Admin tenant CRUD APIs', async () => {
      const resService = await request(app)
        .get('/api/services')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(resService.status).toBe(403);
      expect(resService.body.success).toBe(false);

      const resStaff = await request(app)
        .get('/api/staff')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenSystemOwner}`);

      expect(resStaff.status).toBe(403);
      expect(resStaff.body.success).toBe(false);
    });

    it('28. Disabled Business Admin remains blocked by existing lifecycle enforcement', async () => {
      const res = await request(app)
        .get('/api/services')
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminWithDisabledBiz}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Business account is disabled');
    });
  });

  // =========================================================================
  // 4. Safe Deletion & Reference Integrity Checks (29 to 31)
  // =========================================================================
  describe('Safe Deletion & Reference Integrity (29 to 31)', () => {
    it('29. Admin cannot delete a service referenced by existing appointments', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Appointment, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        serviceId: serviceA_Id,
      });

      const res = await request(app)
        .delete(`/api/services/${serviceA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('referenced by existing appointments');
    });

    it('30. Admin cannot delete a service assigned to staff members', async () => {
      vi.spyOn(Service, 'findById').mockResolvedValue(mockServiceA);
      vi.spyOn(Appointment, 'findOne').mockResolvedValue(null);
      vi.spyOn(Staff, 'findOne').mockResolvedValue(mockStaffA);

      const res = await request(app)
        .delete(`/api/services/${serviceA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('assigned to one or more staff members');
    });

    it('31. Admin cannot delete staff referenced by appointments or availability', async () => {
      vi.spyOn(Staff, 'findById').mockResolvedValue(mockStaffA);
      vi.spyOn(Appointment, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        staffId: staffA_Id,
      });

      const res = await request(app)
        .delete(`/api/staff/${staffA_Id}`)
        .set('Cookie', `${env.COOKIE_NAME}=${tokenAdminA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('referenced by existing appointments');
    });
  });
});
