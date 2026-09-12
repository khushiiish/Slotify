import { env } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, next) => {
  // Handle Mongoose CastError (e.g. malformed ObjectId)
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = 'Invalid resource identifier format.';
  }

  const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode <= 599
    ? err.statusCode
    : 500;

  let message = err.message || 'Internal server error';

  // Production error masking for unexpected internal errors
  if (statusCode === 500 && env.NODE_ENV === 'production') {
    message = 'An unexpected internal error occurred. Please try again later.';
  }

  const response = {
    success: false,
    message,
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
    if (env.NODE_ENV !== 'test') {
      console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
    }
  }

  res.status(statusCode).json(response);
};
