import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validation schema for creating a weekly recurring availability window.
 */
export const createAvailabilitySchema = z
  .object({
    dayOfWeek: z
      .number({ required_error: 'Day of week is required' })
      .int('Day of week must be an integer')
      .min(0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)')
      .max(6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'),
    startTime: z
      .string({ required_error: 'Start time is required' })
      .trim()
      .regex(TIME_REGEX, 'Start time must be in 24-hour format HH:mm (e.g., 09:00)'),
    endTime: z
      .string({ required_error: 'End time is required' })
      .trim()
      .regex(TIME_REGEX, 'End time must be in 24-hour format HH:mm (e.g., 17:00)'),
    staffId: z
      .string()
      .regex(OBJECT_ID_REGEX, 'Invalid staff ID format')
      .nullable()
      .optional()
      .or(z.literal('')),
    isActive: z.boolean().optional().default(true),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Start time must be strictly before end time',
    path: ['endTime'],
  });

/**
 * Validation schema for updating an existing availability window.
 */
export const updateAvailabilitySchema = z
  .object({
    dayOfWeek: z
      .number()
      .int('Day of week must be an integer')
      .min(0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)')
      .max(6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)')
      .optional(),
    startTime: z
      .string()
      .trim()
      .regex(TIME_REGEX, 'Start time must be in 24-hour format HH:mm (e.g., 09:00)')
      .optional(),
    endTime: z
      .string()
      .trim()
      .regex(TIME_REGEX, 'End time must be in 24-hour format HH:mm (e.g., 17:00)')
      .optional(),
    staffId: z
      .string()
      .regex(OBJECT_ID_REGEX, 'Invalid staff ID format')
      .nullable()
      .optional()
      .or(z.literal('')),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update availability',
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: 'Start time must be strictly before end time',
      path: ['endTime'],
    }
  );

/**
 * Validation schema for querying available appointment slots.
 */
export const slotQuerySchema = z.object({
  serviceId: z
    .string({ required_error: 'Service ID is required' })
    .regex(OBJECT_ID_REGEX, 'Invalid service ID format'),
  date: z
    .string({ required_error: 'Date is required (YYYY-MM-DD)' })
    .regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format'),
  staffId: z
    .string()
    .regex(OBJECT_ID_REGEX, 'Invalid staff ID format')
    .optional()
    .or(z.literal('')),
});
