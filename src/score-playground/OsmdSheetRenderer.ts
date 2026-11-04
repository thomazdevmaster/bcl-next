import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import type { ISheetRenderer } from '@music-i18n/musicxml-player';
import type {
  MeasureIndex,
  MillisecsTimestamp,
  Player,
  PlayerOptions,
} from '@music-i18n/musicxml-player';
import {
  layoutPlaygroundOsmd,
  measuresPerDesktopLine,
  measuresPerMobileLine,
} from './osmdPlaygroundLayout';
import { continuousCursorX } from './playgroundCursorPosition';
import { followPlaygroundCursor } from './playgroundFollowCursor';
import type { PlaygroundZoomState } from './playgroundZoomTypes';
import {
  DESKTOP_MEASURES_MAX,
  DESKTOP_MEASURES_MIN,
  MOBILE_MEASURES_MAX,
  MOBILE_MEASURES_MIN,
} from './playgroundZoomTypes';

type GraphicalMeasure = {
  PositionAndShape?: {
    AbsolutePosition?: { x: number; y: number };
    Size?: { width: number; height: number };
  };
};

type StaffEntryLike = {
  relInMeasureTimestamp?: { RealValue?: number };
  boundingBox?: { AbsolutePosition?: { x: number } };
};

type GraphicalMeasureWithEntries = GraphicalMeasure & {
  staffEntries?: StaffEntryLike[];
};

type GraphicSheetLike = {
  NumberOfStaves?: number;
  MeasureList?: GraphicalMeasureWithEntries[][];
  findGraphicalMeasure?: (measureIndex: number, staffIndex: number) => GraphicalMeasure | null | undefined;
};

const CURSOR_CLASS = 'score-playground-cursor';

/** Fallback quando webmscore falha (MusicXML 4 / WASM). Mesma ideia do modo estudo. */
export class OsmdSheetRenderer implements ISheetRenderer {
  player?: Player;

  private osmd: OpenSheetMusicDisplay | null = null;
  private container: HTMLElement | null = null;
  private osmdMount: HTMLElement | null = null;
  private cursorEl: HTMLDivElement | null = null;
  private followCursor = true;
  private measuresOverride: number | null = null;
  private layoutRendering = false;

  destroy(): void {
    this.cursorEl?.remove();
    this.cursorEl = null;
    try {
      this.osmd?.clear();
    } catch {
      /* ignore */
    }
    this.osmd = null;
    this.osmdMount = null;
    if (this.container) this.container.replaceChildren();
    this.container = null;
  }

  async initialize(
    container: HTMLElement,
    musicXml: string,
    options: Required<PlayerOptions>,
  ): Promise<void> {
    this.followCursor = options.followCursor !== false;
    this.destroy();
    this.container = container;
    container.classList.add('score-playground-sheet-host', 'score-playground-osmd', 'relative');
    container.replaceChildren();

    const mount = document.createElement('div');
    mount.className = 'score-playground-osmd-canvas relative z-0 min-h-[8rem] w-full';
    container.appendChild(mount);
    this.osmdMount = mount;

    const osmd = new OpenSheetMusicDisplay(mount, {
      drawingParameters: 'default',
      autoResize: true,
      followCursor: false,
      pageFormat: 'Endless',
    });
    await osmd.load(musicXml);
    await layoutPlaygroundOsmd(osmd, mount, this.measuresOverride);
    this.osmd = osmd;
    this.ensureCursor();
  }

  getZoomState(): PlaygroundZoomState {
    const measures = this.currentMeasuresPerLine();
    const mobile = this.isMobileView();
    const min = mobile ? MOBILE_MEASURES_MIN : DESKTOP_MEASURES_MIN;
    const max = mobile ? MOBILE_MEASURES_MAX : DESKTOP_MEASURES_MAX;
    return {
      engine: 'osmd',
      label: mobile
        ? `${measures} comp./linha`
        : `${measures} comp./linha`,
      canZoomIn: !this.layoutRendering && measures > min,
      canZoomOut: !this.layoutRendering && measures < max,
      measuresPerLine: measures,
    };
  }

  /** Restaura o zoom salvo antes do primeiro desenho. `null` volta ao automático. */
  setMeasuresPerLine(value: number | null): void {
    this.measuresOverride = value;
  }

  zoomIn(): void {
    void this.applyZoomStep(-1);
  }

  zoomOut(): void {
    void this.applyZoomStep(1);
  }

