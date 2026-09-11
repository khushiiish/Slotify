import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { errorMiddleware } from '../src/middleware/error.middleware.js';

describe('Phase 0 Foundation Endpoints', () => {
  describe('GET / (Root API)', () => {
    it('should return 200 and a welcome message', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toEqual({
        success: true,
        message: 'Welcome to Slotify API',
      });
    });
  });

  describe('GET /api/health (Health Check)', () => {
    it('should return 200 with success: true and environment info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Slotify API is running');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.environment).toBeDefined();
    });
  });

  describe('404 Not Found Handling', () => {
    it('should return 404 and structured JSON when route does not exist', async () => {
      const res = await request(app).get('/api/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Route not found');
    });
  });

  describe('Centralized Error Handling Middleware', () => {
    it('should format errors as standard JSON with default 500 status', () => {
      let statusCode = null;
      let jsonPayload = null;

      const mockReq = { method: 'GET', originalUrl: '/test-error' };
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        json: (payload) => {
          jsonPayload = payload;
          return mockRes;
        },
      };
      const mockNext = () => {};

      const error = new Error('Simulated internal failure');
      errorMiddleware(error, mockReq, mockRes, mockNext);

      expect(statusCode).toBe(500);
      expect(jsonPayload).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Simulated internal failure',
        })
      );
    });

    it('should preserve custom error status codes', () => {
      let statusCode = null;
      let jsonPayload = null;

      const mockReq = { method: 'POST', originalUrl: '/test-error' };
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return mockRes;
        },
        json: (payload) => {
          jsonPayload = payload;
          return mockRes;
        },
      };
      const mockNext = () => {};

      const customError = new Error('Bad request parameters');
      customError.statusCode = 400;

      errorMiddleware(customError, mockReq, mockRes, mockNext);

      expect(statusCode).toBe(400);
      expect(jsonPayload.success).toBe(false);
      expect(jsonPayload.message).toBe('Bad request parameters');
    });
  });

  describe('Security Headers', () => {
    it('should include Helmet security headers', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });
});
