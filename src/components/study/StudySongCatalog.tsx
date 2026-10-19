'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MusicLoader } from '@/components/MusicLoader';
import type { Song } from '@/domains/songs/types';
import { apiFetch } from '@/lib/api';
import { failureMessage } from '@/lib/userMessages';
import {
  extractInstrumentsFromXml,
  type InstrumentInfo,
} from '@/study/studyUtils';
import {
  defaultPartIds,
  fetchFilteredXml,
  fetchSongParts,
  partToInstrument,
  readStoredSelection,
} from '@/study/songParts';
import type { Person } from '@/domains/people/types';
import { youtubeWatchUrl } from '@/domains/songs/youtube';
import { rewriteDevApiUrl } from '@/config/environment';

export interface StudyStartOptions {
  song: Song;
  xml: string;
  scoreInstrumentIds: string[];
  midiInstrumentIds: string[];
  instruments?: InstrumentInfo[];
  fullScoreUrl?: string;
}

interface StudySongCatalogProps {
  onStart: (options: StudyStartOptions) => void;
  ownerId?: string | null;
  personId?: string | null;
  initialSongId?: string | null;
}

interface SetupState {
  song: Song;
  xml: string;
  instruments: InstrumentInfo[];
  scoreInstrumentIds: string[];
  midiInstrumentIds: string[];
}

