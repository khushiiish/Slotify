import { z } from 'zod';

/**
 * Validation schema for business onboarding with initial admin.
 */
export const createBusinessSchema = z.object({
  name: z
    .string({ required_error: 'Business name is required' })
    .trim()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly (lowercase letters, numbers, hyphens)')
    .optional()
    .or(z.literal('')),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid contact email address')
    .optional()
    .or(z.literal('')),
  contactPhone: z
    .string()
    .trim()
    .max(30, 'Contact phone cannot exceed 30 characters')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .trim()
    .max(250, 'Address cannot exceed 250 characters')
    .optional()
    .or(z.literal('')),
  timezone: z
    .string()
    .trim()
    .default('Asia/Kolkata'),
  adminName: z
    .string({ required_error: 'Initial admin name is required' })
    .trim()
    .min(2, 'Admin name must be at least 2 characters')
    .max(100, 'Admin name cannot exceed 100 characters'),
  adminEmail: z
    .string({ required_error: 'Initial admin email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid admin email address'),
  adminPassword: z
    .string({ required_error: 'Initial admin password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
});

/**
 * Validation schema for updating business status (ACTIVE / DISABLED).
 */
export const updateBusinessStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED'], {
    message: 'Status must be either ACTIVE or DISABLED',
  }),
});
