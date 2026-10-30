'use client';

import { useState } from 'react';
import { EntityDialog } from '@/components/shared/EntityDialog';
import { StudyInstrumentPanel } from '@/components/StudyInstrumentPanel';
import type { InstrumentInfo } from '@/study/studyUtils';
import {
  canApplyInstrumentSelection,
  filterInstruments,
  sameInstrumentIds,
  toggleInstrumentId,
} from './playgroundInstrumentSelection';

type Props = {
  instruments: InstrumentInfo[];
  scoreInstrumentIds: string[];
  midiInstrumentIds: string[];
  singleScore: boolean;
  onApply: (scoreIds: string[], midiIds: string[]) => void;
  onClose: () => void;
};

export function ScorePlaygroundInstrumentDialog({
  instruments,
  scoreInstrumentIds,
  midiInstrumentIds,
  singleScore,
  onApply,
  onClose,
}: Props) {
  const [scoreIds, setScoreIds] = useState(() =>
    singleScore ? scoreInstrumentIds.slice(0, 1) : scoreInstrumentIds,
  );
  const [midiIds, setMidiIds] = useState(midiInstrumentIds);
  const [filter, setFilter] = useState('');

  const allIds = instruments.map((item) => item.id);
  const unchanged =
    sameInstrumentIds(scoreIds, scoreInstrumentIds) &&
    sameInstrumentIds(midiIds, midiInstrumentIds);
  const valid = canApplyInstrumentSelection(scoreIds, midiIds);

  return (
    <EntityDialog
      open
      title="Instrumentos"
      description="Escolha as pautas visíveis e os instrumentos ouvidos."
      size="md"
      placement="bottom"
      confirmBeforeClose={false}
      onClose={onClose}
    >
      <div className="flex min-h-0 flex-col">
        <StudyInstrumentPanel
          available={instruments}
          selectedIds={scoreIds}
          midiSelectedIds={midiIds}
          filtered={filterInstruments(instruments, filter)}
          selectionMatchesApplied={unchanged}
          filter={filter}
          loading={false}
          xmlLoaded
          allSelected={scoreIds.length === instruments.length}
          midiAllSelected={midiIds.length === instruments.length}
          onFilterChange={setFilter}
          onToggle={(id, checked) =>
            setScoreIds((ids) => toggleInstrumentId(ids, id, checked, singleScore))
          }
          onToggleMidi={(id, checked) =>
            setMidiIds((ids) => toggleInstrumentId(ids, id, checked))
          }
          onSelectAllChange={(checked) => setScoreIds(checked ? allIds : [])}
          onSelectAllMidiChange={(checked) => setMidiIds(checked ? allIds : [])}
          onApply={() => onApply(scoreIds, midiIds)}
          onCancel={onClose}
          onRestore={() => {
            setScoreIds(scoreInstrumentIds);
            setMidiIds(midiInstrumentIds);
          }}
          onClose={onClose}
          singleScore={singleScore}
          embedded
          hideActions
        />

        <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {!valid ? (
            <p className="text-sm text-red-600" role="alert">
              Selecione ao menos uma pauta e um instrumento do MIDI.
            </p>
          ) : null}
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn-ghost min-h-11" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary min-h-11 disabled:cursor-not-allowed"
              disabled={!valid || unchanged}
              onClick={() => onApply(scoreIds, midiIds)}
            >
              Aplicar
            </button>
          </div>
        </footer>
      </div>
    </EntityDialog>
  );
}
