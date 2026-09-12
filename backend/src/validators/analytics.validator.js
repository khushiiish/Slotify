import { z } from 'zod';

const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/**
 * Validation schema for analytics overview queries.
 * Supports preset ranges ('7d', '30d', '90d') or custom 'startDate' and 'endDate' (capped at 92 days).
 */
export const analyticsQuerySchema = z
  .object({
    range: z.enum(['7d', '30d', '90d'], {
      errorMap: () => ({ message: "Range must be '7d', '30d', or '90d'." }),
    }).optional(),
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
    businessId: z.any().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date.',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const diffDays = (end - start) / (1000 * 60 * 60 * 24);
        return diffDays <= 92;
      }
      return true;
    },
    {
      message: 'Date range cannot exceed 92 days (approximately 3 months).',
      path: ['endDate'],
    }
  );
