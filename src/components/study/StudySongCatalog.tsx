'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Song } from '@/domains/songs/types';
import { apiFetch } from '@/lib/api';
import { failureMessage } from '@/lib/userMessages';
import {
  extractInstrumentsFromXml,
  type InstrumentInfo,
} from '@/study/studyUtils';

export interface StudyStartOptions {
  song: Song;
  xml: string;
  scoreInstrumentIds: string[];
  midiInstrumentIds: string[];
}

interface StudySongCatalogProps {
  onStart: (options: StudyStartOptions) => void;
}

interface SetupState {
  song: Song;
  xml: string;
  instruments: InstrumentInfo[];
  scoreInstrumentIds: string[];
  midiInstrumentIds: string[];
}

export function StudySongCatalog({ onStart }: StudySongCatalogProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [setup, setSetup] = useState<SetupState | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<Song[]>('/songs')
      .then((items) => {
        if (active) {
          setSongs(
            items.filter((song) =>
              song.scores?.some((score) => Boolean(score.url)),
            ),
          );
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(failureMessage(caught, 'Não foi possível carregar as músicas para estudo.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleSongs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return songs;
    return songs.filter((song) =>
      [song.title, song.composer, song.arranger, song.genre].some((value) =>
        String(value ?? '').toLocaleLowerCase('pt-BR').includes(query),
      ),
    );
  }, [search, songs]);

  const openSetup = async (song: Song) => {
    const score = song.scores.find((item) => Boolean(item.url));
    if (!score) return;
    setPreparingId(String(song.id));
    setError(null);
    try {
      const response = await fetch(score.url);
      if (!response.ok) throw new Error('score_fetch_failed');
      const xml = await response.text();
      const instruments = extractInstrumentsFromXml(xml);
      const allIds = instruments.map((instrument) => instrument.id);
      setSetup({
        song,
        xml,
        instruments,
        scoreInstrumentIds: allIds,
        midiInstrumentIds: allIds,
      });
    } catch (caught) {
      setError(failureMessage(caught, `Não foi possível preparar a partitura de ${song.title}.`));
    } finally {
      setPreparingId(null);
    }
  };

  const toggleInstrument = (
    field: 'scoreInstrumentIds' | 'midiInstrumentIds',
    instrumentId: string,
    checked: boolean,
  ) => {
    setSetup((current) => {
      if (!current) return current;
      const selected = new Set(current[field]);
      if (checked) selected.add(instrumentId);
      else selected.delete(instrumentId);
      return { ...current, [field]: Array.from(selected) };
    });
  };

  const setAll = (
    field: 'scoreInstrumentIds' | 'midiInstrumentIds',
    checked: boolean,
  ) => {
    setSetup((current) =>
      current
        ? {
            ...current,
            [field]: checked
              ? current.instruments.map((instrument) => instrument.id)
              : [],
          }
        : current,
    );
  };

  const canContinue =
    setup != null &&
    (setup.instruments.length === 0 ||
      (setup.scoreInstrumentIds.length > 0 &&
        setup.midiInstrumentIds.length > 0));

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div>
            <h2 className="text-lg font-semibold">Músicas disponíveis</h2>
            <p className="text-sm text-[var(--muted)]">
              Somente músicas que possuem partitura.
            </p>
          </div>
          <label className="relative w-full sm:w-80">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar música..."
              className="w-full pl-10"
            />
          </label>
        </div>

        {error && (
          <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--card-secondary)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Música</th>
                <th className="px-4 py-3 font-medium">Compositor</th>
                <th className="px-4 py-3 font-medium">Arranjador</th>
                <th className="px-4 py-3 font-medium">Gênero</th>
                <th className="px-4 py-3 font-medium">Partituras</th>
                <th className="px-4 py-3 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {visibleSongs.map((song) => (
                <tr key={String(song.id)} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{song.title}</td>
                  <td className="px-4 py-3">{song.composer || '—'}</td>
                  <td className="px-4 py-3">{song.arranger || '—'}</td>
                  <td className="px-4 py-3">{song.genre || '—'}</td>
                  <td className="px-4 py-3">{song.scores.length}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={preparingId === String(song.id)}
                      onClick={() => void openSetup(song)}
                    >
                      {preparingId === String(song.id)
                        ? 'Preparando…'
                        : 'Iniciar estudo'}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && visibleSongs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                    Nenhuma música com partitura foi encontrada.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                    Carregando músicas…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {setup && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="study-setup-title"
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--card)] px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Preparar estudo
                </p>
                <h2 id="study-setup-title" className="mt-1 text-xl font-semibold">
                  {setup.song.title}
                </h2>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSetup(null)}
                aria-label="Fechar"
              >
                <span className="material-icons">close</span>
              </button>
            </header>

            {setup.instruments.length > 0 ? (
              <div className="grid gap-6 p-6 md:grid-cols-2">
                <InstrumentSelection
                  title="Mostrar na partitura"
                  description="Escolha as pautas que ficarão visíveis."
                  instruments={setup.instruments}
                  selectedIds={setup.scoreInstrumentIds}
                  onToggle={(id, checked) =>
                    toggleInstrument('scoreInstrumentIds', id, checked)
                  }
                  onToggleAll={(checked) =>
                    setAll('scoreInstrumentIds', checked)
                  }
                />
                <InstrumentSelection
                  title="Tocar no MIDI"
                  description="Escolha os instrumentos que serão ouvidos."
                  instruments={setup.instruments}
                  selectedIds={setup.midiInstrumentIds}
                  onToggle={(id, checked) =>
                    toggleInstrument('midiInstrumentIds', id, checked)
                  }
                  onToggleAll={(checked) =>
                    setAll('midiInstrumentIds', checked)
                  }
                />
              </div>
            ) : (
              <p className="p-6 text-sm text-[var(--muted)]">
                A partitura não separa os instrumentos por partes. Ela será aberta
                completa.
              </p>
            )}

            <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--card)] px-6 py-4">
              {!canContinue && (
                <p className="text-sm text-red-600">
                  Selecione ao menos um instrumento em cada coluna.
                </p>
              )}
              <div className="ml-auto flex gap-3">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setSetup(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canContinue}
                  onClick={() => {
                    onStart(setup);
                    setSetup(null);
                  }}
                >
                  Continuar
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function InstrumentSelection({
  title,
  description,
  instruments,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  title: string;
  description: string;
  instruments: InstrumentInfo[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
}) {
  const selected = new Set(selectedIds);
  const allSelected =
    instruments.length > 0 && selectedIds.length === instruments.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <section className="rounded-xl border border-[var(--border)] p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      <label className="mt-4 flex items-center gap-2 border-b border-[var(--border)] pb-3 font-medium">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(element) => {
            if (element) element.indeterminate = someSelected;
          }}
          onChange={(event) => onToggleAll(event.target.checked)}
        />
        Selecionar todos
      </label>
      <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {instruments.map((instrument) => (
          <label
            key={instrument.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-[var(--card-secondary)]"
          >
            <input
              type="checkbox"
              checked={selected.has(instrument.id)}
              onChange={(event) =>
                onToggle(instrument.id, event.target.checked)
              }
            />
            <span className="material-icons text-[var(--color-brand)]">
              music_note
            </span>
            <span>{instrument.name}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
