import type { PermissionKey } from '../constants/permissions.constant';
import { ALL_PERMISSIONS } from '../constants/permissions.constant';
import { RoleName } from '../constants/roles.constant';

interface RoleLike {
  name: string;
  permissions: PermissionKey[];
}
interface UserLike {
  permissionOverrides?: { grant: PermissionKey[]; revoke: PermissionKey[] };
}

/** role permissions ∪ grant − revoke. Owner always has every permission. */
export function computeEffectivePermissions(role: RoleLike, user: UserLike): PermissionKey[] {
  if (role.name === RoleName.OWNER) return [...ALL_PERMISSIONS];

  const grant = user.permissionOverrides?.grant || [];
  const revoke = new Set(user.permissionOverrides?.revoke || []);

  const merged = new Set<PermissionKey>([...role.permissions, ...grant]);
  for (const key of revoke) merged.delete(key);

  return Array.from(merged);
}
