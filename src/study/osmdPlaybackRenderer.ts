import { OpenSheetMusicDisplay, type SourceMeasure } from 'opensheetmusicdisplay';
import type { ISheetRenderer, Player } from '@music-i18n/musicxml-player';

type GraphicalMeasure = {
  PositionAndShape?: {
    AbsolutePosition?: { x: number; y: number };
    Size?: { width: number; height: number };
  };
};

type GraphicSheetLike = {
  NumberOfStaves?: number;
  findGraphicalMeasure?: (measureIndex: number, staffIndex: number) => GraphicalMeasure | null | undefined;
};

const LINE_CLASS = 'study-playback-line';

/**
 * O cursor nativo do OSMD (img) fica atrás da partitura e, no tipo "linha fina",
 * o canvas sai transparente. Esta classe desenha uma barra própria, alinhada
 * aos limites do compasso que o OSMD já gravou.
 */
export class OsmdPlaybackRenderer implements ISheetRenderer {
  player?: Player;

  private line: HTMLDivElement | null = null;
  private lastScrollAt = 0;
  private readonly scrollThrottleMs = 80;

  constructor(
    private getOsmd: () => OpenSheetMusicDisplay | null,
    private getScoreContainer: () => HTMLElement | null,
    /** Só rola a partitura automaticamente no mobile enquanto toca. */
    private shouldAutoScroll: () => boolean = () => false,
  ) {}

  destroy() {
    this.line?.remove();
    this.line = null;
  }

  async initialize() {}

  moveTo(
    measureIndex: number,
    _measureStartMs: number,
    offsetMs: number,
    durationMs?: number,
  ) {
    const osmd = this.getOsmd();
    if (!osmd?.Sheet?.SourceMeasures?.[measureIndex]) return;

    const duration =
      durationMs && durationMs > 0
        ? durationMs
        : this.measureDurationMs(osmd.Sheet.SourceMeasures[measureIndex]);
    const fraction =
      duration > 0 ? Math.max(0, Math.min(1, offsetMs / duration)) : 0;

    this.placeLine(osmd, measureIndex, fraction);
  }

  onResize() {
    const osmd = this.getOsmd();
    if (!osmd?.IsReadyToRender()) return;
    osmd.render();
  }

  onEvent() {}

  get version() {
    const osmd = this.getOsmd();
    return osmd ? `osmd-playback v${osmd.Version}` : 'osmd-playback';
  }

  resetCursor() {
    this.line?.remove();
    this.line = null;
  }

  private measureDurationMs(measure: SourceMeasure): number {
    const tempo = measure.TempoInBPM > 0 ? measure.TempoInBPM : 120;
    const length = measure.Duration?.RealValue ?? 0;
    if (length <= 0) return 0;
    return (length * 4 * 60 * 1000) / tempo;
  }

  private placeLine(osmd: OpenSheetMusicDisplay, measureIndex: number, fraction: number) {
    const bounds = this.measureBoundsPx(osmd, measureIndex);
    if (!bounds) return;

    const host = osmd.cursor?.cursorElement?.parentElement ?? null;
    const mount = host ?? this.getScoreContainer();
    if (!mount) return;
    if (getComputedStyle(mount).position === 'static') {
      mount.style.position = 'relative';
    }

    const line = this.ensureLine(mount);
    const x = bounds.x + fraction * bounds.width;
    line.style.left = `${x}px`;
    line.style.top = `${bounds.y}px`;
    line.style.height = `${Math.max(bounds.height, 48)}px`;
    this.scrollLineIntoView(line);
  }

  private measureBoundsPx(
    osmd: OpenSheetMusicDisplay,
    measureIndex: number,
  ): { x: number; y: number; width: number; height: number } | null {
    const graphic = (osmd as OpenSheetMusicDisplay & { GraphicSheet?: GraphicSheetLike }).GraphicSheet;
    if (!graphic?.findGraphicalMeasure) return null;

    const staffCount = Math.max(1, graphic.NumberOfStaves ?? 1);
    let measure: GraphicalMeasure | null | undefined;
    let top = Number.POSITIVE_INFINITY;
    let bottom = 0;
    let x = 0;
    let width = 0;

    for (let staff = 0; staff < staffCount; staff++) {
      const found = graphic.findGraphicalMeasure(measureIndex, staff);
      const shape = found?.PositionAndShape;
      const origin = shape?.AbsolutePosition;
      const size = shape?.Size;
      if (!found || !origin || !size || size.height <= 0) continue;
      if (!measure) {
        measure = found;
        x = origin.x;
        width = size.width;
      }
      top = Math.min(top, origin.y);
      bottom = Math.max(bottom, origin.y + size.height);
    }

    if (!measure || !Number.isFinite(top) || width <= 0) return null;

    const zoom = osmd.Zoom > 0 ? osmd.Zoom : 1;
    const unit = 10 * zoom;
    return {
      x: x * unit,
      y: top * unit,
      width: width * unit,
      height: (bottom - top) * unit,
    };
  }

  private ensureLine(mount: HTMLElement): HTMLDivElement {
    if (this.line?.isConnected) return this.line;
    const line = document.createElement('div');
    line.className = LINE_CLASS;
    line.setAttribute('aria-hidden', 'true');
    line.style.position = 'absolute';
    line.style.width = '3px';
    line.style.background = '#dc2626';
    line.style.borderRadius = '2px';
    line.style.zIndex = '40';
    line.style.pointerEvents = 'none';
    line.style.boxShadow = '0 0 0 1px rgba(220, 38, 38, 0.35)';
    mount.appendChild(line);
    this.line = line;
    return line;
  }

  private scrollLineIntoView(line: HTMLElement) {
    if (!this.shouldAutoScroll()) return;
    const now = Date.now();
    if (now - this.lastScrollAt < this.scrollThrottleMs) return;
    this.lastScrollAt = now;

    const container = this.getScoreContainer();
    if (!container) return;

    const lineRect = line.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (lineRect.height <= 0) return;

    const centerY =
      lineRect.top - containerRect.top + container.scrollTop + lineRect.height / 2;
    const centerX =
      lineRect.left - containerRect.left + container.scrollLeft + lineRect.width / 2;

    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetTop = Math.max(0, Math.min(centerY - container.clientHeight / 2, maxTop));
    if (Math.abs(container.scrollTop - targetTop) > 24) {
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    }

    if (container.scrollWidth > container.clientWidth) {
      const maxLeft = container.scrollWidth - container.clientWidth;
      const targetLeft = Math.max(0, Math.min(centerX - container.clientWidth / 2, maxLeft));
      if (Math.abs(container.scrollLeft - targetLeft) > 24) {
        container.scrollTo({ left: targetLeft, behavior: 'smooth' });
      }
    }
  }
}
