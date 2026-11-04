import type { ISheetRenderer } from '@music-i18n/musicxml-player';
import type {
  MeasureIndex,
  MillisecsTimestamp,
  Player,
  PlayerOptions,
} from '@music-i18n/musicxml-player';
import { loadWebMscoreModule, resetWebMscoreModule } from './webmscoreLoader';
import type { WebMscoreInstance, WebMscorePositionElement } from './webmscoreTypes';
import {
  isLargeScoreForWebMscoreLayout,
  prepareMusicXmlForWebMscoreDisplay,
} from './prepareMusicXmlForWebMscoreDisplay';
import { buildMeasureContentStartX, measureCursorX } from './webmscoreCursorLayout';
import type { PlaygroundZoomState } from './playgroundZoomTypes';
import {
  DESKTOP_MEASURES_MAX,
  DESKTOP_MEASURES_MIN,
  MOBILE_MEASURES_MAX,
  MOBILE_MEASURES_MIN,
} from './playgroundZoomTypes';
import {
  isMobileView,
  measuresPerDesktopLine,
  measuresPerMobileLine,
  playgroundEngravingZoom,
} from './osmdPlaygroundLayout';
import { followPlaygroundCursor } from './playgroundFollowCursor';

const CURSOR_CLASS = 'score-playground-cursor';

/**
 * Partitura desenhada pelo motor MuseScore (libmscore via webmscore).
 * Sincroniza cursor com o Player usando measurePositions().
 */
export class WebMscoreSheetRenderer implements ISheetRenderer {
  player?: Player;

  private score: WebMscoreInstance | null = null;
  private container: HTMLElement | null = null;
  private pagesHost: HTMLElement | null = null;
  private cursorEl: HTMLDivElement | null = null;
  private measures: WebMscorePositionElement[] = [];
  private contentStartXByMeasureId = new Map<number, number>();
  private pageWidth = 0;
  private followCursor = true;
  private rawSheet = '';
  private compactLayout = false;
  private baselineMeasures = 3;
  private containerWidth = 960;
  private measuresOverride: number | null = null;
  private layoutRendering = false;

  destroy(): void {
    void this.terminateScoreWorker();
    this.score = null;
    this.cursorEl?.remove();
    this.cursorEl = null;
    this.pagesHost?.remove();
    this.pagesHost = null;
    if (this.container) this.container.replaceChildren();
    this.container = null;
    this.measures = [];
    this.contentStartXByMeasureId = new Map();
  }

  async initialize(
    container: HTMLElement,
    musicXml: string,
    options: Required<PlayerOptions>,
  ): Promise<void> {
    this.followCursor = options.followCursor !== false;
    this.destroy();
    this.container = container;
    this.containerWidth = Math.max(
      isMobileView() ? 280 : 480,
      container.clientWidth || 960,
    );
    container.classList.add('score-playground-sheet-host', 'relative');
    container.replaceChildren();

    const pagesHost = document.createElement('div');
    pagesHost.className =
      'score-playground-pages relative mx-auto flex w-full max-w-none flex-col gap-4';
    container.appendChild(pagesHost);
    this.pagesHost = pagesHost;

    const cursor = document.createElement('div');
    cursor.className = CURSOR_CLASS;
    cursor.setAttribute('aria-hidden', 'true');
    container.appendChild(cursor);
    this.cursorEl = cursor;

    this.rawSheet = musicXml;
    this.compactLayout = !isLargeScoreForWebMscoreLayout(this.rawSheet);
    const mobile = isMobileView();
    this.baselineMeasures = mobile
      ? measuresPerMobileLine(null)
      : measuresPerDesktopLine(this.containerWidth, null);
    this.measuresOverride = null;

    const WebMscore = await loadWebMscoreModule();
    await this.loadAndRenderScore(WebMscore, this.rawSheet);
  }

