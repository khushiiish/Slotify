import { z } from 'zod';

/**
 * Validation schema for creating a new service.
 */
export const createServiceSchema = z.object({
  name: z
    .string({ required_error: 'Service name is required' })
    .trim()
    .min(2, 'Service name must be at least 2 characters')
    .max(100, 'Service name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  durationMinutes: z
    .number({ required_error: 'Duration in minutes is required' })
    .int('Duration must be an integer number of minutes')
    .positive('Duration must be a positive integer')
    .max(1440, 'Duration cannot exceed 1440 minutes (24 hours)'),
  status: z
    .enum(['ACTIVE', 'INACTIVE'], {
      message: 'Status must be either ACTIVE or INACTIVE',
    })
    .optional()
    .default('ACTIVE'),
});

/**
 * Validation schema for updating an existing service.
 */
export const updateServiceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Service name must be at least 2 characters')
      .max(100, 'Service name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
    durationMinutes: z
      .number()
      .int('Duration must be an integer number of minutes')
      .positive('Duration must be a positive integer')
      .max(1440, 'Duration cannot exceed 1440 minutes (24 hours)')
      .optional(),
    status: z
      .enum(['ACTIVE', 'INACTIVE'], {
        message: 'Status must be either ACTIVE or INACTIVE',
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update service',
  });
