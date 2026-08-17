import { AuditLogModel } from '../models/AuditLog.model';
import { paginate, type ListQuery } from '../utils/pagination';
import type { AuditAction } from '../constants/enums.constant';
import { logger } from '../utils/logger';

export interface LogEntryParams {
  userId?: string;
  action: AuditAction;
  module: string;
  recordId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export const auditLogService = {
  async log(params: LogEntryParams) {
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
      // Audit logging must never break the primary request/response flow.
      logger.warn('Failed to write audit log', err);
    }
  },

  findAll(query: ListQuery & { action?: string; module?: string; userId?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.action) filter.action = query.action;
    if (query.module) filter.module = query.module;
    if (query.userId) filter.user = query.userId;
    return paginate(AuditLogModel, filter, { ...query, sortBy: query.sortBy || 'createdAt' }, 'user');
  },
};
