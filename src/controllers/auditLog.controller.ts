import type { Request, Response } from 'express';
import { auditLogService } from '../services/auditLog.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { parseListQuery } from '../utils/pagination';

export const auditLogController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, unknown>;
    const query = {
      ...parseListQuery(q),
      action: q.action ? String(q.action) : undefined,
      module: q.module ? String(q.module) : undefined,
      userId: q.userId ? String(q.userId) : undefined,
    };
    const { data, pagination } = await auditLogService.findAll(query);
    return ok(res, 'Audit logs fetched successfully', data, pagination);
  }),
};
