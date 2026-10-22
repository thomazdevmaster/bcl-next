import { can, type Action, type Resource } from '@/core/auth/permissions';
import type { AccessRoles } from '@/core/auth/roles';

const READ_PRIVATE_STUDENT = 'read_private_student' as Action;
const READ_PRIVATE_MUSICIAN = 'read_private_musician' as Action;

export function canAccessStudyModule(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  return can(roles, 'study' as Resource, 'read', permissions);
}

export function canAccessSongsModule(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  return can(roles, 'songs', 'read', permissions);
}

export function canReachSongRepertory(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  return canAccessStudyModule(roles, permissions) || canAccessSongsModule(roles, permissions);
}

export function canViewPrivateSongsAsStudent(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  return can(roles, 'songs', READ_PRIVATE_STUDENT, permissions);
}

export function canViewPrivateSongsAsMusician(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  return can(roles, 'songs', READ_PRIVATE_MUSICIAN, permissions);
}

/** Sem privadas nem gestão editorial — só repertório público (ex.: perfil amigos). */
export function seesPublicRepertoireOnly(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  if (!canReachSongRepertory(roles, permissions)) return false;
  if (can(roles, 'songs' as Resource, 'update', permissions)) return false;
  if (canViewPrivateSongsAsStudent(roles, permissions)) return false;
  if (canViewPrivateSongsAsMusician(roles, permissions)) return false;
  return true;
}

/** @deprecated Use {@link seesPublicRepertoireOnly}. */
export const seesPublicStudyRepertoireOnly = seesPublicRepertoireOnly;
