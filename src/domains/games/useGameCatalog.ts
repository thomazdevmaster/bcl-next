'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchGameCatalogVisibility } from '@/domains/games/api';
import type { GameCatalogVisibility } from '@/domains/games/types';
import { buildDefaultGameCatalog } from '@/domains/games/catalog';
import { userFacingError } from '@/lib/userMessages';

export function useGameCatalog(enabled: boolean) {
  const [catalog, setCatalog] = useState<GameCatalogVisibility>(() =>
    buildDefaultGameCatalog(),
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchGameCatalogVisibility();
      setCatalog(next);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { catalog, setCatalog, loading, error, refresh };
}
