import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validation schema for creating a blocked date.
 */
export const createBlockedDateSchema = z.object({
  date: z
    .string({ required_error: 'Date is required (YYYY-MM-DD)' })
    .regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format'),
  reason: z
    .string()
    .trim()
    .max(200, 'Reason cannot exceed 200 characters')
    .optional()
    .or(z.literal('')),
  staffId: z
    .string()
    .regex(OBJECT_ID_REGEX, 'Invalid staff ID format')
    .nullable()
    .optional()
    .or(z.literal('')),
});

/**
 * Validation schema for updating a blocked date.
 */
export const updateBlockedDateSchema = z
  .object({
    date: z
      .string()
      .regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format')
      .optional(),
    reason: z
      .string()
      .trim()
      .max(200, 'Reason cannot exceed 200 characters')
      .optional()
      .or(z.literal('')),
    staffId: z
      .string()
      .regex(OBJECT_ID_REGEX, 'Invalid staff ID format')
      .nullable()
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update blocked date',
  });
