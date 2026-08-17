import type { NextFunction, Request, Response } from 'express';
import { auditLogService } from '../services/auditLog.service';
import type { AuditAction } from '../constants/enums.constant';

/**
 * Records an audit log entry after a successful (status < 400) response. Captures the
 * response body (via a res.json patch) so recordId can be read off the created/updated
 * resource without every controller having to log manually.
 */
export function audit(action: AuditAction, module: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    let capturedBody: unknown;

    res.json = ((body: unknown) => {
      capturedBody = body;
      return originalJson(body);
    }) as typeof res.json;

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const body = capturedBody as { data?: { _id?: string; id?: string } } | undefined;
      const recordId = req.params?.id || body?.data?._id || body?.data?.id;

      void auditLogService.log({
        userId: req.user?.userId,
        action,
        module,
        recordId: recordId ? String(recordId) : undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    });

    next();
  };
}
