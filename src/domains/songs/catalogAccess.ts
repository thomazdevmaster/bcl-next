import { can } from '@/core/auth/permissions';
import { hasRole } from '@/core/auth/roles';
import type { AccessRoles } from '@/core/auth/roles';

import type { Song } from './types';
import {
  canReachSongRepertory,
  canViewPrivateSongsAsMusician,
  canViewPrivateSongsAsStudent,
} from './songAccess';

/** Espelha `SongVisibility` na API (permisões do papel, não nomes fixos de role). */
export function isSongVisibleInCatalog(
  song: Pick<Song, 'visibility' | 'visibleToStudents' | 'visibleToMusicians'>,
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  if (hasRole(roles, 'admin') || can(roles, 'songs', 'update', permissions)) {
    return true;
  }
  if (!canReachSongRepertory(roles, permissions)) {
    return false;
  }
  if (song.visibility === 'public') {
    return true;
  }
  if (canViewPrivateSongsAsStudent(roles, permissions) && song.visibleToStudents) {
    return true;
  }
  if (canViewPrivateSongsAsMusician(roles, permissions) && song.visibleToMusicians) {
    return true;
  }
  return false;
}

export function filterSongsForCatalog(
  songs: Song[],
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): Song[] {
  return songs.filter((song) => isSongVisibleInCatalog(song, roles, permissions));
}

export function filterSongRecordsForCatalog(
  rows: Record<string, unknown>[],
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): Record<string, unknown>[] {
  return rows.filter((row) =>
    isSongVisibleInCatalog(
      {
        visibility: row.visibility === 'public' ? 'public' : 'private',
        visibleToStudents: Boolean(row.visibleToStudents),
        visibleToMusicians: Boolean(row.visibleToMusicians),
      },
      roles,
      permissions,
    ),
  );
}