  getZoomState(): PlaygroundZoomState {
    if (!this.compactLayout) {
      return {
        engine: 'webmscore',
        label: 'Página original',
        canZoomIn: false,
        canZoomOut: false,
      };
    }
    const measures = this.currentMeasuresPerLine();
    const mobile = isMobileView();
    const min = mobile ? MOBILE_MEASURES_MIN : DESKTOP_MEASURES_MIN;
    const max = mobile ? MOBILE_MEASURES_MAX : DESKTOP_MEASURES_MAX;
    return {
      engine: 'webmscore',
      label: `${measures} comp./linha`,
      canZoomIn: !this.layoutRendering && measures > min,
      canZoomOut: !this.layoutRendering && measures < max,
    };
  }

  zoomIn(): void {
    void this.applyZoomStep(-1);
  }

  zoomOut(): void {
    void this.applyZoomStep(1);
  }

  private currentMeasuresPerLine(): number {
    const mobile = isMobileView();
    const available = Math.max(
      mobile ? 280 : 480,
      this.container?.clientWidth ?? this.containerWidth,
    );
    return mobile
      ? measuresPerMobileLine(this.measuresOverride)
      : measuresPerDesktopLine(available, this.measuresOverride);
  }

  private async applyZoomStep(delta: number): Promise<void> {
    if (!this.compactLayout || !this.pagesHost || this.layoutRendering) return;
    const next = this.currentMeasuresPerLine() + delta;
    const mobile = isMobileView();
    const min = mobile ? MOBILE_MEASURES_MIN : DESKTOP_MEASURES_MIN;
    const max = mobile ? MOBILE_MEASURES_MAX : DESKTOP_MEASURES_MAX;
    if (next < min || next > max) return;
    this.measuresOverride = next;
    this.layoutRendering = true;
    try {
      const WebMscore = await loadWebMscoreModule();
      await this.loadAndRenderScore(WebMscore, this.rawSheet);
    } finally {
      this.layoutRendering = false;
    }
  }

