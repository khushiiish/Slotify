import {
  createService,
  listServices,
  getServiceById,
  updateService,
  deleteService,
} from '../services/service.service.js';

/**
 * Controller for Service CRUD operations.
 * Thin HTTP handler delegating business logic to service.service.js.
 */

export const create = async (req, res, next) => {
  try {
    const service = await createService(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: { service },
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const services = await listServices(req.user);
    return res.status(200).json({
      success: true,
      message: 'Services retrieved successfully.',
      data: { services },
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const service = await getServiceById(req.user, serviceId);
    return res.status(200).json({
      success: true,
      message: 'Service retrieved successfully.',
      data: { service },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const service = await updateService(req.user, serviceId, req.body);
    return res.status(200).json({
      success: true,
      message: 'Service updated successfully.',
      data: { service },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const result = await deleteService(req.user, serviceId);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
