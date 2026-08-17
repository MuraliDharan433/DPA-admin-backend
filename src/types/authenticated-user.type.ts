import type { PermissionKey } from '../constants/permissions.constant';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: PermissionKey[];
}

/** Shape returned to the client on login/refresh - unlike AuthenticatedUser (from JWT claims), this
 * comes straight from the user document so it can include display fields like name. */
export interface AuthenticatedUserView extends AuthenticatedUser {
  firstName: string;
  lastName: string;
}
