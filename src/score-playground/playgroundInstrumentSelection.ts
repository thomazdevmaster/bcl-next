import type { InstrumentInfo } from '@/study/studyUtils';

export function toggleInstrumentId(
  ids: string[],
  id: string,
  checked: boolean,
  single = false,
): string[] {
  if (single) return checked ? [id] : ids;
  const next = new Set(ids);
  if (checked) next.add(id);
  else next.delete(id);
  return Array.from(next);
}

export function filterInstruments(
  instruments: InstrumentInfo[],
  query: string,
): InstrumentInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return instruments;
  return instruments.filter((item) => item.name.toLowerCase().includes(q));
}

export function sameInstrumentIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function canApplyInstrumentSelection(
  scoreIds: string[],
  midiIds: string[],
): boolean {
  return scoreIds.length > 0 && midiIds.length > 0;
}
