import {
  createAvailability,
  listAvailability,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
} from '../services/availability.service.js';
import { generateAvailableSlots } from '../services/slotGeneration.service.js';

export const create = async (req, res, next) => {
  try {
    const availability = await createAvailability(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Availability window created successfully.',
      data: { availability },
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const availability = await listAvailability(req.user, req.query);
    return res.status(200).json({
      success: true,
      message: 'Availability retrieved successfully.',
      data: { availability },
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const availability = await getAvailabilityById(req.user, id);
    return res.status(200).json({
      success: true,
      message: 'Availability window retrieved successfully.',
      data: { availability },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const availability = await updateAvailability(req.user, id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Availability window updated successfully.',
      data: { availability },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteAvailability(req.user, id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getSlotsPreview = async (req, res, next) => {
  try {
    const { serviceId, date, staffId } = req.validatedQuery || req.query;
    const result = await generateAvailableSlots(req.user, {
      serviceId,
      dateStr: date,
      staffId,
    });
    return res.status(200).json({
      success: true,
      message: 'Available slots calculated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
