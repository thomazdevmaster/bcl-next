import type { WebMscorePositionElement } from './webmscoreTypes';

/** Onde o cursor deve começar dentro de cada compasso (após clave/cifras no 1º da linha). */
export function buildMeasureContentStartX(
  measures: WebMscorePositionElement[],
  segments: WebMscorePositionElement[],
): Map<number, number> {
  const map = new Map<number, number>();
  if (measures.length === 0) return map;

  for (const measure of measures) {
    const startX = contentStartForMeasure(measure, measures, segments);
    if (startX > measure.x + 0.5) {
      map.set(measure.id, startX);
    }
  }
  return map;
}

function contentStartForMeasure(
  measure: WebMscorePositionElement,
  measures: WebMscorePositionElement[],
  segments: WebMscorePositionElement[],
): number {
  const fromSegments = minSegmentXInMeasure(measure, segments);
  if (fromSegments != null) return fromSegments;

  if (!isFirstMeasureOnSystem(measure, measures)) {
    return measure.x;
  }

  return measure.x + measure.sx * FIRST_SYSTEM_HEADER_FRACTION;
}

const FIRST_SYSTEM_HEADER_FRACTION = 0.14;

function minSegmentXInMeasure(
  measure: WebMscorePositionElement,
  segments: WebMscorePositionElement[],
): number | null {
  if (segments.length === 0) return null;

  const yBand = Math.max(measure.sy, 16) * 1.6;
  let minX: number | null = null;

  for (const segment of segments) {
    if (segment.page !== measure.page) continue;
    if (Math.abs(segment.y - measure.y) > yBand) continue;
    if (segment.x < measure.x - 1 || segment.x > measure.x + measure.sx + 1) continue;
    if (minX == null || segment.x < minX) minX = segment.x;
  }

  if (minX == null || minX <= measure.x + 0.5) return null;
  return minX;
}

export function isFirstMeasureOnSystem(
  measure: WebMscorePositionElement,
  measures: WebMscorePositionElement[],
): boolean {
  const tolerance = Math.max(8, measure.sy * 0.45);
  let minX = measure.x;
  for (const peer of measures) {
    if (peer.page !== measure.page) continue;
    if (Math.abs(peer.y - measure.y) > tolerance) continue;
    if (peer.x < minX) minX = peer.x;
  }
  return measure.x <= minX + 0.5;
}

export function measureCursorX(
  measure: WebMscorePositionElement,
  fraction: number,
  contentStartByMeasureId: Map<number, number>,
): number {
  const startX = contentStartByMeasureId.get(measure.id) ?? measure.x;
  const endX = measure.x + Math.max(measure.sx, 1);
  const span = Math.max(endX - startX, 1);
  const clamped = Math.min(1, Math.max(0, fraction));
  return startX + span * clamped;
}
