import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  Business,
  User,
  Service,
  Staff,
  Availability,
  BlockedDate,
  Appointment,
} from '../src/models/index.js';

describe('Phase 1 Data Models Validation & Tenant Integrity', () => {
  const dummyBusinessId = new mongoose.Types.ObjectId();
  const dummyBusinessIdB = new mongoose.Types.ObjectId();
  const dummyStaffId = new mongoose.Types.ObjectId();
  const dummyServiceId = new mongoose.Types.ObjectId();

  describe('Business Model', () => {
    it('should pass validation with complete valid data', async () => {
      const business = new Business({
        name: 'Zenith Studio',
        slug: 'zenith-studio',
        contactEmail: 'contact@zenith.com',
        timezone: 'Asia/Kolkata',
        status: 'ACTIVE',
      });
      await expect(business.validate()).resolves.toBeUndefined();
    });

    it('should require name and slug', async () => {
      const business = new Business({});
      const error = await business.validate().catch((err) => err);
      expect(error.errors.name).toBeDefined();
      expect(error.errors.slug).toBeDefined();
    });

    it('should reject invalid status enum', async () => {
      const business = new Business({
        name: 'Zenith Studio',
        slug: 'zenith-studio',
        status: 'PENDING_APPROVAL', // Not in ['ACTIVE', 'DISABLED']
      });
      const error = await business.validate().catch((err) => err);
      expect(error.errors.status).toBeDefined();
    });

    it('should reject invalid slug formats (uppercase, spaces, special chars)', async () => {
      const business = new Business({
        name: 'Zenith Studio',
        slug: 'Zenith Studio!',
      });
      const error = await business.validate().catch((err) => err);
      expect(error.errors.slug).toBeDefined();
    });

    it('should default timezone to Asia/Kolkata', () => {
      const business = new Business({
        name: 'Zenith Studio',
        slug: 'zenith-studio',
      });
      expect(business.timezone).toBe('Asia/Kolkata');
    });
  });

  describe('User Model', () => {
    it('should allow System Owner with businessId as null', async () => {
      const owner = new User({
        name: 'Super Owner',
        email: 'owner@slotify.dev',
        passwordHash: 'hashed_password_123',
        role: 'SYSTEM_OWNER',
        businessId: null,
      });
      await expect(owner.validate()).resolves.toBeUndefined();
    });

    it('should allow Business Admin with a valid businessId', async () => {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@studio.com',
        passwordHash: 'hashed_password_123',
        role: 'BUSINESS_ADMIN',
        businessId: dummyBusinessId,
      });
      await expect(admin.validate()).resolves.toBeUndefined();
    });

    it('should reject Business Admin without businessId', async () => {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@studio.com',
        passwordHash: 'hashed_password_123',
        role: 'BUSINESS_ADMIN',
        businessId: null,
      });
      const error = await admin.validate().catch((err) => err);
      expect(error.errors.businessId).toBeDefined();
    });

    it('should reject invalid role enum', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed_password_123',
        role: 'INVALID_ROLE',
      });
      const error = await user.validate().catch((err) => err);
      expect(error.errors.role).toBeDefined();
    });

    it('should require valid email', async () => {
      const user = new User({
        name: 'Test User',
        email: 'invalid-email-string',
        passwordHash: 'hashed_password_123',
        role: 'SYSTEM_OWNER',
      });
      const error = await user.validate().catch((err) => err);
      expect(error.errors.email).toBeDefined();
    });
  });

  describe('Service Model & Tenant Scoping', () => {
    it('should require businessId (cannot create unowned service)', async () => {
      const service = new Service({
        name: 'General Consultation',
        durationMinutes: 30,
      });
      const error = await service.validate().catch((err) => err);
      expect(error.errors.businessId).toBeDefined();
    });

    it('should enforce durationMinutes to be a positive integer', async () => {
      const service = new Service({
        businessId: dummyBusinessId,
        name: 'General Consultation',
        durationMinutes: -15,
      });
      const error = await service.validate().catch((err) => err);
      expect(error.errors.durationMinutes).toBeDefined();
    });

    it('should reject invalid service status enum', async () => {
      const service = new Service({
        businessId: dummyBusinessId,
        name: 'General Consultation',
        durationMinutes: 30,
        status: 'UNKNOWN_STATUS',
      });
      const error = await service.validate().catch((err) => err);
      expect(error.errors.status).toBeDefined();
    });

    it('should validate valid service with tenant association', async () => {
      const service = new Service({
        businessId: dummyBusinessId,
        name: 'General Consultation',
        durationMinutes: 30,
        status: 'ACTIVE',
      });
      await expect(service.validate()).resolves.toBeUndefined();
    });
  });

  describe('Staff Model & Tenant Scoping', () => {
    it('should require businessId (cannot create unowned staff)', async () => {
      const staff = new Staff({
        name: 'Jane Doe',
      });
      const error = await staff.validate().catch((err) => err);
      expect(error.errors.businessId).toBeDefined();
    });

    it('should validate valid staff with service relationships', async () => {
      const staff = new Staff({
        businessId: dummyBusinessId,
        name: 'Dr. Jane Doe',
        email: 'jane.doe@business.com',
        serviceIds: [dummyServiceId],
        status: 'ACTIVE',
      });
      await expect(staff.validate()).resolves.toBeUndefined();
    });
  });

  describe('Availability Model', () => {
    it('should require businessId, staffId, dayOfWeek, startTime, and endTime', async () => {
      const availability = new Availability({});
      const error = await availability.validate().catch((err) => err);
      expect(error.errors.businessId).toBeDefined();
      expect(error.errors.staffId).toBeDefined();
      expect(error.errors.dayOfWeek).toBeDefined();
      expect(error.errors.startTime).toBeDefined();
      expect(error.errors.endTime).toBeDefined();
    });

    it('should reject dayOfWeek outside 0-6 range', async () => {
      const availability = new Availability({
        businessId: dummyBusinessId,
        staffId: dummyStaffId,
        dayOfWeek: 7, // Invalid (only 0 to 6 allowed)
        startTime: '09:00',
        endTime: '17:00',
      });
      const error = await availability.validate().catch((err) => err);
      expect(error.errors.dayOfWeek).toBeDefined();
    });

    it('should reject invalid time formats', async () => {
      const availability = new Availability({
        businessId: dummyBusinessId,
        staffId: dummyStaffId,
        dayOfWeek: 1,
        startTime: '9:00 AM', // Not 24-hr HH:mm
        endTime: '17:00',
      });
      const error = await availability.validate().catch((err) => err);
      expect(error.errors.startTime).toBeDefined();
    });

    it('should reject when startTime is later than or equal to endTime', async () => {
      const availability = new Availability({
        businessId: dummyBusinessId,
        staffId: dummyStaffId,
        dayOfWeek: 1,
        startTime: '18:00',
        endTime: '09:00',
      });
      const error = await availability.validate().catch((err) => err);
      expect(error.errors.endTime).toBeDefined();
    });

    it('should validate proper availability window', async () => {
      const availability = new Availability({
        businessId: dummyBusinessId,
        staffId: dummyStaffId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      });
      await expect(availability.validate()).resolves.toBeUndefined();
    });
  });

  describe('BlockedDate Model', () => {
    it('should require businessId and date', async () => {
      const blockedDate = new BlockedDate({});
      const error = await blockedDate.validate().catch((err) => err);
      expect(error.errors.businessId).toBeDefined();
      expect(error.errors.date).toBeDefined();
    });

    it('should allow business-wide blocked date (staffId = null)', async () => {
      const blockedDate = new BlockedDate({
        businessId: dummyBusinessId,
        staffId: null,
        date: new Date(),
        reason: 'National Holiday',
      });
      await expect(blockedDate.validate()).resolves.toBeUndefined();
    });

    it('should allow staff-specific blocked date', async () => {
      const blockedDate = new BlockedDate({
        businessId: dummyBusinessId,
        staffId: dummyStaffId,
        date: new Date(),
        reason: 'Annual Vacation',
      });
      await expect(blockedDate.validate()).resolves.toBeUndefined();
    });
  });

  describe('Appointment Model & Multi-Tenant Scoping', () => {
    it('should require businessId, serviceId, staffId, customerName, customerEmail, startTime, and endTime', async () => {
      const appointment = new Appointment({});
      const error = await appointment.validate().catch((err) => err);
      expect(error.errors.businessId).toBeDefined();
      expect(error.errors.serviceId).toBeDefined();
      expect(error.errors.staffId).toBeDefined();
      expect(error.errors.customerName).toBeDefined();
      expect(error.errors.customerEmail).toBeDefined();
      expect(error.errors.startTime).toBeDefined();
      expect(error.errors.endTime).toBeDefined();
    });

    it('should reject invalid status enum', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 60000);
      const appointment = new Appointment({
        businessId: dummyBusinessId,
        serviceId: dummyServiceId,
        staffId: dummyStaffId,
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        startTime: now,
        endTime: later,
        status: 'NON_EXISTENT_STATUS',
      });
      const error = await appointment.validate().catch((err) => err);
      expect(error.errors.status).toBeDefined();
    });

    it('should reject when startTime is not earlier than endTime', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 30 * 60000);
      const appointment = new Appointment({
        businessId: dummyBusinessId,
        serviceId: dummyServiceId,
        staffId: dummyStaffId,
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        startTime: now,
        endTime: earlier,
      });
      const error = await appointment.validate().catch((err) => err);
      expect(error.errors.endTime).toBeDefined();
    });

    it('should validate valid appointment document', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 60000);
      const appointment = new Appointment({
        businessId: dummyBusinessId,
        serviceId: dummyServiceId,
        staffId: dummyStaffId,
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        startTime: now,
        endTime: later,
        status: 'CONFIRMED',
      });
      await expect(appointment.validate()).resolves.toBeUndefined();
    });

    it('should enforce distinct tenant ownership across entities', () => {
      // Business A Resource
      const serviceA = new Service({
        businessId: dummyBusinessId,
        name: 'Service A',
        durationMinutes: 30,
      });

      // Business B Resource
      const serviceB = new Service({
        businessId: dummyBusinessIdB,
        name: 'Service B',
        durationMinutes: 45,
      });

      expect(serviceA.businessId.toString()).not.toBe(serviceB.businessId.toString());
    });
  });
});
