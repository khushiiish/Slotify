import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validation schema for creating a new appointment.
 */
export const createAppointmentSchema = z
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
    businessId: z.any().optional(),
  });

/**
 * Validation schema for querying appointments with optional filters.
 */
export const getAppointmentsQuerySchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'Date must be formatted as YYYY-MM-DD.')
      .optional(),
    startDate: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'Start date must be formatted as YYYY-MM-DD.')
      .optional(),
    endDate: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'End date must be formatted as YYYY-MM-DD.')
      .optional(),
    status: z
      .enum(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], {
        errorMap: () => ({
          message: "Status must be 'CONFIRMED', 'COMPLETED', 'CANCELLED', or 'NO_SHOW'.",
        }),
      })
      .optional(),
    staffId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'Staff ID must be a valid 24-character ObjectId.')
      .optional(),
    serviceId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'Service ID must be a valid 24-character ObjectId.')
      .optional(),
    search: z
      .string()
      .trim()
      .max(100, 'Search query cannot exceed 100 characters.')
      .optional(),
    page: z
      .coerce
      .number()
      .int()
      .min(1, 'Page must be at least 1.')
      .optional(),
    limit: z
      .coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1.')
      .max(100, 'Limit cannot exceed 100.')
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date.',
      path: ['startDate'],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        return diffDays <= 62;
      }
      return true;
    },
    {
      message: 'Date range cannot exceed 62 days (approximately 2 months).',
      path: ['endDate'],
    }
  );

/**
 * Validation schema for updating appointment status.
 */
export const updateAppointmentStatusSchema = z
  .object({
    status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], {
      required_error: 'Status is required.',
      errorMap: () => ({
        message: "Status must be 'CONFIRMED', 'COMPLETED', 'CANCELLED', or 'NO_SHOW'.",
      }),
    }),
    businessId: z.any().optional(),
  })
  .strict();


