import jwt from 'jsonwebtoken';
import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import Appointment from '../models/appointment.model.js';
import { generateAvailableSlots } from './slotGeneration.service.js';
import { createAppointment } from './appointment.service.js';
import { env } from '../config/env.js';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Retrieve public-safe list of active businesses for public discovery.
 * Enforces status === 'ACTIVE' server-side, strictly ignoring client status manipulation.
 * Excludes private administrative details, credentials, and internal metadata.
 * Safely filters by search term across name, slug, and address without regex injection risks.
 *
 * @param {string} [searchQuery] - Optional search term
 * @returns {Promise<Array<object>>} List of active, public-safe businesses
 */
export const listPublicBusinesses = async (searchQuery) => {
  const filter = { status: 'ACTIVE' };

  if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
    // Sanitize user regex input to prevent ReDoS / NoSQL operator injection
    const sanitized = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(sanitized, 'i');
    filter.$or = [
      { name: searchRegex },
      { slug: searchRegex },
      { address: searchRegex },
    ];
  }

  const businesses = await Business.find(filter)
    .select('_id name slug contactEmail contactPhone address timezone status createdAt')
    .sort({ name: 1 })
    .lean();

  return businesses.map((b) => ({
    id: b._id.toString(),
    _id: b._id,
    name: b.name,
    slug: b.slug,
    contactEmail: b.contactEmail || null,
    contactPhone: b.contactPhone || null,
    address: b.address || null,
    timezone: b.timezone || 'Asia/Kolkata',
    status: b.status,
  }));
};

/**
 * Retrieve public-safe business information and its active services by business slug.
 * Excludes private administrative details, password hashes, and internal metadata.
 *
 * @param {string} slug - Unique business slug
 * @returns {Promise<object>} Public-safe business profile and services
 */
