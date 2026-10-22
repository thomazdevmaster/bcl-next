import { can } from '@/core/auth/permissions';
import { hasRole } from '@/core/auth/roles';
import type { AccessRoles } from '@/core/auth/roles';

import type { Song } from './types';

/** Espelha `SongVisibility` / `SongService.visible` na API. */
export function isSongVisibleInCatalog(
  song: Pick<Song, 'visibility' | 'visibleToStudents' | 'visibleToMusicians'>,
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  if (hasRole(roles, 'admin') || hasRole(roles, 'maestro')) {
    return true;
  }
  if (can(roles, 'songs', 'update', permissions)) {
    return true;
  }
  if (song.visibility === 'public') {
    return true;
  }
  if (hasRole(roles, 'aluno') && song.visibleToStudents) {
    return true;
  }
  if (hasRole(roles, 'musico') && song.visibleToMusicians) {
    return true;
  }
  return false;
}

/** @deprecated Use {@link isSongVisibleInCatalog}; mantido para leituras que assumiam `songs:read` = catálogo inteiro. */
export function canReadPrivateSongs(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  return (
    hasRole(roles, 'admin') ||
    hasRole(roles, 'maestro') ||
    can(roles, 'songs', 'update', permissions) ||
    hasRole(roles, 'aluno') ||
    hasRole(roles, 'musico')
  );
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
