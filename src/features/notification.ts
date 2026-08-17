import { Router } from 'express';
import { Types } from 'mongoose';
import { NotificationModel } from '../models/Notification.model';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, ApiError } from '../utils/apiResponse';
import { paginate, parseListQuery } from '../utils/pagination';
import { emitToUsers } from '../sockets/io';
import type { NotificationType } from '../constants/enums.constant';

// ------------------------------------------------------------------- helpers
// Other features call this to notify users; it also pushes over Socket.IO live.

export async function notifyUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  message?: string,
  link?: string,
) {
  if (userIds.length === 0) return;

  const docs = await NotificationModel.insertMany(
    userIds.map((recipient) => ({ recipient: new Types.ObjectId(recipient), type, title, message, link })),
  );

  for (const doc of docs) {
    emitToUsers([doc.recipient.toString()], 'notification', {
      _id: doc._id,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      link: doc.link,
      isRead: doc.isRead,
      createdAt: doc.createdAt,
    });
  }
}

// -------------------------------------------------------------------- routes

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseListQuery(req.query as Record<string, unknown>);
    const { data, pagination } = await paginate(
      NotificationModel,
      { recipient: req.user!.userId },
      { ...query, sortBy: query.sortBy || 'createdAt' },
    );
    return ok(res, 'Notifications fetched successfully', data, pagination);
  }),
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await NotificationModel.countDocuments({ recipient: req.user!.userId, isRead: false });
    return ok(res, 'Unread count fetched successfully', count);
  }),
);

router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await NotificationModel.updateMany(
      { recipient: req.user!.userId, isRead: false },
      { $set: { isRead: true } },
    );
    return ok(res, 'All notifications marked as read', null);
  }),
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = await NotificationModel.findOne({ _id: req.params.id, recipient: req.user!.userId });
    if (!notification) throw ApiError.notFound('Notification not found');
    notification.isRead = true;
    await notification.save();
    return ok(res, 'Notification marked as read', notification);
  }),
);

export default router;
