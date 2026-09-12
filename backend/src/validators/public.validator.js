import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validation schema for public slot discovery queries.
 */
export const publicSlotQuerySchema = z
  .object({
    serviceId: z
      .string({ required_error: 'Service ID is required.' })
      .trim()
      .regex(OBJECT_ID_REGEX, 'Service ID must be a valid 24-character ObjectId.'),
    date: z
      .string({ required_error: 'Date is required.' })
      .trim()
      .regex(DATE_REGEX, 'Date must be formatted as YYYY-MM-DD.'),
    staffId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'Staff ID must be a valid 24-character ObjectId.')
      .nullable()
      .optional(),
  })
  .strict();

/**
 * Validation schema for public appointment booking.
 */
export const publicBookingSchema = z
  .object({
    serviceId: z
      .string({ required_error: 'Service ID is required.' })
      .trim()
      .regex(OBJECT_ID_REGEX, 'Service ID must be a valid 24-character ObjectId.'),
    staffId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'Staff ID must be a valid 24-character ObjectId.')
      .nullable()
      .optional(),
    date: z
      .string({ required_error: 'Appointment date is required.' })
      .trim()
      .regex(DATE_REGEX, 'Date must be formatted as YYYY-MM-DD.'),
    startTime: z
      .string({ required_error: 'Start time is required.' })
      .trim()
      .regex(TIME_REGEX, 'Start time must be formatted as HH:mm in 24-hour time.')
      .refine(
        (val) => {
          const [, mins] = val.split(':').map(Number);
          return mins % 15 === 0;
        },
        {
          message: 'Start time must align with the 15-minute booking interval (:00, :15, :30, :45).',
        }
      ),
    customerName: z
      .string({ required_error: 'Customer name is required.' })
      .trim()
      .min(2, 'Customer name must be at least 2 characters.')
      .max(100, 'Customer name cannot exceed 100 characters.'),
    customerEmail: z
      .string({ required_error: 'Customer email is required.' })
      .trim()
      .email('Please provide a valid customer email address.'),
    customerPhone: z
      .string()
      .trim()
      .max(30, 'Customer phone cannot exceed 30 characters.')
      .optional(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters.')
      .optional(),
  })
  .strict();
