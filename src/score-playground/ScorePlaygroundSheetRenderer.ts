import type { ISheetRenderer } from '@music-i18n/musicxml-player';
import type {
  MeasureIndex,
  MillisecsTimestamp,
  Player,
  PlayerOptions,
} from '@music-i18n/musicxml-player';
import { isLargeScoreForWebMscoreLayout } from './prepareMusicXmlForWebMscoreDisplay';
import { resetWebMscoreModule } from './webmscoreLoader';
import { WebMscoreSheetRenderer } from './WebMscoreSheetRenderer';
import { OsmdSheetRenderer } from './OsmdSheetRenderer';
import type { PlaygroundZoomState } from './playgroundZoomTypes';
import { isPlaygroundZoomable } from './playgroundZoomTypes';

export type PlaygroundSheetEngine = 'webmscore' | 'osmd';

/**
 * Tenta MuseScore (webmscore); se o WASM falhar, usa OSMD como no /study.
 */
export class ScorePlaygroundSheetRenderer implements ISheetRenderer {
  player?: Player;

  sheetEngine: PlaygroundSheetEngine = 'webmscore';

  private inner: ISheetRenderer | null = null;

  destroy(): void {
    this.inner?.destroy();
    this.inner = null;
  }

  async initialize(
    container: HTMLElement,
    musicXml: string,
    options: Required<PlayerOptions>,
  ): Promise<void> {
    this.destroy();

    const skipWebMscore = isLargeScoreForWebMscoreLayout(musicXml);
    if (!skipWebMscore) {
      const webm = new WebMscoreSheetRenderer();
      try {
        await webm.initialize(container, musicXml, options);
        this.inner = webm;
        this.sheetEngine = 'webmscore';
        return;
      } catch (first) {
        resetWebMscoreModule();
        if (process.env.NODE_ENV === 'development') {
          console.warn('[score_playground] webmscore falhou; fallback OSMD', first);
        }
      }
    }

    container.replaceChildren();
    const osmd = new OsmdSheetRenderer();
    await osmd.initialize(container, musicXml, options);
    this.inner = osmd;
    this.sheetEngine = 'osmd';
  }

  moveTo(
    index: MeasureIndex,
    start: MillisecsTimestamp,
    offset: MillisecsTimestamp,
    duration?: MillisecsTimestamp,
  ): void {
    this.inner?.moveTo(index, start, offset, duration);
  }

  onResize(): void {
    this.inner?.onResize();
  }

  onEvent(type: keyof GlobalEventHandlersEventMap, event: Event): void {
    this.inner?.onEvent(type, event);
  }

  get version(): string {
    return this.inner?.version ?? 'score-playground-sheet';
  }

  getZoomState(): PlaygroundZoomState {
    if (isPlaygroundZoomable(this.inner)) return this.inner.getZoomState();
    return {
      engine: this.sheetEngine,
      label: '—',
      canZoomIn: false,
      canZoomOut: false,
    };
  }

  zoomIn(): void {
    if (isPlaygroundZoomable(this.inner)) this.inner.zoomIn();
  }

  zoomOut(): void {
    if (isPlaygroundZoomable(this.inner)) this.inner.zoomOut();
  }
}
