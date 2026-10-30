import { apiFetch, ApiError } from '@/lib/api';
import { buildDefaultGameCatalog } from '@/domains/games/catalog';
import { mergeCatalogWithDefaults } from '@/domains/games/visibility';
import type { GameCatalogVisibility } from '@/domains/games/types';

export async function fetchGameCatalogVisibility(): Promise<GameCatalogVisibility> {
  const defaults = buildDefaultGameCatalog();
  try {
    const remote = await apiFetch<Partial<GameCatalogVisibility>>('/games/catalog');
    return mergeCatalogWithDefaults(remote, defaults);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
      return defaults;
    }
    throw error;
  }
}

export async function saveGameCatalogVisibility(
  payload: GameCatalogVisibility,
): Promise<GameCatalogVisibility> {
  try {
    const saved = await apiFetch<GameCatalogVisibility>('/games/catalog', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return mergeCatalogWithDefaults(saved, buildDefaultGameCatalog());
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
      throw new ApiError(
        'A API ainda não expõe a gestão de jogos. As alterações não foram salvas no servidor.',
        error.status,
      );
    }
    throw error;
  }
}
