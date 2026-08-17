import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from '../utils/apiResponse';

type Target = 'body' | 'query' | 'params';

/**
 * Validates and (via Zod's parse) sanitizes/coerces req[target] in place, replacing it
 * with the parsed value. Whitelists by construction - unknown keys are dropped by Zod's
 * default object parsing unless a schema explicitly uses .passthrough().
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.errors
        .map((e) => `${e.path.join('.') || target}: ${e.message}`)
        .join('; ');
      return next(ApiError.badRequest(message));
    }
    req[target] = result.data;
    next();
  };
}
