import { env } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, next) => {
  const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode <= 599
    ? err.statusCode
    : 500;

  const response = {
    success: false,
    message: err.message || 'Internal server error',
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
    if (env.NODE_ENV !== 'test') {
      console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
    }
  }

  res.status(statusCode).json(response);
};
