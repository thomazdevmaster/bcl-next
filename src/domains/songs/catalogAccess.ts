import { can } from '@/core/auth/permissions';
import type { AccessRoles } from '@/core/auth/roles';

import type { Song } from './types';

/** Repertório completo (público + privado) exige `songs:read`. */
export function canReadPrivateSongs(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  return can(roles, 'songs', 'read', permissions);
}

export function filterSongsForCatalog(
  songs: Song[],
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): Song[] {
  if (canReadPrivateSongs(roles, permissions)) return songs;
  return songs.filter((song) => song.visibility === 'public');
}

export function isSongVisibleInCatalog(
  song: Song,
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  if (canReadPrivateSongs(roles, permissions)) return true;
  return song.visibility === 'public';
}
