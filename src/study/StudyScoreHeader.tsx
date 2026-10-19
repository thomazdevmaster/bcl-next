'use client';

import type { StudyScoreHeader } from '@/study/enrichStudyMusicXml';

function stripLeadingLabel(value: string, label: RegExp): string {
  return value.replace(label, '').trim();
}

function HeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs leading-snug min-[401px]:text-sm">
      <span className="font-semibold text-[var(--foreground)]">{label}: </span>
      <span className="font-normal text-[var(--foreground)]">{value}</span>
    </p>
  );
}

export function StudyScoreHeaderView({
  header,
  compact = false,
  /** Mesmo visual da barra fixa inferior no mobile. */
  sheetSurface = false,
}: {
  header: StudyScoreHeader;
  compact?: boolean;
  sheetSurface?: boolean;
}) {
  const composer = header.composer
    ? stripLeadingLabel(header.composer, /^(comp\.?|compositor|autor)\s*:\s*/i)
    : '';
  const arranger = header.arranger
    ? stripLeadingLabel(header.arranger, /^arranjo\s*:\s*/i)
    : '';

  const technical: string[] = [];
  if (header.bpm != null) technical.push(`♩ = ${header.bpm}`);
  if (header.timeSignature) technical.push(header.timeSignature);
  if (header.key) technical.push(`Tom: ${header.key}`);
  if (header.tuning) technical.push(`Afinação: ${header.tuning}`);

  const inner = (
    <div className={`min-w-0 space-y-1 text-left ${compact ? 'max-w-full' : 'space-y-1.5'}`}>
      <p
        className={`font-semibold leading-snug text-[var(--foreground)] ${compact ? 'text-sm' : 'text-base'}`}
      >
        {header.title}
      </p>
      {composer ? <HeaderRow label="Compositor" value={composer} /> : null}
      {arranger ? <HeaderRow label="Arranjo" value={arranger} /> : null}
      {technical.length > 0 ? (
        <p className="text-xs leading-snug text-[var(--foreground)] min-[401px]:text-sm">
          {technical.map((part, index) => (
            <span key={part}>
              {index > 0 ? <span className="text-[var(--muted)]"> · </span> : null}
              {part}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );

  if (sheetSurface) {
    return (
      <div className="border-b border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[var(--card-foreground)] shadow-[var(--shadow-soft)]">
        {inner}
      </div>
    );
  }

  return inner;
}
