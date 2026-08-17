import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Mongoose duplicate key error
  if (isMongoDuplicateKeyError(err)) {
    return res.status(409).json({
      success: false,
      message: 'A record with these details already exists',
      code: 'CONFLICT',
    });
  }

  logger.error(`${req.method} ${req.originalUrl} - Unhandled exception`, err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
    code: 'INTERNAL_SERVER_ERROR',
  });
}

function isMongoDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