  private isMobileView(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 600px)').matches;
  }

  private currentMeasuresPerLine(): number {
    const mount = this.osmdMount;
    const available = Math.max(
      this.isMobileView() ? 280 : 480,
      mount?.clientWidth ?? 960,
    );
    return this.isMobileView()
      ? measuresPerMobileLine(this.measuresOverride)
      : measuresPerDesktopLine(available, this.measuresOverride);
  }

  private async applyZoomStep(delta: number): Promise<void> {
    if (!this.osmd || !this.osmdMount || this.layoutRendering) return;
    const next = this.currentMeasuresPerLine() + delta;
    const mobile = this.isMobileView();
    const min = mobile ? MOBILE_MEASURES_MIN : DESKTOP_MEASURES_MIN;
    const max = mobile ? MOBILE_MEASURES_MAX : DESKTOP_MEASURES_MAX;
    if (next < min || next > max) return;
    this.measuresOverride = next;
    this.layoutRendering = true;
    try {
      await layoutPlaygroundOsmd(this.osmd, this.osmdMount, this.measuresOverride);
      this.ensureCursor();
    } finally {
      this.layoutRendering = false;
    }
  }

  moveTo(
    index: MeasureIndex,
    _start: MillisecsTimestamp,
    offset: MillisecsTimestamp,
    duration?: MillisecsTimestamp,
  ): void {
    const osmd = this.osmd;
    if (!osmd?.Sheet?.SourceMeasures?.[index] || !this.cursorEl || !this.container) return;

    const durationMs =
      duration != null && duration > 0
        ? duration
        : this.measureDurationMs(osmd.Sheet.SourceMeasures[index]);
    const fraction =
      durationMs > 0 ? Math.min(1, Math.max(0, offset / durationMs)) : 0;

    const bounds = this.measureBoundsPx(osmd, index);
    if (!bounds) return;

    const cursor = this.ensureCursor();
    const measureWhole = osmd.Sheet.SourceMeasures[index]?.Duration?.RealValue ?? 1;
    const x = continuousCursorX(
      this.noteColumnsPx(osmd, index),
      fraction,
      measureWhole,
      bounds.x,
      bounds.x + bounds.width,
    );
    cursor.style.display = 'block';
    cursor.style.position = 'absolute';
    const mountTop = this.osmdMount?.offsetTop ?? 0;
    cursor.style.left = `${x}px`;
    cursor.style.top = `${mountTop + bounds.y}px`;
    cursor.style.height = `${Math.max(bounds.height, 48)}px`;
    cursor.style.width = '3px';
    cursor.style.zIndex = '50';

    if (this.followCursor) {
      followPlaygroundCursor(this.container, cursor);
    }
  }

  onResize(): void {
    const osmd = this.osmd;
    const mount = this.osmdMount;
    if (!osmd || !mount) return;
    void layoutPlaygroundOsmd(osmd, mount, this.measuresOverride).then(() =>
      this.ensureCursor(),
    );
  }

  onEvent(_type: keyof GlobalEventHandlersEventMap, _event: Event): void {}

  get version(): string {
    return 'osmd-playground-sheet-renderer';
  }

  private ensureCursor(): HTMLDivElement {
    if (this.cursorEl?.isConnected && this.container?.contains(this.cursorEl)) {
      return this.cursorEl;
    }
    const cursor = document.createElement('div');
    cursor.className = CURSOR_CLASS;
    cursor.setAttribute('aria-hidden', 'true');
    this.container?.appendChild(cursor);
    this.cursorEl = cursor;
    return cursor;
  }

  private noteColumnsPx(
    osmd: OpenSheetMusicDisplay,
    measureIndex: number,
  ): { rel: number; x: number }[] {
    const graphic = (osmd as OpenSheetMusicDisplay & { GraphicSheet?: GraphicSheetLike }).GraphicSheet;
    const measures = graphic?.MeasureList?.[measureIndex];
    if (!measures) return [];
    const zoom = osmd.Zoom > 0 ? osmd.Zoom : 1;
    const unit = 10 * zoom;
    const columns: { rel: number; x: number }[] = [];
    for (const measure of measures) {
      for (const entry of measure?.staffEntries ?? []) {
        const rel = entry.relInMeasureTimestamp?.RealValue;
        const x = entry.boundingBox?.AbsolutePosition?.x;
        if (rel == null || x == null) continue;
        columns.push({ rel, x: x * unit });
      }
    }
    return columns;
  }

  private measureDurationMs(measure: { TempoInBPM: number; Duration?: { RealValue?: number } }): number {
    const tempo = measure.TempoInBPM > 0 ? measure.TempoInBPM : 120;
    const length = measure.Duration?.RealValue ?? 0;
    if (length <= 0) return 0;
    return (length * 4 * 60 * 1000) / tempo;
  }

  private measureBoundsPx(
    osmd: OpenSheetMusicDisplay,
    measureIndex: number,
  ): { x: number; y: number; width: number; height: number } | null {
    const graphic = (osmd as OpenSheetMusicDisplay & { GraphicSheet?: GraphicSheetLike }).GraphicSheet;
    if (!graphic?.findGraphicalMeasure) return null;

    const staffCount = Math.max(1, graphic.NumberOfStaves ?? 1);
    let top = Number.POSITIVE_INFINITY;
    let bottom = 0;
    let x = 0;
    let width = 0;
    let foundAny = false;

    for (let staff = 0; staff < staffCount; staff += 1) {
      const found = graphic.findGraphicalMeasure(measureIndex, staff);
      const shape = found?.PositionAndShape;
      const origin = shape?.AbsolutePosition;
      const size = shape?.Size;
      if (!found || !origin || !size || size.height <= 0) continue;
      foundAny = true;
      if (width <= 0) {
        x = origin.x;
        width = size.width;
      }
      top = Math.min(top, origin.y);
      bottom = Math.max(bottom, origin.y + size.height);
    }

    if (!foundAny || !Number.isFinite(top) || width <= 0) return null;

    const zoom = osmd.Zoom > 0 ? osmd.Zoom : 1;
    const unit = 10 * zoom;
    return {
      x: x * unit,
      y: top * unit,
      width: width * unit,
      height: (bottom - top) * unit,
    };
  }
}