export function StudySongCatalog({ onStart, ownerId = null, personId = null, initialSongId = null }: StudySongCatalogProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [openingScore, setOpeningScore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedSongIds, setExpandedSongIds] = useState<Record<string, boolean>>({});
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [playedNames, setPlayedNames] = useState<string[]>([]);
  const [profileReady, setProfileReady] = useState(!personId);
  const openedSong = useRef<string | null>(null);

  useEffect(() => {
    if (!personId) {
      setProfileReady(true);
      return;
    }
    let active = true;
    setProfileReady(false);
    apiFetch<Person>(`/people/${encodeURIComponent(personId)}`)
      .then((person) => {
        if (!active) return;
        const name = person.musician?.playedInstrument?.name?.trim() ?? '';
        setPlayedNames(name ? [name] : []);
      })
      .catch(() => {
        if (active) setPlayedNames([]);
      })
      .finally(() => {
        if (active) setProfileReady(true);
      });
    return () => {
      active = false;
    };
  }, [personId]);

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
      const songId = String(song.id);
      let instruments: InstrumentInfo[] = [];
      try {
        const parts = await fetchSongParts(songId);
        instruments = parts.map(partToInstrument);
        const stored = readStoredSelection(ownerId, songId);
        const defaults = defaultPartIds(parts, playedNames);
        const available = new Set(instruments.map((item) => item.id));
        const keep = (ids: string[]) => ids.filter((id) => available.has(id));
        const scoreIds = keep(stored.score);
        const midiIds = keep(stored.midi);
        setSetup({
          song,
          xml: '',
          instruments,
          scoreInstrumentIds: scoreIdsForViewport(scoreIds.length > 0 ? scoreIds : defaults),
          midiInstrumentIds: midiIds.length > 0 ? midiIds : defaults,
        });
        return;
      } catch {
        /* partitura antiga ou API sem naipes: lê o XML inteiro */
      }
      const response = await fetch(rewriteDevApiUrl(score.url));
      if (!response.ok) throw new Error('score_fetch_failed');
      const xml = await response.text();
      instruments = extractInstrumentsFromXml(xml);
      const allIds = instruments.map((instrument) => instrument.id);
      setSetup({
        song,
        xml,
        instruments,
        scoreInstrumentIds: scoreIdsForViewport(allIds),
        midiInstrumentIds: allIds,
      });
    } catch (caught) {
      setError(failureMessage(caught, `Não foi possível preparar a partitura de ${song.title}.`));
    } finally {
      setPreparingId(null);
    }
  };

  useEffect(() => {
    if (!initialSongId || loading || !profileReady || openedSong.current === initialSongId) return;
    openedSong.current = initialSongId;
    const song = songs.find((item) => String(item.id) === initialSongId);
    if (!song) {
      setError('Essa música não está disponível para o seu perfil.');
      return;
    }
    void openSetup(song);
  }, [initialSongId, loading, openSetup, profileReady, songs]);

  const toggleInstrument = (
    field: 'scoreInstrumentIds' | 'midiInstrumentIds',
    instrumentId: string,
    checked: boolean,
  ) => {
    setSetup((current) => {
      if (!current) return current;
      if (field === 'scoreInstrumentIds' && mobileStudyViewport()) {
        if (!checked) return current;
        return { ...current, scoreInstrumentIds: [instrumentId] };
      }
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
    setSetup((current) => {
      if (!current) return current;
      if (field === 'scoreInstrumentIds' && mobileStudyViewport()) return current;
      return {
        ...current,
        [field]: checked ? current.instruments.map((instrument) => instrument.id) : [],
      };
    });
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

        <ul className="hidden flex-col gap-3 p-3 max-[959px]:flex">
          {visibleSongs.map((song) => {
            const songId = String(song.id);
            const open = Boolean(expandedSongIds[songId]);
            const details = [
              ['Compositor', song.composer || '—'],
              ['Arranjador', song.arranger || '—'],
              ['Gênero', song.genre || '—'],
              ['Partituras', String(song.scores.length)],
            ];
            return (
              <li key={songId} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <div className="flex flex-col gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--muted)]">Música</p>
                    <p className="mt-1 break-words text-base font-semibold leading-snug">{song.title}</p>
                  </div>
                  <SongStudyActions
                    song={song}
                    preparing={preparingId === songId}
                    onStart={() => void openSetup(song)}
                  />
                </div>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-[var(--border)] px-3 text-left text-sm font-medium"
                  aria-expanded={open}
                  onClick={() => setExpandedSongIds((current) => ({ ...current, [songId]: !current[songId] }))}
                >
                  {open ? 'Recolher' : 'Ver mais'}
                  <span className="material-icons" aria-hidden>
                    {open ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {open ? (
                  <dl className="border-t border-[var(--border)] px-3 py-1">
                    {details.map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-3 last:border-b-0">
                        <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
                        <dd className="text-right text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            );
          })}
          {!loading && visibleSongs.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-[var(--muted)]">
              Nenhuma música com partitura foi encontrada.
            </li>
          ) : null}
          {loading ? (
            <li>
              <MusicLoader label="Carregando músicas…" />
            </li>
          ) : null}
        </ul>

        <div className="overflow-x-auto max-[959px]:hidden">
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
                    <SongStudyActions
                      song={song}
                      preparing={preparingId === String(song.id)}
                      onStart={() => void openSetup(song)}
                    />
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
                    <td colSpan={6} className="px-4 py-4">
                    <MusicLoader label="Carregando músicas…" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openingScore ? (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[var(--background)]">
          <MusicLoader label="Carregando partitura…" />
        </div>
      ) : null}

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
                  description={
                    mobileStudyViewport()
                      ? 'Escolha a pauta que ficará visível.'
                      : 'Escolha as pautas que ficarão visíveis.'
                  }
                  instruments={setup.instruments}
                  selectedIds={setup.scoreInstrumentIds}
                  single={mobileStudyViewport()}
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
                  disabled={!canContinue || preparingId != null || openingScore}
                  onClick={() => {
                    if (!setup || openingScore) return;
                    setOpeningScore(true);
                    void (async () => {
                      setPreparingId(String(setup.song.id));
                      try {
                        const union = Array.from(
                          new Set([...setup.scoreInstrumentIds, ...setup.midiInstrumentIds]),
                        );
                        let xml = setup.xml;
                        if (!xml && union.length > 0) {
                          xml = await fetchFilteredXml(String(setup.song.id), union);
                        }
                        if (!xml) {
                          const score = setup.song.scores.find((item) => Boolean(item.url));
                          if (!score) throw new Error('score');
                          const response = await fetch(rewriteDevApiUrl(score.url));
                          if (!response.ok) throw new Error('score');
                          xml = await response.text();
                        }
                        const score = setup.song.scores.find((item) => Boolean(item.url));
                        onStart({
                          song: setup.song,
                          xml,
                          scoreInstrumentIds: setup.scoreInstrumentIds,
                          midiInstrumentIds: setup.midiInstrumentIds,
                          instruments: setup.instruments,
                          fullScoreUrl: score?.url,
                        });
                        setSetup(null);
                      } catch (caught) {
                        setError(failureMessage(caught, 'Não foi possível abrir a partitura.'));
                      } finally {
                        setPreparingId(null);
                        setOpeningScore(false);
                      }
                    })();
                  }}
                >
                  {openingScore ? <MusicLoader compact label="Carregando partitura…" /> : 'Continuar'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function SongStudyActions({
  song,
  preparing,
  onStart,
}: {
  song: Song;
  preparing: boolean;
  onStart: () => void;
}) {
  const watchUrl = youtubeWatchUrl(song.videoUrl ?? '');
  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-2">
      {watchUrl ? (
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost inline-flex min-h-11 items-center gap-1.5"
        >
          <span className="material-icons text-base" aria-hidden>smart_display</span>
          Vídeo
        </a>
      ) : null}
      <button
        type="button"
        className="btn-primary min-h-11"
        disabled={preparing}
        onClick={onStart}
      >
        {preparing ? <MusicLoader compact label="Preparando…" /> : 'Iniciar estudo'}
      </button>
    </div>
  );
}

function mobileStudyViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches;
}

function scoreIdsForViewport(ids: string[]) {
  if (!mobileStudyViewport()) return ids;
  return ids.slice(0, 1);
}

function InstrumentSelection({
  title,
  description,
  instruments,
  selectedIds,
  single = false,
  onToggle,
  onToggleAll,
}: {
  title: string;
  description: string;
  instruments: InstrumentInfo[];
  selectedIds: string[];
  single?: boolean;
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
      {single ? null : (
        <label className="mt-4 flex min-h-11 items-center gap-2 border-b border-[var(--border)] pb-3 font-medium">
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
      )}
      <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {instruments.map((instrument) => (
          <label
            key={instrument.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-[var(--card-secondary)]"
          >
            <input
              type={single ? 'radio' : 'checkbox'}
              name={single ? 'study-setup-score' : undefined}
              checked={selected.has(instrument.id)}
              onChange={(event) =>
                onToggle(instrument.id, single ? true : event.target.checked)
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
