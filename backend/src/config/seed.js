import bcryptjs from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from './db.js';
import Business from '../models/business.model.js';
import User from '../models/user.model.js';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import Availability from '../models/availability.model.js';
import BlockedDate from '../models/blockedDate.model.js';
import Appointment from '../models/appointment.model.js';

/**
 * Development Seed Script for Slotify
 * Creates a clean, deterministic, multi-tenant development environment.
 * Safe to execute multiple times (idempotent upsert strategy).
 */
export const seedDatabase = async () => {
  console.log('[Seed] Starting database seeding...');

  // 1. Seed System Owner
  const devPasswordHash = bcryptjs.hashSync('DevPassword123!', 10);
  const systemOwner = await User.findOneAndUpdate(
    { email: 'owner@slotify.dev' },
    {
      name: 'Platform System Owner',
      email: 'owner@slotify.dev',
      passwordHash: devPasswordHash,
      role: 'SYSTEM_OWNER',
      businessId: null,
      status: 'ACTIVE',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log(`[Seed] System Owner configured: ${systemOwner.email}`);

  // 2. Seed Business A
  const businessA = await Business.findOneAndUpdate(
    { slug: 'urban-wellness-studio' },
    {
      name: 'Urban Wellness Studio',
      slug: 'urban-wellness-studio',
      contactEmail: 'contact@urbanwellness.slotify.dev',
      contactPhone: '+91-9876543210',
      address: '104 MG Road, Indiranagar, Bengaluru, Karnataka 560038',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log(`[Seed] Business A configured: ${businessA.name} (${businessA.slug})`);

  // 3. Seed Business B
  const businessB = await Business.findOneAndUpdate(
    { slug: 'techfix-services' },
    {
      name: 'TechFix Services',
      slug: 'techfix-services',
      contactEmail: 'support@techfix.slotify.dev',
      contactPhone: '+1-415-555-0199',
      address: '500 Market St, Suite 200, San Francisco, CA 94105',
      timezone: 'America/Los_Angeles',
      status: 'ACTIVE',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log(`[Seed] Business B configured: ${businessB.name} (${businessB.slug})`);

  // 4. Seed Business Admins
  const adminA = await User.findOneAndUpdate(
    { email: 'admin@urbanwellness.slotify.dev' },
    {
      name: 'Aarav Mehta',
      email: 'admin@urbanwellness.slotify.dev',
      passwordHash: devPasswordHash,
      role: 'BUSINESS_ADMIN',
      businessId: businessA._id,
      status: 'ACTIVE',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const adminB = await User.findOneAndUpdate(
    { email: 'admin@techfix.slotify.dev' },
    {
      name: 'Sarah Jenkins',
      email: 'admin@techfix.slotify.dev',
      passwordHash: devPasswordHash,
      role: 'BUSINESS_ADMIN',
      businessId: businessB._id,
      status: 'ACTIVE',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log(`[Seed] Business Admins configured: ${adminA.email}, ${adminB.email}`);

  // 5. Seed Services for Business A
  const serviceA1 = await Service.findOneAndUpdate(
    { businessId: businessA._id, name: 'Initial Wellness Consultation' },
    {
      businessId: businessA._id,
      name: 'Initial Wellness Consultation',
      description: 'Comprehensive 30-minute health and lifestyle assessment',
      durationMinutes: 30,
      status: 'ACTIVE',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const serviceA2 = await Service.findOneAndUpdate(
    { businessId: businessA._id, name: 'Holistic Therapy Session' },
    {
      businessId: businessA._id,
      name: 'Holistic Therapy Session',
      description: 'Full 60-minute therapeutic rejuvenation session',
      durationMinutes: 60,
      status: 'ACTIVE',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // 6. Seed Service for Business B
  const serviceB1 = await Service.findOneAndUpdate(
    { businessId: businessB._id, name: 'Hardware Diagnostics & Repair' },
    {
      businessId: businessB._id,
      name: 'Hardware Diagnostics & Repair',
      description: '45-minute laptop and device triage and inspection',
      durationMinutes: 45,
      status: 'ACTIVE',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log('[Seed] Services configured for both businesses (Strictly isolated by businessId)');

  // 7. Seed Staff (Enforcing tenant-isolated serviceIds)
  const staffA1 = await Staff.findOneAndUpdate(
    { businessId: businessA._id, name: 'Dr. Maya Sharma' },
    {
      businessId: businessA._id,
      name: 'Dr. Maya Sharma',
      email: 'maya.sharma@urbanwellness.slotify.dev',
      phone: '+91-9876543211',
      status: 'ACTIVE',
      serviceIds: [serviceA1._id, serviceA2._id], // Business A services only
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const staffA2 = await Staff.findOneAndUpdate(
    { businessId: businessA._id, name: 'Alex Rivera' },
    {
      businessId: businessA._id,
      name: 'Alex Rivera',
      email: 'alex.rivera@urbanwellness.slotify.dev',
      phone: '+91-9876543212',
      status: 'ACTIVE',
      serviceIds: [serviceA1._id], // Business A service only
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const staffB1 = await Staff.findOneAndUpdate(
    { businessId: businessB._id, name: 'Sam Taylor' },
    {
      businessId: businessB._id,
      name: 'Sam Taylor',
      email: 'sam.taylor@techfix.slotify.dev',
      phone: '+1-415-555-0123',
      status: 'ACTIVE',
      serviceIds: [serviceB1._id], // Business B service only
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log('[Seed] Staff members configured with tenant-consistent service relationships');

  // 8. Seed Recurring Availability (Mon-Fri, days 1 to 5)
  for (let day = 1; day <= 5; day++) {
    // Dr. Maya Sharma: 09:00 - 17:00
    await Availability.findOneAndUpdate(
      { businessId: businessA._id, staffId: staffA1._id, dayOfWeek: day },
      {
        businessId: businessA._id,
        staffId: staffA1._id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Alex Rivera: 10:00 - 18:00
    await Availability.findOneAndUpdate(
      { businessId: businessA._id, staffId: staffA2._id, dayOfWeek: day },
      {
        businessId: businessA._id,
        staffId: staffA2._id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '18:00',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    // Sam Taylor: 09:00 - 17:00
    await Availability.findOneAndUpdate(
      { businessId: businessB._id, staffId: staffB1._id, dayOfWeek: day },
      {
        businessId: businessB._id,
        staffId: staffB1._id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }
  console.log('[Seed] Weekly staff availability schedules configured (Mon-Fri)');

  // 9. Seed Blocked Dates (Future dates)
  const holidayDate = new Date();
  holidayDate.setDate(holidayDate.getDate() + 15);
  holidayDate.setUTCHours(0, 0, 0, 0);

  await BlockedDate.findOneAndUpdate(
    { businessId: businessA._id, date: holidayDate, staffId: null },
    {
      businessId: businessA._id,
      staffId: null,
      date: holidayDate,
      reason: 'Annual Studio Maintenance Day',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const staffLeaveDate = new Date();
  staffLeaveDate.setDate(staffLeaveDate.getDate() + 20);
  staffLeaveDate.setUTCHours(0, 0, 0, 0);

  await BlockedDate.findOneAndUpdate(
    { businessId: businessA._id, date: staffLeaveDate, staffId: staffA2._id },
    {
      businessId: businessA._id,
      staffId: staffA2._id,
      date: staffLeaveDate,
      reason: 'Alex Rivera - Professional Development Leave',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log('[Seed] Blocked dates configured (1 business-wide, 1 staff-specific)');

  // 10. Seed Sample Appointments (Non-conflicting, tenant-consistent)
  const aptStart1 = new Date();
  aptStart1.setDate(aptStart1.getDate() + 1);
  aptStart1.setUTCHours(10, 0, 0, 0);

  const aptEnd1 = new Date(aptStart1);
  aptEnd1.setUTCMinutes(aptEnd1.getUTCMinutes() + 30);

  await Appointment.findOneAndUpdate(
    {
      businessId: businessA._id,
      serviceId: serviceA1._id,
      staffId: staffA1._id,
      startTime: aptStart1,
    },
    {
      businessId: businessA._id,
      serviceId: serviceA1._id,
      staffId: staffA1._id,
      customerName: 'Priya Kapoor',
      customerEmail: 'priya.kapoor@example.com',
      customerPhone: '+91-9123456780',
      startTime: aptStart1,
      endTime: aptEnd1,
      status: 'CONFIRMED',
      notes: 'Initial wellness assessment booking.',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const aptStart2 = new Date();
  aptStart2.setDate(aptStart2.getDate() + 1);
  aptStart2.setUTCHours(14, 0, 0, 0);

  const aptEnd2 = new Date(aptStart2);
  aptEnd2.setUTCMinutes(aptEnd2.getUTCMinutes() + 60);

  await Appointment.findOneAndUpdate(
    {
      businessId: businessA._id,
      serviceId: serviceA2._id,
      staffId: staffA1._id,
      startTime: aptStart2,
    },
    {
      businessId: businessA._id,
      serviceId: serviceA2._id,
      staffId: staffA1._id,
      customerName: 'Rohan Verma',
      customerEmail: 'rohan.verma@example.com',
      customerPhone: '+91-9123456781',
      startTime: aptStart2,
      endTime: aptEnd2,
      status: 'CONFIRMED',
      notes: 'Holistic therapy follow-up session.',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log('[Seed] Sample appointments seeded successfully with full tenant consistency');

  console.log('[Seed] Database seeding completed successfully.');
};

// Script execution when run directly: node src/config/seed.js
const run = async () => {
  try {
    await connectDatabase();
    await seedDatabase();
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Seeding failed:', error.message);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Execute if run from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  run();
}
