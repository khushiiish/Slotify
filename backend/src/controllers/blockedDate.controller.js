import {
  createBlockedDate,
  listBlockedDates,
  getBlockedDateById,
  updateBlockedDate,
  deleteBlockedDate,
} from '../services/blockedDate.service.js';

export const create = async (req, res, next) => {
  try {
    const blockedDate = await createBlockedDate(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Blocked date created successfully.',
      data: { blockedDate },
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const blockedDates = await listBlockedDates(req.user);
    return res.status(200).json({
      success: true,
      message: 'Blocked dates retrieved successfully.',
      data: { blockedDates },
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blockedDate = await getBlockedDateById(req.user, id);
    return res.status(200).json({
      success: true,
      message: 'Blocked date retrieved successfully.',
      data: { blockedDate },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blockedDate = await updateBlockedDate(req.user, id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Blocked date updated successfully.',
      data: { blockedDate },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteBlockedDate(req.user, id);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
