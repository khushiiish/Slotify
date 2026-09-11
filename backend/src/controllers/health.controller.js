import { env } from '../config/env.js';

export const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Slotify API is running',
    data: {
      environment: env.NODE_ENV,
    },
  });
};
