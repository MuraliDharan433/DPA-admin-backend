import { UserModel, IUser } from '../models/User.model';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';
import { UserStatus } from '../constants/enums.constant';

export const userRepository = {
  findAll(query: ListQuery) {
    const filter = buildSearchFilter(query.search, ['firstName', 'lastName', 'email', 'mobile']);
    return paginate<IUser>(UserModel, filter, query, 'role');
  },

  findById(id: string) {
    return UserModel.findById(id).populate('role');
  },

  findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() });
  },

  findByEmailWithSecrets(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() })
      .select('+passwordHash +refreshTokenHash')
      .populate('role');
  },

  findByPasswordResetTokenHash(tokenHash: string) {
    return UserModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    })
      .select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash')
      .populate('role');
  },

  findByRoleId(roleId: string) {
    return UserModel.find({ role: roleId, status: UserStatus.ACTIVE })
      .select('firstName lastName email')
      .sort({ firstName: 1 });
  },

  findByRoleIds(roleIds: string[]) {
    return UserModel.find({ role: { $in: roleIds }, status: UserStatus.ACTIVE })
      .select('firstName lastName email')
      .sort({ firstName: 1 });
  },

  create(data: Partial<IUser>) {
    return UserModel.create(data);
  },

  async updateById(id: string, update: Partial<IUser>) {
    const user = await UserModel.findById(id);
    if (!user) return null;
    Object.assign(user, update);
    await user.save();
    return user;
  },

  deleteById(id: string) {
    return UserModel.deleteOne({ _id: id });
  },
};
