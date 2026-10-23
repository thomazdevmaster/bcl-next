"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MusicLoader } from "@/components/MusicLoader";
import { TableView } from "@/components/tables/core/TableView";
import type { TableColumnDef } from "@/components/tables/core/table-features";
import {
  filterSongsForCatalog,
  isSongVisibleInCatalog,
} from "@/domains/songs/catalogAccess";
import type { Song } from "@/domains/songs/types";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, fetchAuthedAsset } from "@/lib/api";
import { failureMessage } from "@/lib/userMessages";
import {
  extractInstrumentsFromXml,
  type InstrumentInfo,
} from "@/study/studyUtils";
import {
  defaultPartIds,
  fetchSongParts,
  partToInstrument,
  readStoredSelection,
} from "@/study/songParts";
import type { Person } from "@/domains/people/types";
import { youtubeWatchUrl } from "@/domains/songs/youtube";
import {
  studyAudioReady,
  studyProcessingGateEnabled,
  studyProcessingLabel,
  studyScoreReady,
} from "@/config/studyProcessing";
import { waitForStudyScoreReady } from "@/study/songParts";
import { StudyPublicRepertoireNotice } from "@/components/study/StudyPublicRepertoireNotice";

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
  audioPending: boolean;
}

export function StudySongCatalog({
  onStart,
  ownerId = null,
  personId = null,
  initialSongId = null,
}: StudySongCatalogProps) {
  const { roles, permissions } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [openingScore, setOpeningScore] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const name = person.musician?.playedInstrument?.name?.trim() ?? "";
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

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await apiFetch<Song[]>("/songs");
      const withScores = items.filter((song) =>
        song.scores?.some((score) => Boolean(score.url)),
      );
      setSongs(filterSongsForCatalog(withScores, roles, permissions));
    } catch (caught: unknown) {
      setError(
        failureMessage(
          caught,
          "Não foi possível carregar as músicas para estudo.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [permissions, roles]);

  useEffect(() => {
    void fetchSongs();
  }, [fetchSongs]);

  const columns = useMemo<TableColumnDef<Song>[]>(
    () => [
      { accessorKey: "title", header: "Música", minSize: 180 },
      {
        accessorKey: "composer",
        header: "Compositor",
        minSize: 160,
        cell: ({ getValue }) => getValue<string>() || "—",
      },
      {
        accessorKey: "arranger",
        header: "Arranjador",
        minSize: 150,
        cell: ({ getValue }) => getValue<string | undefined>() || "—",
      },
      {
        accessorKey: "genre",
        header: "Gênero",
        minSize: 120,
        cell: ({ getValue }) => getValue<string | undefined>() || "—",
      },
      {
        id: "scores",
        accessorFn: (song) => song.scores.length,
        header: "Partituras",
        minSize: 110,
      },
      ...(studyProcessingGateEnabled()
        ? [
            {
              id: "studyPrep",
              accessorFn: (song: Song) =>
                studyProcessingLabel(song) ?? "Pronta",
              header: "Preparação",
              minSize: 140,
            } satisfies TableColumnDef<Song>,
          ]
        : []),
    ],
    [],
  );

  const openSetup = async (song: Song) => {
    if (!isSongVisibleInCatalog(song, roles, permissions)) {
      setError("Essa música não está disponível para o seu perfil.");
      return;
    }
    const score = song.scores.find((item) => Boolean(item.url));
    if (!score) return;
    setPreparingId(String(song.id));
    setError(null);
    try {
      let activeSong = song;
      if (studyProcessingGateEnabled()) {
        if (activeSong.studyScoreStatus === "failed") {
          throw new Error("study_score_failed");
        }
        if (!studyScoreReady(activeSong)) {
          activeSong = await waitForStudyScoreReady(String(song.id));
        }
      }
      const songId = String(activeSong.id);
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
          song: activeSong,
          xml: "",
          instruments,
          scoreInstrumentIds: scoreIdsForViewport(
            scoreIds.length > 0 ? scoreIds : defaults,
          ),
          midiInstrumentIds: midiIds.length > 0 ? midiIds : defaults,
          audioPending:
            studyProcessingGateEnabled() && !studyAudioReady(activeSong),
        });
        return;
      } catch {
        if (studyProcessingGateEnabled()) {
          throw new Error("study_parts_unavailable");
        }
        /* mock legado: lê o XML inteiro */
      }
      const response = await fetchAuthedAsset(score.url);
      if (!response.ok) throw new Error("score_fetch_failed");
      const xml = await response.text();
      instruments = extractInstrumentsFromXml(xml);
      const allIds = instruments.map((instrument) => instrument.id);
      setSetup({
        song: activeSong,
        xml,
        instruments,
        scoreInstrumentIds: scoreIdsForViewport(allIds),
        midiInstrumentIds: allIds,
        audioPending:
          studyProcessingGateEnabled() && !studyAudioReady(activeSong),
      });
    } catch (caught) {
      if (caught instanceof Error && caught.message === "study_score_failed") {
        setError(
          `A partitura de ${song.title} não pôde ser preparada. Peça ao maestro para reenviar o MusicXML.`,
        );
      } else if (
        caught instanceof Error &&
        caught.message === "study_score_timeout"
      ) {
        setError(
          `A partitura de ${song.title} ainda está sendo processada. Aguarde e tente novamente.`,
        );
      } else if (
        caught instanceof Error &&
        caught.message === "study_parts_unavailable"
      ) {
        setError(
          `Os naipes de ${song.title} ainda não estão disponíveis. Tente novamente em instantes.`,
        );
      } else {
        setError(
          failureMessage(
            caught,
            `Não foi possível preparar a partitura de ${song.title}.`,
          ),
        );
      }
    } finally {
      setPreparingId(null);
    }
  };

  useEffect(() => {
    if (
      !initialSongId ||
      loading ||
      !profileReady ||
      openedSong.current === initialSongId
    )
      return;
    openedSong.current = initialSongId;
    const song = songs.find((item) => String(item.id) === initialSongId);
    if (!song) {
      setError("Essa música não está disponível para o seu perfil.");
      return;
    }
    void openSetup(song);
  }, [initialSongId, loading, openSetup, profileReady, songs]);

  const toggleInstrument = (
    field: "scoreInstrumentIds" | "midiInstrumentIds",
    instrumentId: string,
    checked: boolean,
  ) => {
    setSetup((current) => {
      if (!current) return current;
      if (field === "scoreInstrumentIds" && mobileStudyViewport()) {
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
    field: "scoreInstrumentIds" | "midiInstrumentIds",
    checked: boolean,
  ) => {
    setSetup((current) => {
      if (!current) return current;
      if (field === "scoreInstrumentIds" && mobileStudyViewport())
        return current;
      return {
        ...current,
        [field]: checked
          ? current.instruments.map((instrument) => instrument.id)
          : [],
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
        <div className="border-b border-[var(--border)] p-4">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">Músicas disponíveis</h2>
              <p className="text-sm text-[var(--muted)]">
                Somente músicas que possuem partitura.
              </p>
            </div>
            <StudyPublicRepertoireNotice context="study" />
          </div>
        </div>

        <div className="p-4">
          <TableView
            tableId="study-songs"
            data={songs}
            columns={columns}
            getRowId={(song) => String(song.id)}
            loading={loading}
            error={error}
            onRefresh={() => void fetchSongs()}
            globalFilterLabel="Buscar músicas por título, compositor ou gênero"
            emptyMessage="Nenhuma música com partitura foi encontrada."
            noResultsMessage="Nenhuma música corresponde à busca."
            getRowLabel={(song) => song.title}
            toolbarLabels={{ section: "Controles das músicas para estudo" }}
            renderRowActions={(song) => (
              <SongStudyActions
                song={song}
                preparing={preparingId === String(song.id)}
                onStart={() => void openSetup(song)}
              />
            )}
            renderMobileRowActions={(song) => {
              const watchUrl = youtubeWatchUrl(song.videoUrl ?? "");
              return [
                ...(watchUrl
                  ? [
                      {
                        label: "Vídeo",
                        icon: "smart_display",
                        onSelect: () =>
                          window.open(
                            watchUrl,
                            "_blank",
                            "noopener,noreferrer",
                          ),
                      },
                    ]
                  : []),
                {
                  label: "Iniciar estudo",
                  icon: "school",
                  disabled:
                    preparingId === String(song.id) ||
                    (studyProcessingGateEnabled() &&
                      song.studyScoreStatus === "failed"),
                  onSelect: () => void openSetup(song),
                },
              ];
            }}
          />
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
                <h2
                  id="study-setup-title"
                  className="mt-1 text-xl font-semibold"
                >
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
                      ? "Escolha a pauta que ficará visível."
                      : "Escolha as pautas que ficarão visíveis."
                  }
                  instruments={setup.instruments}
                  selectedIds={setup.scoreInstrumentIds}
                  single={mobileStudyViewport()}
                  onToggle={(id, checked) =>
                    toggleInstrument("scoreInstrumentIds", id, checked)
                  }
                  onToggleAll={(checked) =>
                    setAll("scoreInstrumentIds", checked)
                  }
                />
                <InstrumentSelection
                  title="Tocar no MIDI"
                  description="Escolha os instrumentos que serão ouvidos."
                  instruments={setup.instruments}
                  selectedIds={setup.midiInstrumentIds}
                  onToggle={(id, checked) =>
                    toggleInstrument("midiInstrumentIds", id, checked)
                  }
                  onToggleAll={(checked) =>
                    setAll("midiInstrumentIds", checked)
                  }
                />
              </div>
            ) : (
              <p className="p-6 text-sm text-[var(--muted)]">
                A partitura não separa os instrumentos por partes. Ela será
                aberta completa.
              </p>
            )}

            {setup.audioPending ? (
              <p className="border-t border-[var(--border)] px-6 py-3 text-sm text-[var(--muted)]">
                A partitura já pode ser aberta. O áudio de referência ainda está
                sendo gerado — o play ficará disponível em breve.
              </p>
            ) : null}

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
                      let didStart = false;
                      try {
                        const score = setup.song.scores.find((item) =>
                          Boolean(item.url),
                        );
                        if (!score?.url) throw new Error("score");
                        let xml = setup.xml;
                        if (!xml?.includes("<score")) {
                          const response = await fetchAuthedAsset(score.url);
                          if (!response.ok) throw new Error("score");
                          xml = await response.text();
                        }
                        onStart({
                          song: setup.song,
                          xml,
                          scoreInstrumentIds: setup.scoreInstrumentIds,
                          midiInstrumentIds: setup.midiInstrumentIds,
                          instruments: setup.instruments,
                          fullScoreUrl: score?.url,
                        });
                        didStart = true;
                      } catch (caught) {
                        setError(
                          failureMessage(
                            caught,
                            "Não foi possível abrir a partitura.",
                          ),
                        );
                      } finally {
                        setPreparingId(null);
                        setOpeningScore(false);
                        if (didStart) setSetup(null);
                      }
                    })();
                  }}
                >
                  {openingScore ? (
                    <MusicLoader compact label="Carregando partitura…" />
                  ) : (
                    "Continuar"
                  )}
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
  const watchUrl = youtubeWatchUrl(song.videoUrl ?? "");
  const prepLabel = studyProcessingLabel(song);
  const blocked =
    studyProcessingGateEnabled() && song.studyScoreStatus === "failed";
  const waitingScore =
    studyProcessingGateEnabled() &&
    !studyScoreReady(song) &&
    song.studyScoreStatus !== "failed";
  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-2">
      {watchUrl ? (
        <a
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost inline-flex min-h-11 items-center gap-1.5"
        >
          <span className="material-icons text-base" aria-hidden>
            smart_display
          </span>
          Vídeo
        </a>
      ) : null}
      <button
        type="button"
        className="btn-primary min-h-11"
        disabled={preparing || blocked}
        onClick={onStart}
        title={prepLabel ?? undefined}
      >
        {preparing || waitingScore ? (
          <MusicLoader
            compact
            label={waitingScore ? "Processando…" : "Preparando…"}
          />
        ) : blocked ? (
          "Indisponível"
        ) : (
          "Iniciar estudo"
        )}
      </button>
    </div>
  );
}

function mobileStudyViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 600px)").matches
  );
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
              type={single ? "radio" : "checkbox"}
              name={single ? "study-setup-score" : undefined}
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
