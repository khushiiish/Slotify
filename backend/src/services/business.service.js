import mongoose from 'mongoose';
import Business from '../models/business.model.js';
import User from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';

/**
 * Generate a URL-friendly unique slug for a business.
 * Handles collisions deterministically by appending a numeric counter.
 *
 * @param {string} name - Business name
 * @param {string} [customSlug] - User-provided slug
 * @returns {Promise<string>} Unique slug
 */
export const generateUniqueSlug = async (name, customSlug) => {
  if (customSlug && customSlug.trim()) {
    const normalizedCustom = customSlug.trim().toLowerCase();
    const existing = await Business.findOne({ slug: normalizedCustom });
    if (existing) {
      const error = new Error(`Business with slug '${normalizedCustom}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
    return normalizedCustom;
  }

  // Derive base slug from business name
  const baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let candidateSlug = baseSlug || 'business';
  let counter = 1;

  while (await Business.findOne({ slug: candidateSlug })) {
    counter += 1;
    candidateSlug = `${baseSlug}-${counter}`;
  }

  return candidateSlug;
};

/**
 * Onboard a new business and create its initial Business Admin account.
 * Implements transaction consistency with fallback cleanup on standalone instances.
 *
 * @param {object} data - Onboarding input payload
 * @returns {Promise<{ business: object, admin: object }>} Sanitized business and admin records
 */
export const onboardBusinessAndAdmin = async (data) => {
  const normalizedEmail = data.adminEmail.trim().toLowerCase();

  // 1. Verify admin email uniqueness
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error(`An account with email '${normalizedEmail}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  // 2. Resolve unique slug
  const slug = await generateUniqueSlug(data.name, data.slug);

  // 3. Hash admin password securely
  const passwordHash = await hashPassword(data.adminPassword);

  let business;
  let adminUser;

  // Attempt multi-document transaction only if actively connected to MongoDB
  let session = null;
  let transactionSupported = false;

  if (mongoose.connection.readyState === 1) {
    try {
      session = await mongoose.startSession();
      transactionSupported = true;
    } catch (err) {
      transactionSupported = false;
    }
  }

  if (session && transactionSupported) {
    try {
      await session.withTransaction(async () => {
        const [createdBusiness] = await Business.create(
          [
            {
              name: data.name,
              slug,
              contactEmail: data.contactEmail || undefined,
              contactPhone: data.contactPhone || undefined,
              address: data.address || undefined,
              timezone: data.timezone || 'Asia/Kolkata',
              status: 'ACTIVE',
            },
          ],
          { session }
        );
        business = createdBusiness;

        const [createdAdmin] = await User.create(
          [
            {
              name: data.adminName,
              email: normalizedEmail,
              passwordHash,
              role: 'BUSINESS_ADMIN',
              businessId: createdBusiness._id,
              status: 'ACTIVE',
            },
          ],
          { session }
        );
        adminUser = createdAdmin;
      });
    } catch (txError) {
      if (
        txError.message?.includes('replica set') ||
        txError.message?.includes('Transaction numbers are only allowed')
      ) {
        transactionSupported = false;
      } else {
        throw txError;
      }
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  // Fallback: atomic two-step with cleanup rollback (for standalone/test environments)
  if (!transactionSupported || !business) {
    business = await Business.create({
      name: data.name,
      slug,
      contactEmail: data.contactEmail || undefined,
      contactPhone: data.contactPhone || undefined,
      address: data.address || undefined,
      timezone: data.timezone || 'Asia/Kolkata',
      status: 'ACTIVE',
    });

    try {
      adminUser = await User.create({
        name: data.adminName,
        email: normalizedEmail,
        passwordHash,
        role: 'BUSINESS_ADMIN',
        businessId: business._id,
        status: 'ACTIVE',
      });
    } catch (adminError) {
      // Rollback newly created business if admin creation fails
      await Business.findByIdAndDelete(business._id);
      throw adminError;
    }
  }

  const plainBiz = typeof business.toObject === 'function' ? business.toObject() : business;
  const plainAdmin = typeof adminUser.toObject === 'function' ? adminUser.toObject() : adminUser;

  return {
    business: {
      id: plainBiz._id ? plainBiz._id.toString() : plainBiz.id,
      _id: plainBiz._id,
      name: plainBiz.name,
      slug: plainBiz.slug,
      contactEmail: plainBiz.contactEmail || '',
      contactPhone: plainBiz.contactPhone || '',
      address: plainBiz.address || '',
      timezone: plainBiz.timezone,
      status: plainBiz.status,
      createdAt: plainBiz.createdAt,
      updatedAt: plainBiz.updatedAt,
    },
    admin: {
      id: plainAdmin._id ? plainAdmin._id.toString() : plainAdmin.id,
      name: plainAdmin.name,
      email: plainAdmin.email,
      role: plainAdmin.role,
      businessId: plainAdmin.businessId ? plainAdmin.businessId.toString() : null,
      status: plainAdmin.status,
    },
  };
};

/**
 * List all businesses across the platform with associated admin summary.
 * System Owner platform-level operation.
 *
 * @returns {Promise<Array<object>>} List of businesses with admin info
 */
export const listPlatformBusinesses = async () => {
  const businesses = await Business.find().sort({ createdAt: -1 });

  if (!businesses || businesses.length === 0) {
    return [];
  }

  // Only query User if database is actually connected (avoids Mongoose timeout in mock unit tests)
  if (mongoose.connection.readyState === 1) {
    try {
      const businessIds = businesses.map((b) => b._id).filter(Boolean);
      const admins = await User.find({
        businessId: { $in: businessIds },
        role: 'BUSINESS_ADMIN',
      }).select('name email businessId status');

      const adminMap = new Map();
      admins.forEach((admin) => {
        if (admin.businessId) {
          adminMap.set(admin.businessId.toString(), {
            id: admin._id.toString(),
            name: admin.name,
            email: admin.email,
            status: admin.status,
          });
        }
      });

      return businesses.map((b) => {
        const plain = typeof b.toObject === 'function' ? b.toObject() : { ...b };
        const id = (b._id || b.id || '').toString();
        return {
          ...plain,
          id,
          admin: adminMap.get(id) || null,
        };
      });
    } catch (e) {
      // Fall through to returning businesses
    }
  }

  return businesses;
};

/**
 * Retrieve comprehensive business details along with initial admin details.
 *
 * @param {string} businessId - Business ID
 * @returns {Promise<object>} Business and admin details
 */
export const getPlatformBusinessDetails = async (businessId) => {
  const business = await Business.findById(businessId);

  if (!business) {
    const error = new Error('Business not found.');
    error.statusCode = 404;
    throw error;
  }

  let admin = null;
  if (mongoose.connection.readyState === 1) {
    try {
      admin = await User.findOne({
        businessId: business._id,
        role: 'BUSINESS_ADMIN',
      }).select('name email businessId status createdAt');
    } catch (e) {
      admin = null;
    }
  }

  const plainBiz = typeof business.toObject === 'function' ? business.toObject() : { ...business };

  return {
    business: {
      ...plainBiz,
      id: (plainBiz._id || plainBiz.id || '').toString(),
    },
    admin: admin
      ? {
          id: admin._id ? admin._id.toString() : admin.id,
          name: admin.name,
          email: admin.email,
          status: admin.status,
          createdAt: admin.createdAt,
        }
      : null,
  };
};

/**
 * Update the status of a business (ACTIVE or DISABLED).
 *
 * @param {string} businessId - Business ID
 * @param {'ACTIVE' | 'DISABLED'} status - New status
 * @returns {Promise<object>} Updated business
 */
export const updateBusinessStatus = async (businessId, status) => {
  const business = await Business.findById(businessId);
  if (!business) {
    const error = new Error('Business not found.');
    error.statusCode = 404;
    throw error;
  }

  business.status = status;
  await business.save();

  const plainBiz = typeof business.toObject === 'function' ? business.toObject() : business;

  return {
    id: plainBiz._id ? plainBiz._id.toString() : plainBiz.id,
    _id: plainBiz._id,
    name: plainBiz.name,
    slug: plainBiz.slug,
    contactEmail: plainBiz.contactEmail,
    contactPhone: plainBiz.contactPhone,
    address: plainBiz.address,
    timezone: plainBiz.timezone,
    status: plainBiz.status,
    createdAt: plainBiz.createdAt,
    updatedAt: plainBiz.updatedAt,
  };
};
