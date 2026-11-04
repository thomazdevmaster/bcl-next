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
import {
  stampRenderedScoreHeading,
  type RenderedScoreHeading,
} from '@/study/stampRenderedScoreHeading';
import type { UnrolledToWrittenMap } from './scorePlaygroundRepeatMap';

export type PlaygroundSheetEngine = 'webmscore' | 'osmd';

/** `unrolled`: partitura desdobrada (padrão, usada pelo Player). `written`: com voltas/D.C./D.S. */
export type PlaygroundDisplayMode = 'unrolled' | 'written';

/**
 * Tenta MuseScore (webmscore); se o WASM falhar, usa OSMD como no /study.
 *
 * Também sabe alternar entre a partitura desdobrada (eixo do Player/MIDI) e a escrita
 * (com voltas): `setWrittenAlternative` recebe o XML escrito e a correspondência de
 * índices; `moveTo` traduz o índice do Player antes de repassar ao motor interno, então
 * o cursor continua sincronizado com o áudio em qualquer um dos dois modos.
 */
export class ScorePlaygroundSheetRenderer implements ISheetRenderer {
  player?: Player;

  sheetEngine: PlaygroundSheetEngine = 'webmscore';

  displayMode: PlaygroundDisplayMode = 'unrolled';

  private inner: ISheetRenderer | null = null;
  private heading: RenderedScoreHeading = {};
  private container: HTMLElement | null = null;
  private options: Required<PlayerOptions> | null = null;
  private unrolledXml = '';
  private writtenXml: string | null = null;
  private unrolledToWritten: UnrolledToWrittenMap | null = null;

  /** Título, autor e arranjo do cadastro, usados quando o XML não traz créditos. */
  setHeading(heading: RenderedScoreHeading): void {
    this.heading = heading;
  }

  /**
   * XML escrito (com voltas) e a correspondência compasso desdobrado -> escrito. Passe
   * `null`/`null` quando a música não tem repetição real ou o backend não enviou a marca
   * (timemap antigo) — o alternador fica indisponível (ver `hasWrittenAlternative`).
   */
  setWrittenAlternative(
    xml: string | null,
    unrolledToWritten: UnrolledToWrittenMap | null,
  ): void {
    this.writtenXml = xml;
    this.unrolledToWritten = unrolledToWritten;
  }

  hasWrittenAlternative(): boolean {
    return this.writtenXml != null && this.unrolledToWritten != null;
  }

  destroy(): void {
    this.inner?.destroy();
    this.inner = null;
  }

  async initialize(
    container: HTMLElement,
    musicXml: string,
    options: Required<PlayerOptions>,
  ): Promise<void> {
    this.container = container;
    this.options = options;
    this.unrolledXml = musicXml;
    await this.renderCurrentMode();
  }

  /** Troca entre `unrolled`/`written` e redesenha com o motor adequado para o novo XML. */
  async setDisplayMode(mode: PlaygroundDisplayMode): Promise<void> {
    if (mode === this.displayMode) return;
    if (mode === 'written' && !this.hasWrittenAlternative()) return;
    this.displayMode = mode;
    await this.renderCurrentMode();
  }

  private async renderCurrentMode(): Promise<void> {
    const container = this.container;
    const options = this.options;
    if (!container || !options) return;
    this.destroy();

    const musicXml =
      this.displayMode === 'written' && this.writtenXml != null
        ? this.writtenXml
        : this.unrolledXml;

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
    await osmd.initialize(container, stampRenderedScoreHeading(musicXml, this.heading), options);
    this.inner = osmd;
    this.sheetEngine = 'osmd';
  }

  moveTo(
    index: MeasureIndex,
    start: MillisecsTimestamp,
    offset: MillisecsTimestamp,
    duration?: MillisecsTimestamp,
  ): void {
    if (this.displayMode === 'written' && this.unrolledToWritten) {
      const translated = this.unrolledToWritten[index];
      // Sem correspondência conhecida para este compasso: mantém o cursor onde estava
      // em vez de arriscar posicioná-lo num compasso escrito errado.
      if (translated == null) return;
      this.inner?.moveTo(translated, start, offset, duration);
      return;
    }
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
