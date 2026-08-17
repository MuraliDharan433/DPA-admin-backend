import { Types } from 'mongoose';
import { NotificationModel } from '../models/Notification.model';
import { paginate, type ListQuery } from '../utils/pagination';
import { emitToUsers } from '../sockets/io';
import { ApiError } from '../utils/apiResponse';
import type { NotificationType } from '../constants/enums.constant';

export const notificationService = {
  async createForUsers(
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
  },

  findForUser(userId: string, query: ListQuery) {
    return paginate(NotificationModel, { recipient: userId }, { ...query, sortBy: query.sortBy || 'createdAt' });
  },

  unreadCount(userId: string) {
    return NotificationModel.countDocuments({ recipient: userId, isRead: false });
  },

  async markAsRead(id: string, userId: string) {
    const notification = await NotificationModel.findOne({ _id: id, recipient: userId });
    if (!notification) throw ApiError.notFound('Notification not found');
    notification.isRead = true;
    await notification.save();
    return notification;
  },

  async markAllAsRead(userId: string) {
    await NotificationModel.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true } });
  },
};
