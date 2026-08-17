import type { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { parseListQuery } from '../utils/pagination';

export const notificationController = {
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { data, pagination } = await notificationService.findForUser(
      req.user!.userId,
      parseListQuery(req.query as Record<string, unknown>),
    );
    return ok(res, 'Notifications fetched successfully', data, pagination);
  }),
  unreadCount: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.unreadCount(req.user!.userId);
    return ok(res, 'Unread count fetched successfully', data);
  }),
  markAsRead: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.markAsRead(req.params.id, req.user!.userId);
    return ok(res, 'Notification marked as read', data);
  }),
  markAllAsRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllAsRead(req.user!.userId);
    return ok(res, 'All notifications marked as read', null);
  }),
};
