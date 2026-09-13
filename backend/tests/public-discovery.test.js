import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Business from '../src/models/business.model.js';
import Service from '../src/models/service.model.js';

describe('Public Business Discovery Feature Tests', () => {
  let businessA_Id;
  let businessB_Id;
  let businessC_Disabled_Id;

  let mockBusinessA;
  let mockBusinessB;
  let mockBusinessC_Disabled;
  let allBusinesses;

  beforeEach(() => {
    vi.restoreAllMocks();

    businessA_Id = new mongoose.Types.ObjectId();
    businessB_Id = new mongoose.Types.ObjectId();
    businessC_Disabled_Id = new mongoose.Types.ObjectId();

    mockBusinessA = {
      _id: businessA_Id,
      name: 'Urban Wellness Studio',
      slug: 'urban-wellness-studio',
      contactEmail: 'contact@urbanwellness.slotify.dev',
      contactPhone: '+91-9876543210',
      address: '104 MG Road, Bengaluru',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      createdAt: new Date(),
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
      createdAt: new Date(),
    };

    mockBusinessC_Disabled = {
      _id: businessC_Disabled_Id,
      name: 'Closed Down Clinic',
      slug: 'closed-down-clinic',
      contactEmail: 'closed@clinic.dev',
      contactPhone: '+1-000-000-0000',
      address: '999 Ghost St, Nowhere',
      timezone: 'UTC',
      status: 'DISABLED',
      createdAt: new Date(),
    };

    allBusinesses = [mockBusinessA, mockBusinessB, mockBusinessC_Disabled];

    // Mock Business.find to respect the passed filter
    vi.spyOn(Business, 'find').mockImplementation((filter) => {
      let result = allBusinesses;

      // Filter by status if present in filter
      if (filter.status) {
        result = result.filter((b) => b.status === filter.status);
      }

      // Filter by $or if search is applied
      if (filter.$or && Array.isArray(filter.$or)) {
        result = result.filter((b) => {
          return filter.$or.some((condition) => {
            if (condition.name && condition.name.test) return condition.name.test(b.name);
            if (condition.slug && condition.slug.test) return condition.slug.test(b.slug);
            if (condition.address && condition.address.test) return condition.address.test(b.address);
            return false;
          });
        });
      }

      return {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(result),
      };
    });

    // Mock Business.findOne for single business slug lookups
    vi.spyOn(Business, 'findOne').mockImplementation((query) => {
      if (query.slug === 'urban-wellness-studio') return Promise.resolve(mockBusinessA);
      if (query.slug === 'techfix-services') return Promise.resolve(mockBusinessB);
      if (query.slug === 'closed-down-clinic') return Promise.resolve(mockBusinessC_Disabled);
      return Promise.resolve(null);
    });

    // Mock Service.find for public services
    vi.spyOn(Service, 'find').mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Swedish Massage',
            durationMinutes: 60,
            price: 80,
            status: 'ACTIVE',
          },
        ]),
      }),
    });
  });

  it('1. GET /api/public/businesses returns 200 and success true', async () => {
    const res = await request(app).get('/api/public/businesses');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('2. Returns only ACTIVE businesses and strictly excludes DISABLED businesses', async () => {
    const res = await request(app).get('/api/public/businesses');
    expect(res.status).toBe(200);
    const slugs = res.body.data.map((b) => b.slug);
    expect(slugs).toContain('urban-wellness-studio');
    expect(slugs).toContain('techfix-services');
    expect(slugs).not.toContain('closed-down-clinic');
    res.body.data.forEach((b) => {
      expect(b.status).toBe('ACTIVE');
    });
  });

  it('3. Ignores client query parameter spoofing such as ?status=DISABLED', async () => {
    const res = await request(app).get('/api/public/businesses?status=DISABLED');
    expect(res.status).toBe(200);
    const slugs = res.body.data.map((b) => b.slug);
    expect(slugs).not.toContain('closed-down-clinic');
    res.body.data.forEach((b) => {
      expect(b.status).toBe('ACTIVE');
    });
  });

  it('4. Does NOT require authentication (no JWT cookies or tokens)', async () => {
    const res = await request(app).get('/api/public/businesses');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('5. Safe projection: does NOT leak sensitive/internal fields or passwords', async () => {
    const res = await request(app).get('/api/public/businesses');
    expect(res.status).toBe(200);
    res.body.data.forEach((b) => {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('name');
      expect(b).toHaveProperty('slug');
      expect(b).toHaveProperty('timezone');
      expect(b).not.toHaveProperty('password');
      expect(b).not.toHaveProperty('adminId');
      expect(b).not.toHaveProperty('__v');
    });
  });

  it('6. Search safely matches by business name', async () => {
    const res = await request(app).get('/api/public/businesses?search=urban');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].slug).toBe('urban-wellness-studio');
  });

  it('7. Search safely matches by business slug', async () => {
    const res = await request(app).get('/api/public/businesses?search=techfix');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].slug).toBe('techfix-services');
  });

  it('8. Search safely matches by address', async () => {
    const res = await request(app).get('/api/public/businesses?search=Bengaluru');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].slug).toBe('urban-wellness-studio');
  });

  it('9. Search sanitizes regex special characters preventing ReDoS or syntax error', async () => {
    const res = await request(app).get('/api/public/businesses?search=.*+?^${}()|[]\\');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should return 0 matches without crashing
    expect(res.body.data.length).toBe(0);
  });

  it('10. Search handles NoSQL object injection safely without crashing', async () => {
    const res = await request(app).get('/api/public/businesses?search[$ne]=something');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // If not a string, search is safely ignored and active businesses are returned
    expect(res.body.data.length).toBe(2);
  });

  it('11. Existing single business lookup /api/public/businesses/:slug continues working', async () => {
    const res = await request(app).get('/api/public/businesses/urban-wellness-studio');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Urban Wellness Studio');
    expect(res.body.data.services).toBeDefined();
  });

  it('12. Existing single business lookup alias /api/public/business/:slug also works', async () => {
    const res = await request(app).get('/api/public/business/urban-wellness-studio');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Urban Wellness Studio');
  });

  it('13. Disabled business in single lookup marks isBookingDisabled: true', async () => {
    const res = await request(app).get('/api/public/businesses/closed-down-clinic');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DISABLED');
    expect(res.body.data.isBookingDisabled).toBe(true);
  });
});
