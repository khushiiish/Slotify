import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

/**
 * Express middleware to validate request body against a Zod schema.
 * Formats errors consistently with the centralized API error format.
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const firstError = result.error.issues?.[0]?.message || 'Invalid input data';
    return res.status(400).json({
      success: false,
      message: firstError,
    });
  }
  req.body = result.data;
  next();
};
