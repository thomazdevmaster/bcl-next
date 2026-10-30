'use client';

import { useMemo, useState } from 'react';
import { PortalPageHeader } from '@/components/public/PortalPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { AUTHENTICATED_ROLES, ROLE_LABEL, type AuthenticatedRole } from '@/core/auth/roles';
import {
  GAME_CATEGORIES,
  REGISTERED_GAMES,
  buildDefaultGameCatalog,
} from '@/domains/games/catalog';
import { canManageGamesCatalog } from '@/domains/games/gameAccess';
import { saveGameCatalogVisibility } from '@/domains/games/api';
import { useGameCatalog } from '@/domains/games/useGameCatalog';
import type {
  GameCatalogVisibility,
  GameDefinition,
  GameVisibilitySettings,
} from '@/domains/games/types';
import { userFacingError } from '@/lib/userMessages';

function toggleRole(
  settings: GameVisibilitySettings,
  role: AuthenticatedRole,
  checked: boolean,
): GameVisibilitySettings {
  const set = new Set(settings.visibleRoles);
  if (checked) set.add(role);
  else set.delete(role);
  return { ...settings, visibleRoles: AUTHENTICATED_ROLES.filter((r) => set.has(r)) };
}

function VisibilityTableRow({
  label,
  hint,
  settings,
  canEdit,
  onChange,
}: {
  label: string;
  hint?: string;
  settings: GameVisibilitySettings;
  canEdit: boolean;
  onChange: (next: GameVisibilitySettings) => void;
}) {
  return (
    <tr className="border-b border-[var(--border)] last:border-0">
      <th scope="row" className="min-w-[9rem] px-3 py-3 text-left align-top text-sm font-medium">
        <div>{label}</div>
        {hint ? <div className="mt-0.5 text-xs font-normal text-[var(--muted)]">{hint}</div> : null}
      </th>
      <td className="px-3 py-3 align-top">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-[var(--border)]"
            checked={settings.enabled}
            disabled={!canEdit}
            onChange={(event) => onChange({ ...settings, enabled: event.target.checked })}
          />
          Ativo
        </label>
      </td>
      {AUTHENTICATED_ROLES.map((role) => (
        <td key={role} className="px-2 py-3 text-center align-top">
          <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-[var(--border)]"
              checked={settings.visibleRoles.includes(role)}
              disabled={!canEdit || !settings.enabled}
              aria-label={`${label} — perfil ${ROLE_LABEL[role]}`}
              onChange={(event) => onChange(toggleRole(settings, role, event.target.checked))}
            />
          </label>
        </td>
      ))}
    </tr>
  );
}

export function GamesAdminWorkspace() {
  const { roles, permissions, isHydrated } = useAuth();
  const { catalog, setCatalog, loading, error, refresh } = useGameCatalog(isHydrated);
  const [draft, setDraft] = useState<GameCatalogVisibility | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const canEdit = canManageGamesCatalog(roles, permissions);
  const working = draft ?? catalog;

  const gamesByCategory = useMemo(() => {
    const map = new Map<string, GameDefinition[]>();
    for (const game of REGISTERED_GAMES) {
      const list = map.get(game.categoryId) ?? [];
      list.push(game);
      map.set(game.categoryId, list);
    }
    return map;
  }, []);

  const updateCategory = (id: (typeof GAME_CATEGORIES)[number]['id'], next: GameVisibilitySettings) => {
    setDraft((current) => {
      const base = current ?? catalog;
      return { ...base, categories: { ...base.categories, [id]: next } };
    });
    setSaveOk(false);
  };

  const updateGame = (gameId: string, next: GameVisibilitySettings) => {
    setDraft((current) => {
      const base = current ?? catalog;
      return { ...base, games: { ...base.games, [gameId]: next } };
    });
    setSaveOk(false);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const payload = draft ?? catalog;
      const saved = await saveGameCatalogVisibility(payload);
      setCatalog(saved);
      setDraft(null);
      setSaveOk(true);
    } catch (caught) {
      setSaveError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(buildDefaultGameCatalog());
    setSaveOk(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PortalPageHeader
        eyebrow="Gestão"
        title="Jogos educativos"
        description="Defina quais categorias e jogos ficam visíveis para cada perfil. Todo jogo novo deve ser registrado no código e aparecerá aqui para configuração."
      />

      {!canEdit ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-4 py-3 text-sm text-[var(--muted)]">
          Você pode consultar esta página, mas só perfis com permissão de edição em Jogos podem alterar a visibilidade.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {error}{' '}
          <button type="button" className="underline" onClick={() => void refresh()}>
            Tentar de novo
          </button>
        </p>
      ) : null}

      {saveError ? (
        <p className="rounded-xl border border-[var(--destructive)]/40 px-4 py-3 text-sm text-[var(--destructive)]" role="alert">
          {saveError}
        </p>
      ) : null}

      {saveOk ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-4 py-3 text-sm text-[var(--foreground)]" role="status">
          Configurações salvas.
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Categorias</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[640px] border-collapse text-[var(--foreground)]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--card-secondary)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <th scope="col" className="px-3 py-3 text-left">
                  Categoria
                </th>
                <th scope="col" className="px-3 py-3 text-left">
                  Status
                </th>
                {AUTHENTICATED_ROLES.map((role) => (
                  <th key={role} scope="col" className="px-2 py-3 text-center">
                    {ROLE_LABEL[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GAME_CATEGORIES.map((category) => (
                <VisibilityTableRow
                  key={category.id}
                  label={category.label}
                  hint={category.description}
                  settings={working.categories[category.id]}
                  canEdit={canEdit}
                  onChange={(next) => updateCategory(category.id, next)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Jogos cadastrados</h2>
        {REGISTERED_GAMES.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-sm text-[var(--muted)]">
            Nenhum jogo registrado ainda. Ao adicionar entradas em{' '}
            <code className="text-xs">src/domains/games/catalog.ts</code> (lista{' '}
            <code className="text-xs">REGISTERED_GAMES</code>), eles aparecerão nesta tabela.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--card-secondary)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th scope="col" className="px-3 py-3 text-left">
                    Jogo
                  </th>
                  <th scope="col" className="px-3 py-3 text-left">
                    Status
                  </th>
                  {AUTHENTICATED_ROLES.map((role) => (
                    <th key={role} scope="col" className="px-2 py-3 text-center">
                      {ROLE_LABEL[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GAME_CATEGORIES.flatMap((category) => {
                  const games = gamesByCategory.get(category.id) ?? [];
                  return games.map((game) => (
                    <VisibilityTableRow
                      key={game.id}
                      label={game.title}
                      hint={`${category.label} · ${game.description}`}
                      settings={
                        working.games[game.id] ?? {
                          enabled: true,
                          visibleRoles: [...AUTHENTICATED_ROLES],
                        }
                      }
                      canEdit={canEdit}
                      onChange={(next) => updateGame(game.id, next)}
                    />
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canEdit ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50"
            disabled={saving || loading}
            onClick={() => void handleSave()}
          >
            {saving ? 'Salvando…' : 'Salvar visibilidade'}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-medium disabled:opacity-50"
            disabled={saving || loading}
            onClick={handleReset}
          >
            Restaurar padrão
          </button>
        </div>
      ) : null}
    </div>
  );
}
