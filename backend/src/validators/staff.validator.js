import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Validation schema for creating a new staff member.
 */
export const createStaffSchema = z.object({
  name: z
    .string({ required_error: 'Staff name is required' })
    .trim()
    .min(2, 'Staff name must be at least 2 characters')
    .max(100, 'Staff name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone cannot exceed 30 characters')
    .optional()
    .or(z.literal('')),
  status: z
    .enum(['ACTIVE', 'INACTIVE'], {
      message: 'Status must be either ACTIVE or INACTIVE',
    })
    .optional()
    .default('ACTIVE'),
  serviceIds: z
    .array(
      z.string().regex(OBJECT_ID_REGEX, 'Each service ID must be a valid 24-character hexadecimal ID')
    )
    .optional()
    .default([]),
});

/**
 * Validation schema for updating an existing staff member.
 */
export const updateStaffSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Staff name must be at least 2 characters')
      .max(100, 'Staff name cannot exceed 100 characters')
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address')
      .optional()
      .or(z.literal('')),
    phone: z
      .string()
      .trim()
      .max(30, 'Phone cannot exceed 30 characters')
      .optional()
      .or(z.literal('')),
    status: z
      .enum(['ACTIVE', 'INACTIVE'], {
        message: 'Status must be either ACTIVE or INACTIVE',
      })
      .optional(),
    serviceIds: z
      .array(
        z.string().regex(OBJECT_ID_REGEX, 'Each service ID must be a valid 24-character hexadecimal ID')
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update staff',
  });
