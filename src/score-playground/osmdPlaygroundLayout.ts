import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import {
  DESKTOP_MEASURES_MAX,
  DESKTOP_MEASURES_MIN,
  MOBILE_MEASURES_MAX,
  MOBILE_MEASURES_MIN,
} from './playgroundZoomTypes';

type OsmdEngravingRules = {
  PageFormat: { width: number };
  PageLeftMargin: number;
  PageRightMargin: number;
  SystemLeftMargin: number;
  SystemRightMargin: number;
  RenderXMeasuresPerLineAkaSystem: number;
  FixedMeasureWidth: boolean;
  FixedMeasureWidthFixedValue: number;
  VoiceSpacingMultiplierVexflow: number;
  NewSystemAtXMLNewSystemAttribute: boolean;
  NewSystemAtXMLNewPageAttribute: boolean;
  NewPageAtXMLNewPageAttribute: boolean;
  StretchLastSystemLine: boolean;
};

function engravingRules(osmd: OpenSheetMusicDisplay): OsmdEngravingRules {
  return (osmd as unknown as { EngravingRules: OsmdEngravingRules }).EngravingRules;
}

/** Largura mínima por compasso (px) — evita notas amontoadas no playground. */
const MIN_MEASURE_WIDTH_PX = 240;

export function measuresPerDesktopLine(width: number, override?: number | null): number {
  if (override != null) {
    return Math.max(DESKTOP_MEASURES_MIN, Math.min(DESKTOP_MEASURES_MAX, override));
  }
  const byWidth = Math.floor(width / MIN_MEASURE_WIDTH_PX);
  return Math.max(DESKTOP_MEASURES_MIN, Math.min(DESKTOP_MEASURES_MAX, byWidth));
}

export function measuresPerMobileLine(override?: number | null): number {
  if (override != null) {
    return Math.max(MOBILE_MEASURES_MIN, Math.min(MOBILE_MEASURES_MAX, override));
  }
  return MOBILE_MEASURES_MIN;
}

const ENGRAVING_ZOOM_MIN = 0.52;
const ENGRAVING_ZOOM_MAX = 1.28;

/** Encolhe a gravação ao caber mais compassos na mesma largura (como no modo estudo). */
export function playgroundEngravingZoom(
  measuresPerLine: number,
  referenceMeasures: number,
): number {
  const ref = Math.max(1, referenceMeasures);
  const m = Math.max(1, measuresPerLine);
  const raw = ref / m;
  return Math.min(ENGRAVING_ZOOM_MAX, Math.max(ENGRAVING_ZOOM_MIN, raw));
}

export function isMobileView(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 600px)').matches;
}

function applyFixedMeasureLayout(
  osmd: OpenSheetMusicDisplay,
  measuresPerLine: number,
  availableWidth: number,
  zoom: number,
): void {
  const rules = engravingRules(osmd);
  const measures = Math.max(1, measuresPerLine);
  const pageWidth = availableWidth / (10 * zoom);
  rules.PageLeftMargin = 0.3;
  rules.PageRightMargin = 0.3;
  rules.SystemLeftMargin = 0;
  rules.SystemRightMargin = 0;
  rules.RenderXMeasuresPerLineAkaSystem = measures;
  rules.PageFormat.width = pageWidth;
  rules.FixedMeasureWidth = true;
  const innerWidth = Math.max(8, pageWidth - rules.PageLeftMargin - rules.PageRightMargin);
  rules.FixedMeasureWidthFixedValue = Math.max(10, (innerWidth * 0.96) / measures);
  rules.VoiceSpacingMultiplierVexflow = 0.82;
  rules.NewSystemAtXMLNewSystemAttribute = false;
  rules.NewSystemAtXMLNewPageAttribute = false;
  rules.NewPageAtXMLNewPageAttribute = false;
  rules.StretchLastSystemLine = true;
  (osmd as { Zoom: number }).Zoom = zoom;
}

export async function layoutPlaygroundOsmd(
  osmd: OpenSheetMusicDisplay,
  container: HTMLElement,
  measuresOverride?: number | null,
): Promise<void> {
  const mobile = isMobileView();
  const available = Math.max(mobile ? 280 : 480, container.clientWidth || 960);
  const measures = mobile
    ? measuresPerMobileLine(measuresOverride)
    : measuresPerDesktopLine(available, measuresOverride);
  const reference = mobile
    ? measuresPerMobileLine(null)
    : measuresPerDesktopLine(available, null);
  const zoom = playgroundEngravingZoom(measures, reference);
  applyFixedMeasureLayout(osmd, measures, available, zoom);
  await osmd.render();
}
