import { Router } from 'express';
import { AuditLogModel } from '../models/AuditLog.model';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermissions } from '../middleware/permissions.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { paginate, parseListQuery } from '../utils/pagination';
import { logger } from '../utils/logger';
import { PERMISSIONS } from '../constants/permissions.constant';
import type { AuditAction } from '../constants/enums.constant';

// ------------------------------------------------------------------- helpers

export interface LogEntryParams {
  userId?: string;
  action: AuditAction;
  module: string;
  recordId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/** Used by the audit middleware and by auth. Never throws - audit logging must not
 *  break the primary request/response flow. */
export async function writeAuditLog(params: LogEntryParams) {
  try {
    await AuditLogModel.create({
      user: params.userId,
      action: params.action,
      module: params.module,
      recordId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });
  } catch (err) {
    logger.warn('Failed to write audit log', err);
  }
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermissions(PERMISSIONS.AUDIT_LOGS_VIEW),
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, unknown>;
    const query = parseListQuery(q);

    const filter: Record<string, unknown> = {};
    if (q.action) filter.action = String(q.action);
    if (q.module) filter.module = String(q.module);
    if (q.userId) filter.user = String(q.userId);

    const { data, pagination } = await paginate(
      AuditLogModel,
      filter,
      { ...query, sortBy: query.sortBy || 'createdAt' },
      'user',
    );
    return ok(res, 'Audit logs fetched successfully', data, pagination);
  }),
);

export default router;
