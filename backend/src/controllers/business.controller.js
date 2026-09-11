import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import { getTenantFilter, enforceTenantContext, assertTenantOwnership } from '../utils/tenant.js';
import {
  onboardBusinessAndAdmin,
  listPlatformBusinesses,
  getPlatformBusinessDetails,
  updateBusinessStatus,
} from '../services/business.service.js';

/**
 * Onboard a new business and its initial Business Admin.
 * Restricted to: SYSTEM_OWNER
 * POST /api/businesses
 */
export const onboardBusiness = async (req, res, next) => {
  try {
    const result = await onboardBusinessAndAdmin(req.body);

    return res.status(201).json({
      success: true,
      message: 'Business and initial admin onboarded successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all businesses.
 * Restricted to: SYSTEM_OWNER (platform-wide operation).
 * GET /api/businesses
 */
export const getAllBusinesses = async (req, res, next) => {
  try {
    const businesses = await listPlatformBusinesses();

    return res.status(200).json({
      success: true,
      message: 'Businesses retrieved successfully',
      data: {
        businesses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single business by ID.
 * Allowed: SYSTEM_OWNER (any business) or BUSINESS_ADMIN (own business only).
 * GET /api/businesses/:businessId
 */
export const getBusinessById = async (req, res, next) => {
  try {
    const { businessId } = req.params;

    if (req.user.role === 'SYSTEM_OWNER') {
      const details = await getPlatformBusinessDetails(businessId);
      return res.status(200).json({
        success: true,
        message: 'Business retrieved successfully',
        data: details,
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Business retrieved successfully',
      data: {
        business,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update business status (ACTIVE / DISABLED).
 * Restricted to: SYSTEM_OWNER
 * PATCH /api/businesses/:businessId/status
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { status } = req.body;

    const updatedBusiness = await updateBusinessStatus(businessId, status);

    return res.status(200).json({
      success: true,
      message: `Business status updated to ${status}.`,
      data: {
        business: updatedBusiness,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get services for a specific business.
 * Allowed: SYSTEM_OWNER (any business) or BUSINESS_ADMIN (own business only).
 * Demonstrates tenant-scoped query filtering.
 * GET /api/businesses/:businessId/services
 */
export const getBusinessServices = async (req, res, next) => {
  try {
    const { businessId } = req.params;

    // getTenantFilter guarantees that for BUSINESS_ADMIN, query is strictly locked to req.user.businessId
    const filter = getTenantFilter(req.user, { businessId });
    const services = await Service.find(filter).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      data: {
        services,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a service within a business.
 * Allowed: BUSINESS_ADMIN (within their own business).
 * Demonstrates tenant-context enforcement on mutations.
 * POST /api/businesses/:businessId/services
 */
export const createBusinessService = async (req, res, next) => {
  try {
    // enforceTenantContext guarantees that req.user.businessId is authoritative
    const servicePayload = enforceTenantContext(req.body, req.user);

    if (!servicePayload.name || !servicePayload.durationMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Service name and durationMinutes are required.',
      });
    }

    const service = await Service.create({
      name: servicePayload.name,
      description: servicePayload.description || '',
      durationMinutes: servicePayload.durationMinutes,
      businessId: servicePayload.businessId,
      status: servicePayload.status || 'ACTIVE',
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: {
        service,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific service by ID.
 * Allowed: SYSTEM_OWNER or BUSINESS_ADMIN (matching tenant).
 * Demonstrates defense against direct-ID resource tampering (IDOR).
 * GET /api/businesses/:businessId/services/:serviceId
 */
export const getServiceById = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.',
      });
    }

    // Assert that the resource belongs to the requesting admin's business
    assertTenantOwnership(service, req.user);

    return res.status(200).json({
      success: true,
      message: 'Service retrieved successfully',
      data: {
        service,
      },
    });
  } catch (error) {
    next(error);
  }
};
