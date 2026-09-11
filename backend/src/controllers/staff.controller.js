import {
  createStaff,
  listStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
} from '../services/staff.service.js';

/**
 * Controller for Staff CRUD operations.
 * Thin HTTP handler delegating business logic to staff.service.js.
 */

export const create = async (req, res, next) => {
  try {
    const staff = await createStaff(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Staff member created successfully.',
      data: { staff },
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const staffList = await listStaff(req.user);
    return res.status(200).json({
      success: true,
      message: 'Staff retrieved successfully.',
      data: { staff: staffList },
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const staff = await getStaffById(req.user, staffId);
    return res.status(200).json({
      success: true,
      message: 'Staff member retrieved successfully.',
      data: { staff },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const staff = await updateStaff(req.user, staffId, req.body);
    return res.status(200).json({
      success: true,
      message: 'Staff member updated successfully.',
      data: { staff },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const result = await deleteStaff(req.user, staffId);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