  private async loadAndRenderScore(
    WebMscore: Awaited<ReturnType<typeof loadWebMscoreModule>>,
    rawSheet: string,
  ): Promise<void> {
    const pagesHost = this.pagesHost;
    if (!pagesHost) return;

    this.terminateScoreWorker();
    this.score = null;
    pagesHost.replaceChildren();

    const measures = this.currentMeasuresPerLine();
    const engravingZoom = playgroundEngravingZoom(measures, this.baselineMeasures);
    const sheetXml = prepareMusicXmlForWebMscoreDisplay(
      rawSheet,
      this.compactLayout
        ? {
            measuresPerLine: measures,
            baselineMeasures: this.baselineMeasures,
            engravingZoom,
          }
        : undefined,
    );

    let score: WebMscoreInstance;
    try {
      score = await loadWebMscoreMusicXml(WebMscore, sheetXml);
    } catch (caught) {
      if (sheetXml !== rawSheet) {
        try {
          score = await loadWebMscoreMusicXml(WebMscore, rawSheet);
        } catch (retryCaught) {
          resetWebMscoreModule();
          throw normalizeWebMscoreLoadError(retryCaught, rawSheet);
        }
      } else {
        resetWebMscoreModule();
        throw normalizeWebMscoreLoadError(caught, rawSheet);
      }
    }
    this.score = score;

    let measurePos: Awaited<ReturnType<WebMscoreInstance['measurePositions']>>;
    try {
      measurePos = await score.measurePositions();
    } catch (caught) {
      this.terminateScoreWorker();
      this.score = null;
      resetWebMscoreModule();
      throw normalizeWebMscoreLoadError(caught, rawSheet);
    }
    let segmentElements: WebMscorePositionElement[] = [];
    try {
      const segmentPos = await score.segmentPositions();
      segmentElements = segmentPos.elements ?? [];
    } catch {
      /* partituras grandes: segmentos opcionais para o cursor */
    }
    this.measures = measurePos.elements ?? [];
    this.contentStartXByMeasureId = buildMeasureContentStartX(
      this.measures,
      segmentElements,
    );
    this.pageWidth = measurePos.pageSize?.width ?? 0;

    const pageCount = await score.npages();
    if (process.env.NODE_ENV === 'development') {
      console.info('[score_playground] webmscore pages:', pageCount, 'measures/line:', measures);
    }
    for (let page = 0; page < pageCount; page += 1) {
      const svgText = await score.saveSvg(page, true);
      const wrap = document.createElement('div');
      wrap.className =
        'score-playground-page overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--score-paper)] shadow-sm';
      wrap.dataset.page = String(page);
      wrap.innerHTML = svgText;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.display = 'block';
        svg.style.width = '100%';
        svg.style.maxWidth = '100%';
        svg.style.minWidth = '0';
        svg.style.height = 'auto';
      }
      pagesHost.appendChild(wrap);
    }
  }

  moveTo(
    index: MeasureIndex,
    _start: MillisecsTimestamp,
    offset: MillisecsTimestamp,
    duration?: MillisecsTimestamp,
  ): void {
    if (!this.cursorEl || !this.pagesHost || this.measures.length === 0) return;
    const measure = this.measures.find((item) => item.id === index) ?? this.measures[index];
    if (!measure) return;

    const pageWrap = this.pagesHost.querySelector<HTMLElement>(
      `[data-page="${measure.page}"]`,
    );
    if (!pageWrap) return;

    const fraction =
      duration != null && duration > 0 ? Math.min(1, Math.max(0, offset / duration)) : 0;
    const xScore = measureCursorX(measure, fraction, this.contentStartXByMeasureId);
    const point = this.cursorPointOnPage(pageWrap, xScore, measure.y, measure.sy);
    if (!point || !this.container) return;

    this.cursorEl.style.display = 'block';
    this.cursorEl.style.position = 'absolute';
    this.cursorEl.style.width = '3px';
    this.cursorEl.style.left = `${point.x}px`;
    this.cursorEl.style.top = `${point.y}px`;
    this.cursorEl.style.height = `${point.height}px`;
    this.cursorEl.style.zIndex = '50';

    if (this.followCursor && this.cursorEl) {
      followPlaygroundCursor(this.container, this.cursorEl);
    }
  }

  private cursorPointOnPage(
    pageWrap: HTMLElement,
    xScore: number,
    yScore: number,
    sy: number,
  ): { x: number; y: number; height: number } | null {
    const container = this.container;
    if (!container) return null;
    const containerRect = container.getBoundingClientRect();
    const pageRect = pageWrap.getBoundingClientRect();
    const svg = pageWrap.querySelector('svg');
    const vb = svg?.viewBox?.baseVal;
    const scaleX = vb && vb.width > 0 ? pageRect.width / vb.width : 1;
    const scaleY = vb && vb.height > 0 ? pageRect.height / vb.height : scaleX;
    return {
      x: pageRect.left - containerRect.left + xScore * scaleX,
      y: pageRect.top - containerRect.top + yScore * scaleY,
      height: Math.max(sy * scaleY, 24),
    };
  }

  onResize(): void {
    /* SVG width=100% reflow; reposiciona cursor no próximo moveTo. */
  }

  onEvent(_type: keyof GlobalEventHandlersEventMap, _event: Event): void {
    /* Toque na partitura: o Player trata via renderer quando integrado. */
  }

  get version(): string {
    return 'webmscore-sheet-renderer';
  }

  private terminateScoreWorker(): void {
    const score = this.score;
    if (!score) return;
    try {
      score.destroy(false);
    } catch {
      resetWebMscoreModule();
    }
  }
}

async function loadWebMscoreMusicXml(
  WebMscore: Awaited<ReturnType<typeof loadWebMscoreModule>>,
  xml: string,
): Promise<WebMscoreInstance> {
  const bytes = new TextEncoder().encode(xml);
  return WebMscore.load('musicxml', bytes, [], true);
}

function normalizeWebMscoreLoadError(caught: unknown, _rawXml: string): Error {
  const message =
    caught instanceof Error ? caught.message : typeof caught === 'string' ? caught : '';
  if (caught instanceof Error) {
    return caught.name === 'WorkerError' && message
      ? new Error(message)
      : caught;
  }
  return new Error(message || 'webmscore_load_failed');
}