export const getPublicBusiness = async (slug) => {
  if (!slug || !slug.trim()) {
    const error = new Error('Business slug is required.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedSlug = slug.trim().toLowerCase();
  const business = await Business.findOne({ slug: normalizedSlug });

  if (!business) {
    const error = new Error(`Business '${slug}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Fetch only active services belonging to this business
  const services = await Service.find({
    businessId: business._id,
    status: 'ACTIVE',
  })
    .select('_id name description durationMinutes price status')
    .sort({ name: 1 });

  return {
    _id: business._id,
    name: business.name,
    slug: business.slug,
    contactEmail: business.contactEmail || null,
    contactPhone: business.contactPhone || null,
    address: business.address || null,
    timezone: business.timezone || 'Asia/Kolkata',
    status: business.status,
    isBookingDisabled: business.status !== 'ACTIVE',
    services,
  };
};

/**
 * Discover available 15-minute booking slots for a business, service, and date.
 *
 * @param {string} slug - Business slug
 * @param {object} params - Query parameters (serviceId, date, staffId)
 * @returns {Promise<object>} Calculated slots response
 */
export const getPublicSlots = async (slug, { serviceId, date, staffId }) => {
  const normalizedSlug = slug.trim().toLowerCase();
  const business = await Business.findOne({ slug: normalizedSlug });

  if (!business) {
    const error = new Error(`Business '${slug}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (business.status !== 'ACTIVE') {
    return {
      date,
      timezone: business.timezone || 'Asia/Kolkata',
      slotsCount: 0,
      slots: [],
      isBookingDisabled: true,
      message: 'This business is currently unavailable for bookings.',
    };
  }

  return await generateAvailableSlots(
    { businessId: business._id },
    { serviceId, dateStr: date, staffId }
  );
};

/**
 * Create a public customer appointment reusing the Phase 7 booking engine.
 * Generates and returns a signed Customer Access Token for managing the appointment.
 *
 * @param {string} slug - Business slug
 * @param {object} data - Booking payload
 * @returns {Promise<object>} Public appointment confirmation and customer token
 */
export const createPublicAppointment = async (slug, data) => {
  const normalizedSlug = slug.trim().toLowerCase();
  const business = await Business.findOne({ slug: normalizedSlug });

  if (!business) {
    const error = new Error(`Business '${slug}' not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (business.status !== 'ACTIVE') {
    const error = new Error('This business is currently unavailable for bookings.');
    error.statusCode = 403;
    throw error;
  }

  // Call authoritative Phase 7 booking engine with the resolved tenant business ID
  const result = await createAppointment(business._id, data);

  // Generate cryptographically signed Customer Access Token for secure appointment management
  const customerToken = jwt.sign(
    {
      appointmentId: result.appointment._id.toString(),
      customerEmail: result.appointment.customerEmail,
      businessId: business._id.toString(),
      type: 'CUSTOMER_APPOINTMENT_ACCESS',
    },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return {
    appointment: {
      _id: result.appointment._id,
      businessName: business.name,
      businessSlug: business.slug,
      businessTimezone: business.timezone || 'Asia/Kolkata',
      businessAddress: business.address,
      businessPhone: business.contactPhone,
      businessEmail: business.contactEmail,
      serviceName: result.appointment.serviceId.name,
      durationMinutes: result.appointment.serviceId.durationMinutes,
      staffName: result.appointment.staffId?.name || 'Assigned Staff',
      customerName: result.appointment.customerName,
      customerEmail: result.appointment.customerEmail,
      customerPhone: result.appointment.customerPhone,
      startTime: result.appointment.startTime,
      endTime: result.appointment.endTime,
      localDate: result.localDate,
      localStartTime: result.localStartTime,
      localEndTime: result.localEndTime,
      timezone: result.timezone,
      status: result.appointment.status,
      notes: result.appointment.notes,
    },
    customerToken,
  };
};

/**
 * Helper to verify and decode a Customer Access Token for an appointment.
 *
 * @param {string} appointmentId - Target appointment ID
 * @param {string} token - Customer access token
 * @returns {object} Decoded payload
 */
const verifyCustomerToken = (appointmentId, token) => {
  if (!token) {
    const error = new Error('Customer appointment access token is required.');
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    const error = new Error('Invalid or expired appointment access token.');
    error.statusCode = 403;
    throw error;
  }

  if (
    decoded.type !== 'CUSTOMER_APPOINTMENT_ACCESS' ||
    decoded.appointmentId !== appointmentId
  ) {
    const error = new Error('You do not have permission to view or manage this appointment.');
    error.statusCode = 403;
    throw error;
  }

  return decoded;
};

/**
 * Retrieve an appointment by ID using a verified Customer Access Token.
 * Enforces customer and tenant isolation, preventing unauthorized cross-access (anti-IDOR).
 *
 * @param {string} appointmentId - Appointment ID
 * @param {string} token - Customer access token
 * @returns {Promise<object>} Public-safe appointment details
 */
export const getPublicAppointment = async (appointmentId, token) => {
  if (!OBJECT_ID_REGEX.test(appointmentId)) {
    const error = new Error('Invalid appointment ID format.');
    error.statusCode = 400;
    throw error;
  }

  const decoded = verifyCustomerToken(appointmentId, token);

  const appointment = await Appointment.findById(appointmentId)
    .populate('businessId', 'name slug timezone contactEmail contactPhone address status')
    .populate('serviceId', 'name durationMinutes price')
    .populate('staffId', 'name');

  if (!appointment) {
    const error = new Error('Appointment not found.');
    error.statusCode = 404;
    throw error;
  }

  // Cross-tenant and cross-customer boundary verification
  if (
    appointment.businessId._id.toString() !== decoded.businessId ||
    appointment.customerEmail.toLowerCase() !== decoded.customerEmail.toLowerCase()
  ) {
    const error = new Error('You do not have permission to view this appointment.');
    error.statusCode = 403;
    throw error;
  }

  return {
    _id: appointment._id,
    business: {
      name: appointment.businessId.name,
      slug: appointment.businessId.slug,
      timezone: appointment.businessId.timezone,
      contactEmail: appointment.businessId.contactEmail,
      contactPhone: appointment.businessId.contactPhone,
      address: appointment.businessId.address,
    },
    service: {
      name: appointment.serviceId?.name || 'Service',
      durationMinutes: appointment.serviceId?.durationMinutes,
      price: appointment.serviceId?.price,
    },
    staff: {
      name: appointment.staffId?.name || 'Assigned Staff',
    },
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    notes: appointment.notes,
  };
};

/**
 * Cancel an appointment using a verified Customer Access Token.
 * Immediately frees the slot for future bookings and updates status to CANCELLED.
 *
 * @param {string} appointmentId - Appointment ID
 * @param {string} token - Customer access token
 * @returns {Promise<object>} Cancelled appointment details
 */
export const cancelPublicAppointment = async (appointmentId, token) => {
  if (!OBJECT_ID_REGEX.test(appointmentId)) {
    const error = new Error('Invalid appointment ID format.');
    error.statusCode = 400;
    throw error;
  }

  const decoded = verifyCustomerToken(appointmentId, token);

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    const error = new Error('Appointment not found.');
    error.statusCode = 404;
    throw error;
  }

  if (
    appointment.businessId.toString() !== decoded.businessId ||
    appointment.customerEmail.toLowerCase() !== decoded.customerEmail.toLowerCase()
  ) {
    const error = new Error('You do not have permission to cancel this appointment.');
    error.statusCode = 403;
    throw error;
  }

  if (appointment.status === 'COMPLETED') {
    const error = new Error('Cannot cancel an appointment that is already completed.');
    error.statusCode = 400;
    throw error;
  }
  if (appointment.status === 'NO_SHOW') {
    const error = new Error('Cannot cancel an appointment marked as no-show.');
    error.statusCode = 400;
    throw error;
  }

  if (appointment.status !== 'CANCELLED') {
    appointment.status = 'CANCELLED';
    await appointment.save();
  }

  const populated = await Appointment.findById(appointment._id)
    .populate('businessId', 'name slug timezone contactEmail contactPhone address')
    .populate('serviceId', 'name durationMinutes price')
    .populate('staffId', 'name');

  return {
    _id: populated._id,
    business: {
      name: populated.businessId.name,
      slug: populated.businessId.slug,
      timezone: populated.businessId.timezone,
    },
    service: {
      name: populated.serviceId?.name,
      durationMinutes: populated.serviceId?.durationMinutes,
    },
    staff: {
      name: populated.staffId?.name || 'Assigned Staff',
    },
    customerName: populated.customerName,
    customerEmail: populated.customerEmail,
    startTime: populated.startTime,
    endTime: populated.endTime,
    status: populated.status,
  };
};
