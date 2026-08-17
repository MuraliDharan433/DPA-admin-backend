import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const globalRateLimiter = rateLimit({
  windowMs: env.throttle.windowMs,
  limit: env.throttle.limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later', code: 'TOO_MANY_REQUESTS' },
});

export const publicEnquiryRateLimiter = rateLimit({
  windowMs: env.throttle.publicEnquiryWindowMs,
  limit: env.throttle.publicEnquiryLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many enquiries submitted - please try again in a minute',
    code: 'TOO_MANY_REQUESTS',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later', code: 'TOO_MANY_REQUESTS' },
});
