import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

/** Regras de gravação existem na instância, mas não no tipo publicado do OSMD. */
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
import { Player, VerovioConverter } from '@music-i18n/musicxml-player';
import { fetchAuthedAsset } from '@/lib/api';
import { failureMessage } from '@/lib/userMessages';
import { OsmdPlaybackRenderer } from './osmdPlaybackRenderer';
import { StudyPlayerController } from './studyPlayerController';
import {
  getPlaybackPositionFromTimemap,
  getPlayerPositionMs,
  readPlayerTimemap,
} from './studyTimemap';
import {
  buildStudyScoreHeader,
  enrichStudyMusicXml,
  type StudyScoreHeader,
  type StudySongMetadataInput,
} from './enrichStudyMusicXml';
import {
  extractTempoInfoFromXml,
  extractInstrumentsFromXml,
  filterXmlByPartIds,
  mergeMusicXmlFetchedParts,
  prepareMusicXmlForStudyPlayback,
  sanitizeMusicXmlPartList,
  selectionIncludesPercussion,
  selectionIsPercussionOnly,
  type InstrumentInfo,
} from './studyUtils';
import {
  countDrumChannelNoteOns,
  drumChannelPitchHistogram,
  prepareStudyMidiBuffer,
  reencodeSmfForPlayback,
  shouldReencodeSmfForPlayback,
} from './studyMidiFix';
import { composeStudyPlaybackMidi } from './studyPlaybackMidi';
import { fetchFilteredXml, fetchPartMidi, selectionStorageKey } from './songParts';

/**
 * O WASM do Verovio embarcado no musicxml-player traz 652 dos 1043 glifos que
 * ele espera, e reclama disso ao construir o toolkit. Não afeta o MIDI — única
 * coisa que usamos do Verovio — nem a partitura, que é desenhada pelo OSMD.
 */
const VEROVIO_FONT_NOISE = ['default SMuFL glyphs', 'font could not be loaded'];

export type StudyViewSnapshot = {
  scoreLoading: boolean;
  xmlLoaded: boolean;
  scoreError: string | null;
  currentScoreName: string;
  scoreHeader: StudyScoreHeader | null;
  fullscreenScore: boolean;
  isMobile: boolean;
  /** Compassos por linha no celular. No desktop fica 0. */
  mobileMeasuresPerLine: number;
  canZoomMobileIn: boolean;
  canZoomMobileOut: boolean;
  playbackPosition: { measure: number; beat: number; timeSignature: string } | null;
  /** Reservado; o cursor visual é o nativo do OSMD. */
  playbackCursorX: number | null;
  loading: boolean;
  playerReady: boolean;
  playerLoading: boolean;
  midiLoaded: boolean;
  midiLoading: boolean;
  playerError: string | null;
  /** Áudio pronto para play (player + MIDI). */
  audioReady: boolean;
  /** Preparando áudio após a partitura carregar. */
  audioPreparing: boolean;
  desktopAutoScroll: boolean;
  playerExpanded: boolean;
  bpm: number;
  bpmMin: number;
  bpmMax: number;
  timeSignature: string;
  baseBpm: number;
  metronomeEnabled: boolean;
  metronomeVolume: number;
  audioVolume: number;
  loopEnabled: boolean;
  loopStartMeasure: number | null;
  loopEndMeasure: number | null;
  instruments: {
    available: InstrumentInfo[];
    selectedIds: string[];
    midiSelectedIds: string[];
    filtered: InstrumentInfo[];
    selectionMatchesApplied: boolean;
    showSelection: boolean;
    cardCollapsed: boolean;
    allSelected: boolean;
    midiAllSelected: boolean;
    summary: string;
    filter: string;
  };
};

export type StudySessionOptions = {
  getApiUrl: () => string;
  /** Container rolável + área do cursor (classe .score-container no Angular). */
  getScoreContainer: () => HTMLElement | null;
  /** Elemento exclusivo onde o OSMD desenha (será esvaziado ao re-renderizar). */
  getOsmdContainer: () => HTMLElement | null;
  onSnack?: (message: string) => void;
};

export type StudyInstrumentSelection = {
  scoreInstrumentIds?: string[];
  midiInstrumentIds?: string[];
  /** Lista completa de naipes, mesmo quando o XML inicial veio recortado. */
  catalog?: InstrumentInfo[];
  /** Partitura inteira, baixada em segundo plano para trocar de naipe depois. */
  fullScoreUrl?: string;
  /** Dados cadastrados da música (título, compositor, etc.). */
  songMetadata?: StudySongMetadataInput;
};

function sameIdSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const ids = new Set(left);
  return right.every((id) => ids.has(id));
}

/** Cabeçalho SMF (MThd). */
function isValidStandardMidiBuffer(midi: ArrayBuffer): boolean {
  if (midi.byteLength < 14) return false;
  const view = new DataView(midi);
  return view.getUint32(0) === 0x4d546864;
}

type StudyPlayerSequencer = {
  loadNewSongList?: (songs: { binary: ArrayBuffer; fileName?: string }[]) => void;
  isLoading?: boolean;
  duration?: number;
  currentTime?: number;
  pause?: () => void;
};

type StudyPlayerInternals = {
  _sequencer?: StudyPlayerSequencer;
  _context?: AudioContext;
  _duration?: number;
  midi?: ArrayBuffer;
  rewind?: () => void;
};

function isMobileView() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 600px)').matches;
}

const MOBILE_MEASURES_MIN = 1;
const MOBILE_MEASURES_MAX = 5;
/** Zoom OSMD com 1 compasso por linha (referência “100%”). */
const MOBILE_ZOOM_BASELINE_MEASURES = 1;
const MOBILE_SCALE_MIN = 0.52;
const MOBILE_SCALE_MAX = 1.28;

/** Padrão mobile: 1 compasso por linha; afastar aumenta até {@link MOBILE_MEASURES_MAX}. */
function measuresPerMobileLine(_width: number): number {
  return MOBILE_ZOOM_BASELINE_MEASURES;
}

/** Encolhe a gravação ao caber mais compassos na mesma largura de tela. */
function mobileLayoutZoom(measuresPerLine: number): number {
  const m = Math.max(MOBILE_MEASURES_MIN, Math.min(MOBILE_MEASURES_MAX, measuresPerLine));
  const raw = MOBILE_ZOOM_BASELINE_MEASURES / m;
  return Math.min(MOBILE_SCALE_MAX, Math.max(MOBILE_SCALE_MIN, raw));
}

/** Desktop: compassos por linha conforme a largura útil (todos com mesma largura). */
function measuresPerDesktopLine(width: number): number {
  if (width < 720) return 3;
  if (width < 960) return 4;
  if (width < 1200) return 5;
  if (width < 1400) return 6;
  return 8;
}

export class StudySession {
  private listeners = new Set<() => void>();
  private snapshot: StudyViewSnapshot;

  private options: StudySessionOptions;
  private ownerId: string | null = null;
  private loadToken = 0;
  private sourceXml: string | null = null;
  /** XML integral da música (nunca substituído por recorte da API) — mapa MuseScore midi-unpitched. */
  private musicXmlCatalog: string | null = null;
  private currentScoreId = 'local';
  private lastRenderedSelectionKey: string | null = null;
  private midiCache = new Map<string, ArrayBuffer>();

  private player: unknown = null;
  private hiddenPlayerContainer: HTMLElement | null = null;
  private midiOnlyMode = false;
  private osmd: OpenSheetMusicDisplay | null = null;
  private osmdPlaybackRenderer: OsmdPlaybackRenderer | null = null;
  private workletPatched = false;
  private scrollPatched = false;

  private playerController = new StudyPlayerController();
  private loopTimer: number | null = null;
  private loopStartTs: number | null = null;
  private loopEndTs: number | null = null;
  private cursorSyncTimer: number | null = null;
  private lastCursorMeasure = -1;
  private lastCursorBeat = -1;

  private isPlaying = false;
  private tempo = 1.0;
  private beatsPerMeasure = 4;

  private availableInstruments: InstrumentInfo[] = [];
  private selectedInstrumentIds: string[] = [];
  private selectedMidiInstrumentIds: string[] = [];
  private lastAppliedMidiInstrumentIds: string[] = [];
  private lastAppliedInstrumentIds: string[] = [];
  private instrumentFilter = '';
  private showInstrumentSelection = false;
  private instrumentCardCollapsed = true;

  private midiPrefetchScheduled = false;
  private midiWarmupScheduled = false;
  /** MIDI do Verovio após Player.create (fallback se o worker falhar). */
  private playerFallbackMidi: ArrayBuffer | null = null;
  /** Chave do último MIDI do servidor aplicado no sequenciador SpessaSynth. */
  private appliedServerMidiKey: string | null = null;
  /** Verovio auxiliar — não reutiliza o converter do Player (reinit quebraria timemap/áudio). */
  private auxiliaryVerovioConverter: VerovioConverter | null = null;

  /** UI fields mirrored in snapshot */
  private scoreLoading = false;
  private xmlLoaded = false;
  private scoreError: string | null = null;
  private currentScoreName = 'Nenhuma selecionada';
  private scoreHeader: StudyScoreHeader | null = null;
  private lastSongMetadata: StudySongMetadataInput | null = null;
  private fullscreenScore = false;
  private isMobile = isMobileView();
  /** Null usa a quantidade automática da largura. Zoom do usuário grava o valor. */
  private mobileMeasuresOverride: number | null = null;
  private mobileLayoutRendering = false;
  private playbackPosition: StudyViewSnapshot['playbackPosition'] = null;
  private playbackCursorX: number | null = null;
  private loading = false;
  private playerReady = false;
  private playerLoading = false;
  private midiLoaded = false;
  private midiLoading = false;
  private playerError: string | null = null;
  private playerExpanded = false;
  private desktopAutoScroll = false;
  private bpm = 100;
  private bpmMin = 40;
  private bpmMax = 200;
  private timeSignature = '4/4';
  private baseBpm = 100;
  private metronomeEnabled = false;
  private metronomeVolume = 0.5;
  private audioVolume = 1;
  private loopEnabled = false;
  private loopStartMeasure: number | null = null;
  private loopEndMeasure: number | null = null;

  constructor(options: StudySessionOptions) {
    this.options = options;
    this.snapshot = this.buildSnapshot();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot = () => this.snapshot;

  private emit() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  private buildSnapshot(): StudyViewSnapshot {
    const q = this.instrumentFilter.trim().toLowerCase();
    const filtered = !q
      ? this.availableInstruments
      : this.availableInstruments.filter((i) => i.name.toLowerCase().includes(q));

    const selectedSet = new Set(this.selectedInstrumentIds);
    const names = this.availableInstruments.filter((i) => selectedSet.has(i.id)).map((i) => i.name);
    let summary = 'Nenhum';
    if (names.length <= 2) summary = names.join(', ');
    else if (names.length > 2) summary = `${names.slice(0, 2).join(', ')} +${names.length - 2}`;

    const allSelected =
      this.availableInstruments.length > 0 &&
      this.selectedInstrumentIds.length === this.availableInstruments.length;
    const midiAllSelected =
      this.availableInstruments.length > 0 &&
      this.selectedMidiInstrumentIds.length === this.availableInstruments.length;

    const selectionMatchesApplied =
      sameIdSet(this.selectedInstrumentIds, this.lastAppliedInstrumentIds) &&
      sameIdSet(this.selectedMidiInstrumentIds, this.lastAppliedMidiInstrumentIds);

    return {
      scoreLoading: this.scoreLoading,
      xmlLoaded: this.xmlLoaded,
      scoreError: this.scoreError,
      currentScoreName: this.currentScoreName,
      scoreHeader: this.scoreHeader,
      fullscreenScore: this.fullscreenScore,
      isMobile: this.isMobile,
      mobileMeasuresPerLine: this.isMobile ? this.currentMobileMeasures() : 0,
      canZoomMobileIn:
        this.isMobile &&
        !this.mobileLayoutRendering &&
        this.currentMobileMeasures() > MOBILE_MEASURES_MIN,
      canZoomMobileOut:
        this.isMobile &&
        !this.mobileLayoutRendering &&
        this.currentMobileMeasures() < MOBILE_MEASURES_MAX,
      playbackPosition: this.playbackPosition,
      playbackCursorX: this.playbackCursorX,
      loading: this.loading,
      playerReady: this.playerReady,
      playerLoading: this.playerLoading,
      midiLoaded: this.midiLoaded,
      midiLoading: this.midiLoading,
      playerError: this.playerError,
      audioReady:
        this.playerReady &&
        this.midiLoaded &&
        !this.playerLoading &&
        !this.midiLoading &&
        !this.midiOnlyMode,
      audioPreparing:
        this.xmlLoaded &&
        !this.midiOnlyMode &&
        (!this.playerReady ||
          this.playerLoading ||
          this.midiLoading ||
          !this.midiLoaded),
      desktopAutoScroll: this.desktopAutoScroll,
      playerExpanded: this.playerExpanded,
      bpm: this.bpm,
      bpmMin: this.bpmMin,
      bpmMax: this.bpmMax,
      timeSignature: this.timeSignature,
      baseBpm: this.baseBpm,
      metronomeEnabled: this.metronomeEnabled,
      metronomeVolume: this.metronomeVolume,
      audioVolume: this.audioVolume,
      loopEnabled: this.loopEnabled,
      loopStartMeasure: this.loopStartMeasure,
      loopEndMeasure: this.loopEndMeasure,
      instruments: {
        available: this.availableInstruments,
        selectedIds: [...this.selectedInstrumentIds],
        midiSelectedIds: [...this.selectedMidiInstrumentIds],
        filtered,
        selectionMatchesApplied,
        showSelection: this.showInstrumentSelection,
        cardCollapsed: this.instrumentCardCollapsed,
        allSelected,
        midiAllSelected,
        summary,
        filter: this.instrumentFilter,
      },
    };
  }

  updateMobile(isMobile: boolean) {
    const changed = this.isMobile !== isMobile;
    this.isMobile = isMobile;
    if (isMobile && this.xmlLoaded) this.fullscreenScore = true;
    const trimmedScore = isMobile && this.selectedInstrumentIds.length > 1;
    if (trimmedScore) {
      this.selectedInstrumentIds = [this.selectedInstrumentIds[0]];
      this.lastAppliedInstrumentIds = [...this.selectedInstrumentIds];
    }
    this.emit();
    if (trimmedScore && this.sourceXml) {
      void this.applyInstrumentSelection(this.currentScoreId, this.loadToken);
      return;
    }
    if (!changed || !this.osmd) return;
    if (isMobile) this.applyMobileLayout();
    else this.applyDesktopLayout();
    void this.osmd.render();
  }

  setFullscreenScore(v: boolean) {
    this.fullscreenScore = v;
    this.emit();
    requestAnimationFrame(() => {
      if (isMobileView()) this.applyMobileLayout();
      else this.fitScoreToViewport();
      const p = this.osmd?.render?.();
      const afterRender = () => {
        this.osmdPlaybackRenderer?.onResize();
        this.applyOsmdCursorStyle();
        if (this.isPlaying) this.syncPlaybackCursor();
      };
      if (p && typeof (p as Promise<void>).then === 'function') {
        void (p as Promise<void>).catch(() => {}).finally(afterRender);
      } else {
        afterRender();
      }
    });
  }

  setOwnerId(ownerId: string | null) {
    this.ownerId = ownerId;
  }

  toggleFullscreenScore() {
    this.setFullscreenScore(!this.fullscreenScore);
  }

  toggleDesktopAutoScroll() {
    if (this.isMobile) return;
    this.desktopAutoScroll = !this.desktopAutoScroll;
    this.emit();
  }

  /**
   * Zoom do celular: afastar = mais compassos na mesma linha (1–5);
   * aproximar = menos compassos e notas maiores.
   */
  zoomMobile(direction: 'in' | 'out') {
    if (!isMobileView() || !this.osmd || !this.xmlLoaded || this.mobileLayoutRendering) return;
    const measures = this.currentMobileMeasures();
    const next = direction === 'in' ? measures - 1 : measures + 1;
    if (next < MOBILE_MEASURES_MIN || next > MOBILE_MEASURES_MAX) return;
    this.mobileMeasuresOverride = next;
    void this.rerenderMobileLayout();
  }

  togglePlayerExpanded() {
    this.playerExpanded = !this.playerExpanded;
    this.emit();
  }

  async loadStudy(
    xml: string,
    scoreId: string,
    displayName: string,
    selection: StudyInstrumentSelection = {},
  ) {
    const token = ++this.loadToken;
    this.scoreError = null;
    this.xmlLoaded = false;
    this.scoreLoading = true;
    this.loading = true;
    if (isMobileView()) this.fullscreenScore = true;
    this.emit();
    this.currentScoreId = scoreId;
    const songMeta: StudySongMetadataInput = {
      title: selection.songMetadata?.title?.trim() || displayName,
      composer: selection.songMetadata?.composer,
      arranger: selection.songMetadata?.arranger,
      key: selection.songMetadata?.key,
    };
    this.lastSongMetadata = songMeta;
    const header = buildStudyScoreHeader(xml, songMeta);
    const enrichedXml = enrichStudyMusicXml(xml, header);
    this.scoreHeader = header;
    this.currentScoreName = header.title;
    this.musicXmlCatalog = xml;
    this.sourceXml = enrichedXml;
    this.mobileMeasuresOverride = null;
    this.lastRenderedSelectionKey = null;
    this.destroyPlayer();
    this.clearOsmdContainer();

    const tempoInfo = extractTempoInfoFromXml(enrichedXml);
    this.baseBpm = tempoInfo?.bpm ?? 100;
    this.timeSignature = tempoInfo?.timeSignature ?? '4/4';
    this.beatsPerMeasure = tempoInfo?.beatsPerMeasure ?? 4;
    this.bpm = this.baseBpm;
    this.tempo = this.bpm / this.baseBpm;
    this.updateBpmRange();
    if (this.metronomeEnabled) this.restartMetronome();

    this.initializeInstrumentsFromXml(scoreId, enrichedXml, selection);
    this.instrumentCardCollapsed = true;
    this.emit();

    if (selection.fullScoreUrl) {
      await this.adoptFullScore(selection.fullScoreUrl, token);
    }
    await this.applyInstrumentSelection(scoreId, token);
  }

  reset() {
    this.loadToken++;
    this.pause();
    this.destroyPlayer();
    this.clearOsmdContainer();
    this.osmd = null;
    this.sourceXml = null;
    this.musicXmlCatalog = null;
    this.lastRenderedSelectionKey = null;
    this.xmlLoaded = false;
    this.scoreLoading = false;
    this.scoreError = null;
    this.fullscreenScore = false;
    this.mobileMeasuresOverride = null;
    this.playbackPosition = null;
    this.playbackCursorX = null;
    this.midiLoaded = false;
    this.midiLoading = false;
    this.resetInstruments();
    this.currentScoreName = 'Nenhuma selecionada';
    this.scoreHeader = null;
    this.lastSongMetadata = null;
    this.currentScoreId = 'local';
    this.emit();
  }

  destroy() {
    this.loadToken++;
    this.pause();
    this.destroyPlayer();
    this.clearOsmdContainer();
    this.osmd = null;
    this.listeners.clear();
  }

  private resetInstruments() {
    this.availableInstruments = [];
    this.selectedInstrumentIds = [];
    this.selectedMidiInstrumentIds = [];
    this.lastAppliedInstrumentIds = [];
    this.lastAppliedMidiInstrumentIds = [];
    this.showInstrumentSelection = false;
    this.instrumentCardCollapsed = true;
    this.instrumentFilter = '';
  }

  private storageKey(id: string) {
    return selectionStorageKey(this.ownerId, id);
  }

  private async adoptFullScore(url: string, token: number) {
    try {
      const response = await fetchAuthedAsset(url);
      if (!response.ok || token !== this.loadToken) return;
      const xml = await response.text();
      if (token !== this.loadToken || !xml.includes('<')) return;
      this.musicXmlCatalog = xml;
      if (this.lastSongMetadata) {
        const header = buildStudyScoreHeader(xml, this.lastSongMetadata);
        this.scoreHeader = header;
        this.currentScoreName = header.title;
        this.sourceXml = enrichStudyMusicXml(xml, header);
      } else {
        this.sourceXml = xml;
      }
      const instruments = extractInstrumentsFromXml(xml);
      const hadPartialSource = instruments.length > this.availableInstruments.length;
      const xmlIds = new Set(instruments.map((item) => item.id));
      const idsAlign =
        this.selectedInstrumentIds.every((id) => xmlIds.has(id)) &&
        this.selectedMidiInstrumentIds.every((id) => xmlIds.has(id));
      this.availableInstruments = instruments;
      if (hadPartialSource || !idsAlign) {
        this.selectedInstrumentIds = this.selectedInstrumentIds.filter((id) => xmlIds.has(id));
        this.selectedMidiInstrumentIds = this.selectedMidiInstrumentIds.filter((id) =>
          xmlIds.has(id),
        );
        if (this.selectedInstrumentIds.length === 0) {
          this.selectedInstrumentIds = instruments.map((item) => item.id);
        }
        if (this.selectedMidiInstrumentIds.length === 0) {
          this.selectedMidiInstrumentIds = instruments.map((item) => item.id);
        }
      }
      this.emit();
      if (token === this.loadToken && this.xmlLoaded) {
        this.lastRenderedSelectionKey = null;
        void this.applyInstrumentSelection(this.currentScoreId, token);
      }
    } catch {
      /* a partitura recortada continua utilizável */
    }
  }

  private readStoredSelection(id: string): { score: string[]; midi: string[] } {
    try {
      const raw = localStorage.getItem(this.storageKey(id));
      if (!raw) return { score: [], midi: [] };
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const score = parsed.filter((item): item is string => typeof item === 'string');
        return { score, midi: score };
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as { score?: unknown; midi?: unknown };
        return {
          score: Array.isArray(record.score)
            ? record.score.filter((item): item is string => typeof item === 'string')
            : [],
          midi: Array.isArray(record.midi)
            ? record.midi.filter((item): item is string => typeof item === 'string')
            : [],
        };
      }
      return { score: [], midi: [] };
    } catch {
      return { score: [], midi: [] };
    }
  }

  private persistSelection(id: string, score: string[], midi: string[]) {
    try {
      localStorage.setItem(this.storageKey(id), JSON.stringify({ score, midi }));
    } catch {
      /* ignore */
    }
  }

  private initializeInstrumentsFromXml(
    scoreId: string,
    xml: string,
    selection: StudyInstrumentSelection,
  ) {
    const instruments =
      selection.catalog && selection.catalog.length > 0
        ? selection.catalog
        : extractInstrumentsFromXml(xml);
    this.availableInstruments = instruments;
    const availableIds = new Set(this.availableInstruments.map((i) => i.id));
    const stored = this.readStoredSelection(scoreId);
    const storedScore = stored.score.filter((id) => availableIds.has(id));
    const storedMidi = stored.midi.filter((id) => availableIds.has(id));
    const requestedScoreIds = (selection.scoreInstrumentIds ?? []).filter((id) =>
      availableIds.has(id),
    );
    const requestedMidiIds = (selection.midiInstrumentIds ?? []).filter((id) =>
      availableIds.has(id),
    );
    const allIds = this.availableInstruments.map((i) => i.id);
    const scoreIds =
      requestedScoreIds.length > 0
        ? requestedScoreIds
        : storedScore.length > 0
          ? storedScore
          : allIds;
    this.selectedInstrumentIds =
      isMobileView() && scoreIds.length > 1 ? [scoreIds[0]] : scoreIds;
    this.selectedMidiInstrumentIds =
      requestedMidiIds.length > 0
        ? requestedMidiIds
        : storedMidi.length > 0
          ? storedMidi
          : allIds;
    this.lastAppliedInstrumentIds = [...this.selectedInstrumentIds];
    this.lastAppliedMidiInstrumentIds = [...this.selectedMidiInstrumentIds];
    this.showInstrumentSelection = false;
  }

  setInstrumentFilter(value: string) {
    this.instrumentFilter = value;
    this.emit();
  }

  toggleInstrument(id: string, checked: boolean) {
    if (isMobileView()) {
      if (!checked) return;
      this.selectedInstrumentIds = [id];
      this.emit();
      return;
    }
    const selected = new Set(this.selectedInstrumentIds);
    if (checked) selected.add(id);
    else selected.delete(id);
    this.selectedInstrumentIds = Array.from(selected);
    this.emit();
  }

  selectAllInstruments() {
    if (isMobileView() || this.availableInstruments.length === 0) return;
    this.selectedInstrumentIds = this.availableInstruments.map((i) => i.id);
    this.emit();
  }

  clearSelectedInstruments() {
    this.selectedInstrumentIds = [];
    this.emit();
  }

  toggleMidiInstrument(id: string, checked: boolean) {
    const selected = new Set(this.selectedMidiInstrumentIds);
    if (checked) selected.add(id);
    else selected.delete(id);
    this.selectedMidiInstrumentIds = Array.from(selected);
    this.emit();
  }

  selectAllMidiInstruments() {
    if (this.availableInstruments.length === 0) return;
    this.selectedMidiInstrumentIds = this.availableInstruments.map((i) => i.id);
    this.emit();
  }

  clearSelectedMidiInstruments() {
    this.selectedMidiInstrumentIds = [];
    this.emit();
  }

  restoreAppliedInstruments() {
    this.selectedInstrumentIds = [...this.lastAppliedInstrumentIds];
    this.selectedMidiInstrumentIds = [...this.lastAppliedMidiInstrumentIds];
    this.instrumentFilter = '';
    this.emit();
  }

  applySelectedInstruments() {
    if (!this.sourceXml || this.availableInstruments.length === 0) return;
    if (this.selectedInstrumentIds.length === 0 || this.selectedMidiInstrumentIds.length === 0) {
      this.options.onSnack?.('Selecione ao menos um instrumento na partitura e no MIDI.');
      return;
    }
    this.instrumentFilter = '';
    this.showInstrumentSelection = false;
    void this.applyInstrumentSelection(this.currentScoreId, this.loadToken);
  }

  openInstrumentSelection() {
    this.pause();
    this.instrumentFilter = '';
    this.showInstrumentSelection = true;
    this.instrumentCardCollapsed = false;
    this.emit();
  }

  cancelInstrumentSelection() {
    this.pause();
    this.selectedInstrumentIds = [...this.lastAppliedInstrumentIds];
    this.selectedMidiInstrumentIds = [...this.lastAppliedMidiInstrumentIds];
    this.instrumentFilter = '';
    this.showInstrumentSelection = false;
    this.emit();
  }

  setInstrumentCardCollapsed(collapsed: boolean) {
    this.instrumentCardCollapsed = collapsed;
    this.emit();
  }

  toggleInstrumentsMenu() {
    this.instrumentCardCollapsed = !this.instrumentCardCollapsed;
    this.emit();
  }

  /** XML filtrado por naipe: recorte local quando o XML completo já está na sessão; senão API. */
  private async resolveXmlForPartIds(songId: string, partIds: string[]): Promise<string> {
    const source = this.sourceXml;
    if (!source || partIds.length === 0) return source ?? '';
    const sourcePartIds = new Set(extractInstrumentsFromXml(source).map((item) => item.id));
    if (partIds.every((id) => sourcePartIds.has(id))) {
      return filterXmlByPartIds(source, partIds);
    }
    if (/^\d+$/.test(songId)) {
      try {
        const fromApi = await fetchFilteredXml(songId, partIds);
        if (fromApi.includes('<') && extractInstrumentsFromXml(fromApi).length > 0) {
          return sanitizeMusicXmlPartList(fromApi);
        }
      } catch {
        /* recorte no cliente */
      }
    }
    return filterXmlByPartIds(source, partIds);
  }

  private async applyInstrumentSelection(id: string, token: number) {
    if (!this.sourceXml || token !== this.loadToken) return;

    const available = this.availableInstruments;
    const selectedIds = this.selectedInstrumentIds;
    const midiSelectedIds = this.selectedMidiInstrumentIds;
    const scoreUnchanged =
      this.xmlLoaded && sameIdSet(selectedIds, this.lastAppliedInstrumentIds);
    const midiUnchanged =
      this.xmlLoaded && sameIdSet(midiSelectedIds, this.lastAppliedMidiInstrumentIds);

    const selectionKey = `${[...selectedIds].sort().join('|')}::midi:${[...midiSelectedIds]
      .sort()
      .join('|')}`;
    if (
      (scoreUnchanged && midiUnchanged && this.xmlLoaded) ||
      (selectionKey === this.lastRenderedSelectionKey && this.xmlLoaded)
    ) {
      this.loading = false;
      this.scoreLoading = false;
      this.emit();
      return;
    }

    this.loading = true;
    if (!scoreUnchanged) this.scoreLoading = true;
    if (!midiUnchanged) this.destroyPlayer();
    this.emit();

    try {
      if (/^\d+$/.test(id) && this.sourceXml) {
        const present = new Set(extractInstrumentsFromXml(this.sourceXml).map((item) => item.id));
        const needed = Array.from(new Set([...selectedIds, ...midiSelectedIds]));
        if (needed.some((partId) => !present.has(partId))) {
          try {
            const xml = await fetchFilteredXml(id, needed);
            if (token !== this.loadToken) return;
            this.sourceXml = mergeMusicXmlFetchedParts(this.sourceXml ?? '', xml);
            this.musicXmlCatalog = mergeMusicXmlFetchedParts(
              this.musicXmlCatalog ?? this.sourceXml ?? '',
              xml,
            );
          } catch {
            /* segue com o XML que já está carregado */
          }
        }
      }
      if (!this.sourceXml || token !== this.loadToken) return;

      const shouldFilter =
        available.length > 0 && selectedIds.length > 0 && selectedIds.length < available.length;
      const shouldFilterMidi =
        available.length > 0 &&
        midiSelectedIds.length > 0 &&
        midiSelectedIds.length < available.length;

      if (!scoreUnchanged) {
        const scoreXml = shouldFilter
          ? await this.resolveXmlForPartIds(id, selectedIds)
          : this.sourceXml;
        await this.renderScoreWithOsmd(sanitizeMusicXmlPartList(scoreXml), token);
        if (token !== this.loadToken) return;
      }

      if (!midiUnchanged) {
        const serverMidi = this.prefetchServerMidi(id, midiSelectedIds);
        const midiXml = shouldFilterMidi
          ? await this.resolveXmlForPartIds(id, midiSelectedIds)
          : this.sourceXml;
        await this.initVerovioPlayerInHiddenContainer(prepareMusicXmlForStudyPlayback(midiXml), id, token);
        await serverMidi;
        if (token !== this.loadToken) return;
        await this.syncServerMidiIntoPlayer(id, midiSelectedIds, token);
        if (token !== this.loadToken) return;
        this.scheduleMidiPrefetch();
        this.scheduleMidiWarmup();
      }

      this.lastRenderedSelectionKey = selectionKey;
      this.lastAppliedInstrumentIds = [...selectedIds];
      this.lastAppliedMidiInstrumentIds = [...midiSelectedIds];
      this.persistSelection(id, selectedIds, midiSelectedIds);
    } finally {
      if (token === this.loadToken) {
        this.loading = false;
        this.scoreLoading = false;
        this.emit();
      }
    }
  }

  private async renderScoreWithOsmd(xml: string, token: number) {
    if (token !== this.loadToken) return;
    this.scoreLoading = true;
    this.emit();
    try {
      try {
        this.osmd?.clear();
      } catch {
        /* ignore */
      }
      this.osmd = null;
      // Na primeira música o container ainda não existe: ele só monta quando a
      // página troca o catálogo pelo bloco da partitura. Por isso esperamos o
      // ref aparecer antes de ler, em vez de desistir na hora.
      const ready = await this.waitForOsmdContainer(token);
      if (token !== this.loadToken) return;
      const mount = this.options.getOsmdContainer();
      if (!ready || !mount) {
        this.scoreLoading = false;
        this.scoreError = failureMessage(undefined, 'Não foi possível montar a área da partitura.');
        this.emit();
        return;
      }
      this.clearOsmdInner(mount);
      const mobile = isMobileView();
      if (mobile) this.isMobile = true;
      this.osmd = new OpenSheetMusicDisplay(mount, {
        drawingParameters: 'default',
        autoResize: !mobile,
        followCursor: false,
        pageFormat: 'Endless',
        cursorsOptions: [{ type: 1, color: '#dc2626', alpha: 0.95, follow: false }],
      });
      await this.osmd.load(xml);
      if (mobile) this.applyMobileLayout();
      else this.fitScoreToViewport();
      await this.osmd.render();
      await this.shrinkPageToContainer();
      this.osmd.enableOrDisableCursors?.(true);
      this.applyOsmdCursorStyle();
      this.osmdPlaybackRenderer?.resetCursor();
      if (token === this.loadToken) {
        this.xmlLoaded = true;
        this.scoreLoading = false;
      }
    } catch (err) {
      console.error('Falha ao renderizar a partitura com o OSMD:', err);
      if (token === this.loadToken) {
        this.scoreLoading = false;
        this.scoreError = failureMessage(err, 'Falha ao renderizar a partitura.');
      }
    }
    this.emit();
  }

  /**
   * No celular a pauta precisa ocupar a largura da tela com zoom legível.
   * Encolher a página A4 inteira deixa os compassos pequenos demais.
   */
  private applyMobileLayout() {
    if (!this.osmd || !isMobileView()) return;
    const container = this.options.getScoreContainer() ?? this.options.getOsmdContainer();
    const available = Math.max(280, container?.clientWidth ?? window.innerWidth);
    const measures = this.currentMobileMeasures();
    this.applyFixedMeasureLayout(measures, available, mobileLayoutZoom(measures));
  }

  /** Desktop: mesma largura por compasso na linha (Endless, largura da área da partitura). */
  private applyDesktopLayout() {
    if (!this.osmd || isMobileView()) return;
    const container = this.options.getScoreContainer() ?? this.options.getOsmdContainer();
    const available = Math.max(480, container?.clientWidth ?? window.innerWidth);
    const measures = measuresPerDesktopLine(available);
    this.applyFixedMeasureLayout(measures, available, 1);
  }

  private applyFixedMeasureLayout(measuresPerLine: number, availableWidth: number, zoom: number) {
    if (!this.osmd) return;
    const rules = engravingRules(this.osmd);
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
    rules.FixedMeasureWidthFixedValue = Math.max(8, (innerWidth * 0.98) / measures);
    rules.VoiceSpacingMultiplierVexflow = 0.55;
    rules.NewSystemAtXMLNewSystemAttribute = false;
    rules.NewSystemAtXMLNewPageAttribute = false;
    rules.NewPageAtXMLNewPageAttribute = false;
    rules.StretchLastSystemLine = true;
    (this.osmd as { Zoom: number }).Zoom = zoom;
  }

  private currentMobileMeasures(): number {
    if (this.mobileMeasuresOverride != null) {
      return Math.min(MOBILE_MEASURES_MAX, Math.max(MOBILE_MEASURES_MIN, this.mobileMeasuresOverride));
    }
    const container = this.options.getScoreContainer() ?? this.options.getOsmdContainer();
    const available = Math.max(280, container?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 360));
    return measuresPerMobileLine(available);
  }

  private async rerenderMobileLayout() {
    if (!this.osmd || this.mobileLayoutRendering) return;
    this.mobileLayoutRendering = true;
    this.emit();
    try {
      this.applyMobileLayout();
      await this.osmd.render();
      await this.fitScoreWidthIfNeeded();
      this.osmd.enableOrDisableCursors?.(true);
      this.applyOsmdCursorStyle();
      this.osmdPlaybackRenderer?.onResize();
      if (this.isPlaying) this.syncPlaybackCursor();
    } catch (err) {
      console.error('Falha ao aplicar o zoom da partitura:', err);
    } finally {
      this.mobileLayoutRendering = false;
      this.emit();
    }
  }

  /** Ajusta regras de layout à largura da área da partitura (mobile ou desktop). */
  private fitScoreToViewport() {
    if (isMobileView()) this.applyMobileLayout();
    else this.applyDesktopLayout();
  }

  private async shrinkPageToContainer() {
    await this.fitScoreWidthIfNeeded();
  }

  /** Só encolhe se a SVG passar da largura útil. */
  private async fitScoreWidthIfNeeded() {
    if (!this.osmd) return;
    const mount = this.options.getOsmdContainer();
    const container = this.options.getScoreContainer() ?? mount;
    const svg = mount?.querySelector('svg');
    if (!container || !svg) return;
    const available = Math.max(240, container.clientWidth - 8);
    const rendered = svg.getBoundingClientRect().width;
    if (rendered <= available + 8 || rendered <= 0) return;

    const floorZoom = isMobileView()
      ? mobileLayoutZoom(this.currentMobileMeasures()) * 0.92
      : 0.55;
    const current = this.osmd.Zoom > 0 ? this.osmd.Zoom : 1;
    let next = current * (available / rendered);
    if (next >= floorZoom) {
      (this.osmd as { Zoom: number }).Zoom = next;
      await this.osmd.render();
      return;
    }

    const rules = engravingRules(this.osmd);
    const scale = Math.max(floorZoom, next) / current;
    rules.PageFormat.width = Math.max(28, rules.PageFormat.width * scale);
    (this.osmd as { Zoom: number }).Zoom = Math.max(floorZoom, next);
    await this.osmd.render();
  }

  private clearOsmdContainer() {
    this.stopCursorSync();
    this.lastCursorMeasure = -1;
    this.lastCursorBeat = -1;
    this.osmdPlaybackRenderer?.resetCursor();
    try {
      this.osmd?.clear();
    } catch {
      /* ignore */
    }
    this.osmd = null;
    const el = this.options.getOsmdContainer();
    if (el) el.innerHTML = '';
  }

  private clearOsmdInner(el: HTMLElement) {
    el.innerHTML = '';
  }

  private async waitNextFrame() {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }

  private async waitForOsmdContainer(token: number, maxTries = 30): Promise<boolean> {
    for (let i = 0; i < maxTries; i++) {
      if (token !== this.loadToken) return false;
      const el = this.options.getOsmdContainer();
      if (el?.isConnected) return true;
      await this.waitNextFrame();
    }
    return false;
  }

  private async initVerovioPlayerInHiddenContainer(xml: string, _scoreId: string, token: number) {
    if (token !== this.loadToken) return;
    this.playerReady = false;
    this.midiLoaded = false;
    this.playerError = null;
    this.midiOnlyMode = false;
    this.playerLoading = true;
    this.emit();
    this.destroyVerovioAndHiddenContainer();

    const tryCreate = async (): Promise<boolean> => {
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText =
        'position:fixed;left:-10000px;top:0;width:800px;height:600px;overflow:hidden;pointer-events:none;visibility:hidden';
      document.body.appendChild(el);
      if (token !== this.loadToken) return false;
      this.hiddenPlayerContainer = el;
      const converter = new VerovioConverter();
      if (!this.osmdPlaybackRenderer) {
        this.osmdPlaybackRenderer = new OsmdPlaybackRenderer(
          () => this.osmd,
          () => this.options.getScoreContainer(),
          () =>
            this.isPlaying &&
            (this.isMobile || (this.desktopAutoScroll && !this.isMobile)),
        );
      }
      const renderer = this.osmdPlaybackRenderer;
      try {
        this.player = await Player.create({
          container: el,
          musicXml: xml,
          converter,
          renderer,
          followCursor: false,
          velocity: this.tempo,
          repeat: this.loopEnabled ? -1 : 1,
        });
        return true;
      } catch (e) {
        this.destroyVerovioAndHiddenContainer();
        throw e;
      }
    };

    try {
      this.patchAudioWorklet();
      this.patchScrollIntoView();
      let ok = false;
      try {
        ok = await this.withoutVerovioFontNoise(tryCreate);
      } catch (firstErr) {
        console.warn('Study player init (1ª tentativa) falhou:', firstErr);
        if (token !== this.loadToken) return;
        await new Promise((r) => setTimeout(r, 800));
        if (token !== this.loadToken) return;
        ok = await this.withoutVerovioFontNoise(tryCreate);
      }
      if (!ok || token !== this.loadToken) {
        if (token === this.loadToken) this.destroyVerovioAndHiddenContainer();
        return;
      }
      this.playerController.player = this.player;
      this.playerReady = true;
      this.capturePlayerFallbackMidi();
      // midiLoaded só após syncServerMidiIntoPlayer (MIDI do worker é assíncrono no worklet).
      this.applyTempo();
      this.applyLoop();
      this.applyAudioVolume();
    } catch (err) {
      console.warn('Study player init failed:', err);
      this.destroyVerovioAndHiddenContainer();
      const xmlLen = xml.length;
      const isVeryLarge = xmlLen > 2_000_000;
      this.midiOnlyMode = isVeryLarge;
      this.playerReady = true;
      this.playerError = isVeryLarge
        ? null
        : failureMessage(undefined, 'Não foi possível preparar o áudio. Tente recarregar a partitura.');
    } finally {
      if (token === this.loadToken) {
        this.playerLoading = false;
        this.emit();
      }
    }
  }

  private destroyVerovioAndHiddenContainer() {
    try {
      const p = this.player as { pause?: () => void; stop?: () => void; destroy?: () => void; dispose?: () => void } | null;
      p?.pause?.();
      p?.stop?.();
      p?.destroy?.();
      p?.dispose?.();
      const ctx =
        (this.player as { audioContext?: AudioContext; _context?: AudioContext } | null)?.audioContext ||
        (this.player as { _context?: AudioContext } | null)?._context;
      if (ctx?.close && ctx.state !== 'closed') void ctx.close();
    } catch {
      /* ignore */
    }
    this.player = null;
    this.playerController.player = null;
    if (this.hiddenPlayerContainer?.parentNode) {
      this.hiddenPlayerContainer.parentNode.removeChild(this.hiddenPlayerContainer);
    }
    this.hiddenPlayerContainer = null;
  }

  private destroyPlayer() {
    this.destroyVerovioAndHiddenContainer();
    this.midiOnlyMode = false;
    this.isPlaying = false;
    this.playerReady = false;
    this.stopCursorSync();
    this.playerController.stopMetronome();
    this.stopLoopMonitor();
    this.midiLoaded = false;
    this.midiLoading = false;
    this.playerFallbackMidi = null;
    this.appliedServerMidiKey = null;
    this.auxiliaryVerovioConverter = null;
  }

  private getStudyPlayerInternals(): StudyPlayerInternals | null {
    return this.player as StudyPlayerInternals | null;
  }

  private async waitForSequencerMidiReady(timeoutMs = 15_000): Promise<number> {
    const seq = this.getStudyPlayerInternals()?._sequencer;
    if (!seq) return 0;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!seq.isLoading) {
        const dur = seq.duration ?? 0;
        if (dur > 0) return dur;
      }
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 25);
      });
    }
    return seq.duration ?? 0;
  }

  private syncPlayerDurationFromSequencer(): void {
    const player = this.getStudyPlayerInternals();
    const durSec = player?._sequencer?.duration ?? 0;
    if (player && durSec > 0) player._duration = durSec * 1000;
  }

  private capturePlayerFallbackMidi(): void {
    this.playerFallbackMidi = null;
    try {
      const midi = this.getStudyPlayerInternals()?.midi;
      if (midi && isValidStandardMidiBuffer(midi)) {
        this.playerFallbackMidi = midi.slice(0);
      }
    } catch {
      /* ignore */
    }
  }

  private sequencerHasAudibleMidi(): boolean {
    return (this.getStudyPlayerInternals()?._sequencer?.duration ?? 0) > 0;
  }

  private async resolvePreparedMidiXml(songId: string, partIds: string[]): Promise<string | null> {
    if (!this.sourceXml) return null;
    const available = this.availableInstruments;
    const shouldFilter =
      available.length > 0 && partIds.length > 0 && partIds.length < available.length;
    const xml = shouldFilter
      ? await this.resolveXmlForPartIds(songId, partIds)
      : this.sourceXml;
    return prepareMusicXmlForStudyPlayback(xml);
  }

  private async resolveClientMidiFromConverter(
    preparedXml: string,
    token: number,
  ): Promise<ArrayBuffer | null> {
    if (token !== this.loadToken) return null;
    const playerOptions = (this.player as { _options?: Record<string, unknown> })?._options;
    if (!playerOptions) return null;
    if (!this.auxiliaryVerovioConverter) {
      this.auxiliaryVerovioConverter = new VerovioConverter();
    }
    try {
      await this.withoutVerovioFontNoise(async () => {
        await this.auxiliaryVerovioConverter!.initialize(
          preparedXml,
          playerOptions as never,
        );
      });
      if (token !== this.loadToken) return null;
      const raw = this.auxiliaryVerovioConverter.midi;
      if (!raw || !isValidStandardMidiBuffer(raw)) return null;
      return prepareStudyMidiBuffer(raw, {
        percussionOnly: this.sourceXml
          ? selectionIsPercussionOnly(this.sourceXml, this.selectedMidiInstrumentIds)
          : false,
      });
    } catch {
      return null;
    }
  }

  private async resolvePlaybackMidiBuffer(
    songId: string,
    partIds: string[],
    serverMidi: ArrayBuffer | null,
    token: number,
  ): Promise<ArrayBuffer | null> {
    const xml = this.sourceXml;
    const includesPercussion = xml ? selectionIncludesPercussion(xml, partIds) : false;
    const tempo = xml ? extractTempoInfoFromXml(xml)?.bpm ?? 120 : 120;

    if (xml && includesPercussion) {
      const catalogXml = this.musicXmlCatalog ?? xml;
      const composed = await composeStudyPlaybackMidi({
        catalogXml,
        songId,
        partIds,
        tempoBpm: tempo,
        fetchPartMidi: async (sid, ids) => {
          const key = this.midiCacheKey(sid, ids);
          let buf = this.midiCache.get(key) ?? null;
          if (!buf) {
            buf = await fetchPartMidi(sid, ids);
            if (buf) this.midiCache.set(key, buf);
          }
          return buf;
        },
        resolvePartXml: async (ids) => {
          if (ids.length === partIds.length) {
            return (await this.resolvePreparedMidiXml(songId, partIds)) ?? '';
          }
          return this.resolveXmlForPartIds(songId, ids);
        },
      });
      if (token !== this.loadToken) return null;
      if (composed) {
        if (process.env.NODE_ENV === 'development') {
          (window as unknown as { __studyPlaybackMidiStats?: unknown }).__studyPlaybackMidiStats = {
            partIds,
            drumNoteOns: countDrumChannelNoteOns(composed),
            drumPitches: drumChannelPitchHistogram(composed),
            bytes: composed.byteLength,
            catalogHasUnpitched: (this.musicXmlCatalog ?? xml).includes('midi-unpitched'),
          };
        }
        return composed;
      }
      return null;
    }

    if (serverMidi) {
      return prepareStudyMidiBuffer(serverMidi, {
        percussionOnly: xml ? selectionIsPercussionOnly(xml, partIds) : false,
      });
    }
    if (this.playerFallbackMidi) {
      return prepareStudyMidiBuffer(this.playerFallbackMidi, { percussionOnly: false });
    }
    return null;
  }

  private configureSequencerForStudyPlayback(): void {
    const seq = this.getStudyPlayerInternals()?._sequencer as
      | { skipToFirstNoteOn?: boolean }
      | undefined;
    if (seq && 'skipToFirstNoteOn' in seq) {
      seq.skipToFirstNoteOn = false;
    }
  }

  /** Esconde só as queixas de fonte do Verovio, e só enquanto o toolkit é criado. */
  private async withoutVerovioFontNoise<T>(fn: () => Promise<T>): Promise<T> {
    const original = console.error;
    console.error = (...args: unknown[]) => {
      const text = typeof args[0] === 'string' ? args[0] : '';
      if (VEROVIO_FONT_NOISE.some((noise) => text.includes(noise))) return;
      original.apply(console, args);
    };
    try {
      return await fn();
    } finally {
      console.error = original;
    }
  }

  private patchAudioWorklet() {
    if (this.workletPatched || typeof window === 'undefined') return;
    const awProto = (window as unknown as { AudioWorklet?: { prototype: { addModule: typeof AudioWorklet.prototype.addModule } } }).AudioWorklet?.prototype;
    if (!awProto?.addModule) return;
    const original = awProto.addModule;
    awProto.addModule = function (this: AudioWorklet, moduleURL: string | URL, options?: unknown) {
      try {
        const url = typeof moduleURL === 'string' ? moduleURL : moduleURL?.toString?.();
        if (url && url.includes('spessasynth_processor.js')) {
          return original.call(this, '/spessasynth_processor.js', options as never);
        }
      } catch {
        /* fallback */
      }
      return original.call(this, moduleURL, options as never);
    };
    this.workletPatched = true;
  }

  private patchScrollIntoView() {
    if (this.scrollPatched || typeof window === 'undefined') return;
    const proto = (window as unknown as { Element?: { prototype: { scrollIntoView: Element['scrollIntoView'] } } }).Element?.prototype;
    if (!proto?.scrollIntoView) return;
    const original = proto.scrollIntoView;
    const shouldFollowScoreScroll = () => this.isMobile && this.isPlaying;
    proto.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      try {
        const el = this as HTMLElement;
        const container = el?.closest?.('.score-container') as HTMLElement | null;
        if (container) {
          // Durante o play no mobile o follow fica só no OsmdPlaybackRenderer (evita dois scrolls).
          if (shouldFollowScoreScroll()) return;
          return;
        }
        return original.call(this, arg as boolean | ScrollIntoViewOptions);
      } catch {
        return original.call(this, arg as boolean | ScrollIntoViewOptions);
      }
    };
    this.scrollPatched = true;
  }

  private updateBpmRange() {
    const base = Math.max(30, this.baseBpm);
    const min = Math.max(30, Math.round(base * 0.5));
    const max = Math.max(min + 10, Math.round(base * 2));
    this.bpmMin = min;
    this.bpmMax = max;
  }

  private applyTempo() {
    if (!this.player) return;
    const p = this.player as { velocity?: number };
    if ('velocity' in p) p.velocity = this.tempo;
    if (this.metronomeEnabled && this.isPlaying) this.restartMetronome();
  }

  private applyAudioVolume() {
    const synth = (this.player as { _synthesizer?: { setMasterParameter?: (k: string, v: number) => void } })?._synthesizer;
    if (synth?.setMasterParameter) {
      try {
        synth.setMasterParameter('masterGain', this.audioVolume);
      } catch {
        /* ignore */
      }
    }
  }

  private applyLoop() {
    if (!this.player) return;
    const p = this.player as { repeat?: number };
    if ('repeat' in p) p.repeat = this.loopEnabled ? -1 : 1;
    if (!this.loopEnabled) {
      this.loopStartTs = null;
      this.loopEndTs = null;
      return;
    }
    this.computeLoopTimestamps();
    if (this.isPlaying) {
      this.stopLoopMonitor();
      this.startLoopMonitor();
      if (this.metronomeEnabled) this.restartMetronome();
    }
  }

  private computeLoopTimestamps() {
    if (!this.player) return;
    const timemap = (this.player as { _options?: { converter?: { timemap?: Array<{ measure?: number; timestamp?: number; duration?: number }> } } })?._options?.converter?.timemap;
    if (!Array.isArray(timemap) || timemap.length === 0 || !this.loopStartMeasure || !this.loopEndMeasure) {
      this.loopStartTs = null;
      this.loopEndTs = null;
      return;
    }
    const startMeasure = this.loopStartMeasure - 1;
    const endMeasure = this.loopEndMeasure - 1;
    if (startMeasure < 0 || endMeasure < 0) {
      this.loopStartTs = null;
      this.loopEndTs = null;
      return;
    }
    const startEntry = timemap.find((t) => t.measure === startMeasure);
    const endEntry = timemap.find((t) => t.measure === endMeasure);
    this.loopStartTs = startEntry?.timestamp ?? null;
    const endStart = endEntry?.timestamp ?? null;
    const endDur = endEntry?.duration ?? 0;
    this.loopEndTs = endStart != null ? endStart + endDur : null;
  }

  private startLoopMonitor() {
    if (this.loopTimer || !this.loopEnabled || this.loopStartTs == null || this.loopEndTs == null) return;
    this.loopTimer = window.setInterval(() => {
      if (!this.player) return;
      const posMs = this.getPlayerPositionMs();
      if (posMs != null && this.loopEndTs != null && posMs >= this.loopEndTs) {
        const measureIndex = Math.max(0, (this.loopStartMeasure ?? 1) - 1);
        const startMs = this.loopStartTs ?? 0;
        const p = this.player as { moveTo?: (a: number, b: number, c: number) => void };
        p.moveTo?.(measureIndex, startMs, 0);
        if (this.metronomeEnabled) this.restartMetronome();
      }
    }, 120);
  }

  private stopLoopMonitor() {
    if (this.loopTimer) {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  private getPlayerPositionMs(): number | null {
    return getPlayerPositionMs(this.player);
  }

  private getMoveToFromMeasureBeat(measure: number, beatInMeasure: number): {
    measureIndex: number;
    measureStartMs: number;
    measureOffsetMs: number;
  } | null {
    const timemap = readPlayerTimemap(this.player);
    if (!timemap) return null;
    const measureIndex = Math.max(0, measure - 1);
    const entry =
      timemap.find((item) => item.measure === measureIndex) ?? timemap[measureIndex];
    if (!entry) return null;
    const measureStartMs = entry.timestamp ?? 0;
    let duration = entry.duration ?? 0;
    if (duration <= 0 && timemap[measureIndex + 1]) {
      duration = (timemap[measureIndex + 1].timestamp ?? 0) - measureStartMs;
    }
    const beats = Math.max(1, this.beatsPerMeasure);
    const beatDuration = duration > 0 ? duration / beats : 0;
    const measureOffsetMs = Math.min(duration, Math.max(0, beatInMeasure * beatDuration));
    return { measureIndex, measureStartMs, measureOffsetMs };
  }

  private applyOsmdCursorStyle() {
    if (!this.osmd) return;
    try {
      this.osmd.cursor.CursorOptions = {
        ...this.osmd.cursor.CursorOptions,
        type: 1,
        color: '#dc2626',
        alpha: 0.95,
        follow: false,
      };
      const cursorEl = this.osmd.cursor.cursorElement;
      if (cursorEl) cursorEl.style.zIndex = '30';
    } catch {
      /* ignore */
    }
  }

  /** Rótulo “Compasso X, tempo Y” (a linha visual vem do player → OsmdPlaybackRenderer.moveTo). */
  private syncPlaybackCursor() {
    const posMs = this.getPlayerPositionMs();
    const timemap = readPlayerTimemap(this.player);
    if (posMs == null || !timemap) return;
    const pos = getPlaybackPositionFromTimemap(timemap, posMs, this.beatsPerMeasure);
    if (!pos) return;

    this.lastCursorMeasure = pos.measure;
    this.lastCursorBeat = pos.beatInMeasure;
    this.playbackPosition = {
      measure: pos.measure,
      beat: pos.beat,
      timeSignature: this.timeSignature,
    };
    this.playbackCursorX = null;
    this.emit();
  }

  private startCursorSync() {
    if (this.cursorSyncTimer) return;
    this.cursorSyncTimer = window.setInterval(() => this.syncPlaybackCursor(), 50);
  }

  private stopCursorSyncTimer() {
    if (this.cursorSyncTimer) {
      window.clearInterval(this.cursorSyncTimer);
      this.cursorSyncTimer = null;
    }
  }

  private stopCursorSync() {
    this.stopCursorSyncTimer();
    this.playbackPosition = null;
    this.playbackCursorX = null;
    this.osmdPlaybackRenderer?.resetCursor();
    this.emit();
  }

  pause() {
    const p = this.player as { pause?: () => void } | null;
    p?.pause?.();
    this.isPlaying = false;
    this.stopLoopMonitor();
    this.stopCursorSyncTimer();
    this.playerController.stopMetronome();
    this.emit();
  }

  stop() {
    const p = this.player as { pause?: () => void; rewind?: () => void; moveTo?: (a: number, b: number, c: number) => void } | null;
    if (p) {
      p.pause?.();
      if (p.rewind) p.rewind();
      else p.moveTo?.(0, 0, 0);
    }
    this.isPlaying = false;
    this.stopLoopMonitor();
    this.stopCursorSync();
    this.lastCursorMeasure = -1;
    this.lastCursorBeat = -1;
    this.playerController.stopMetronome();
    this.emit();
  }

  async play() {
    if (this.isPlaying) return;
    const token = this.loadToken;
    await this.ensureStudyPlaybackMidi(token);
    await this.prepareMidiForPlayer(token);
    if (token !== this.loadToken || !this.midiLoaded) return;

    if (this.player) {
      const measure = this.lastCursorMeasure >= 1 ? this.lastCursorMeasure : 1;
      const beat = this.lastCursorBeat >= 0 ? this.lastCursorBeat : 0;
      const moveTo = this.getMoveToFromMeasureBeat(measure, beat);
      const pl = this.player as {
        moveTo?: (a: number, b: number, c: number) => void;
        play?: () => void;
        rewind?: () => void;
        duration?: number;
        position?: number;
        _context?: AudioContext;
      };
      this.configureSequencerForStudyPlayback();
      void pl._context?.resume();
      this.applyAudioVolume();
      this.isPlaying = true;
      if (moveTo && pl.moveTo) {
        pl.moveTo(moveTo.measureIndex, moveTo.measureStartMs, moveTo.measureOffsetMs);
      }
      pl.play?.();
      this.startLoopMonitor();
      this.startCursorSync();
      this.syncPlaybackCursor();
      if (this.metronomeEnabled) this.playerController.startMetronomeSync(this.bpm, this.beatsPerMeasure);
      this.emit();
      return;
    }

    if (this.midiOnlyMode) {
      this.options.onSnack?.(
        'Partituras grandes: use o download MIDI quando disponível.',
      );
      const midi = await this.getMidiBufferForCurrentScore();
      if (midi) this.triggerMidiDownload(midi);
    }
  }

  private triggerMidiDownload(midi: ArrayBuffer) {
    const blob = new Blob([midi], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partitura-${this.currentScoreId.replace(/^local:/, '')}.mid`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async prepareMidiForPlayer(token: number) {
    if (token !== this.loadToken) return;
    if (!this.playerReady) return;
    if (this.midiLoaded) return;
    this.midiLoading = true;
    this.playerError = null;
    this.emit();
    try {
      await this.loadMidiForCurrentScore(token);
      if (token !== this.loadToken) return;
      if (!this.midiLoaded) {
        this.playerError = failureMessage(undefined, 'MIDI não disponível para esta partitura.');
        if (!this.midiOnlyMode) this.playerReady = false;
      }
    } catch (caught) {
      if (token === this.loadToken) {
        this.playerError = failureMessage(caught, 'Player indisponível.');
        if (!this.midiOnlyMode) this.playerReady = false;
      }
    } finally {
      if (token === this.loadToken) {
        this.midiLoading = false;
        this.emit();
      }
    }
  }

  /** musicxml-player não expõe loadMIDI; o sequenciador SpessaSynth aceita o binário do worker. */
  private async applyMidiBufferToPlayer(midi: ArrayBuffer): Promise<boolean> {
    if (!isValidStandardMidiBuffer(midi)) return false;
    const p = this.getStudyPlayerInternals();
    const load = p?._sequencer?.loadNewSongList;
    if (!load) return false;
    const tempoBpm = this.sourceXml
      ? extractTempoInfoFromXml(this.sourceXml)?.bpm ?? 120
      : 120;
    const playbackBinary = shouldReencodeSmfForPlayback(midi)
      ? reencodeSmfForPlayback(midi, tempoBpm)
      : midi;
    load.call(p._sequencer, [{ binary: playbackBinary, fileName: 'study.mid' }]);
    this.configureSequencerForStudyPlayback();
    void p._context?.resume();
    const durSec = await this.waitForSequencerMidiReady();
    if (durSec <= 0) return false;
    this.syncPlayerDurationFromSequencer();
    p._sequencer?.pause?.();
    if (p._sequencer && 'currentTime' in p._sequencer) {
      p._sequencer.currentTime = 0;
    }
    p.rewind?.();
    return true;
  }

  /** Garante MIDI do servidor no sequenciador antes do play (loadNewSongList é assíncrono). */
  private async ensureStudyPlaybackMidi(token: number): Promise<void> {
    if (token !== this.loadToken || !this.player || !this.playerReady) return;
    if (!/^\d+$/.test(this.currentScoreId)) return;
    const partIds = this.selectedMidiInstrumentIds;
    if (partIds.length === 0) return;
    const key = this.midiCacheKey(this.currentScoreId, partIds);
    if (this.appliedServerMidiKey === key && this.sequencerHasAudibleMidi()) return;
    await this.syncServerMidiIntoPlayer(this.currentScoreId, partIds, token);
  }

  /** Substitui o MIDI do Verovio pelo gerado no servidor (inclui percussão). */
  private async syncServerMidiIntoPlayer(
    songId: string,
    partIds: string[],
    token: number,
  ): Promise<void> {
    if (!/^\d+$/.test(songId) || partIds.length === 0 || !this.player) {
      if (token === this.loadToken && this.playerReady && this.sequencerHasAudibleMidi()) {
        this.midiLoaded = true;
      }
      return;
    }
    const key = this.midiCacheKey(songId, partIds);
    let midi = this.midiCache.get(key) ?? null;
    if (!midi) {
      midi = await fetchPartMidi(songId, partIds);
      if (midi) this.midiCache.set(key, midi);
    }
    if (token !== this.loadToken) return;

    let applied = false;
    const playbackMidi = await this.resolvePlaybackMidiBuffer(songId, partIds, midi, token);
    if (token !== this.loadToken) return;
    if (playbackMidi && isValidStandardMidiBuffer(playbackMidi)) {
      applied = await this.applyMidiBufferToPlayer(playbackMidi);
      if (applied) this.appliedServerMidiKey = key;
    }
    if (!applied) {
      const durSec = await this.waitForSequencerMidiReady(3_000);
      applied = durSec > 0;
      if (!applied) {
        console.warn('Study: nenhum MIDI audível para percussão/instrumentos selecionados.');
      }
    }

    if (token === this.loadToken) {
      this.midiLoaded = applied;
      if (applied) {
        this.playerError = null;
        this.applyTempo();
        this.applyAudioVolume();
        this.applyLoop();
      } else {
        this.playerError = failureMessage(
          undefined,
          'Não foi possível carregar o áudio desta seleção de instrumentos.',
        );
      }
    }
  }

  private async loadMidiForCurrentScore(token: number) {
    if (token !== this.loadToken) return;
    if (/^\d+$/.test(this.currentScoreId)) {
      await this.syncServerMidiIntoPlayer(
        this.currentScoreId,
        this.selectedMidiInstrumentIds,
        token,
      );
      return;
    }
    this.midiLoaded = false;
    const midi = await this.getMidiBufferForCurrentScore();
    if (!midi || token !== this.loadToken) {
      if (token === this.loadToken && this.player) this.midiLoaded = true;
      return;
    }
    const applied = await this.applyMidiBufferToPlayer(midi);
    this.midiLoaded = applied;
  }

  private async getMidiBufferForCurrentScore(): Promise<ArrayBuffer | null> {
    if (this.currentScoreId.startsWith('local:')) {
      const cached = this.midiCache.get(this.currentScoreId);
      if (cached) return cached;
      const assetName = this.currentScoreId.replace('local:', '');
      const midiName = assetName.replace(/\.musicxml$/i, '.mid').replace(/\.xml$/i, '.mid');
      try {
        const res = await fetch(`/assets/${midiName}?v=${Date.now()}`);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        this.midiCache.set(this.currentScoreId, buf);
        return buf;
      } catch {
        return null;
      }
    }
    const key = this.midiCacheKey(this.currentScoreId, this.selectedMidiInstrumentIds);
    const cached = this.midiCache.get(key);
    if (cached) return cached;
    const midi = await this.tryGetMidi(this.currentScoreId);
    if (midi) this.midiCache.set(key, midi);
    return midi;
  }

  private midiCacheKey(id: string, partIds: string[]) {
    return `${id}::${[...partIds].sort().join('|')}`;
  }

  private prefetchServerMidi(id: string, partIds: string[]) {
    if (!/^\d+$/.test(id) || partIds.length === 0) return Promise.resolve();
    const key = this.midiCacheKey(id, partIds);
    if (this.midiCache.has(key)) return Promise.resolve();
    return fetchPartMidi(id, partIds)
      .then((midi) => {
        if (midi) this.midiCache.set(key, midi);
      })
      .catch(() => undefined);
  }

  private async tryGetMidi(id: string): Promise<ArrayBuffer | null> {
    if (!/^\d+$/.test(id)) return null;
    return fetchPartMidi(id, this.selectedMidiInstrumentIds);
  }

  private scheduleMidiPrefetch() {
    if (this.midiPrefetchScheduled || this.midiLoading || this.midiLoaded || this.isPlaying) return;
    this.midiPrefetchScheduled = true;
    const run = () => {
      this.midiPrefetchScheduled = false;
      void this.prefetchMidiForCurrentScore();
    };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof idle === 'function') idle(run, { timeout: 1500 });
    else window.setTimeout(run, 0);
  }

  private scheduleMidiWarmup() {
    if (
      this.midiWarmupScheduled ||
      !this.playerReady ||
      this.midiLoaded ||
      this.midiLoading ||
      this.isPlaying
    )
      return;
    this.midiWarmupScheduled = true;
    const token = this.loadToken;
    const run = () => {
      this.midiWarmupScheduled = false;
      void this.prepareMidiForPlayer(token);
    };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof idle === 'function') idle(run, { timeout: 3000 });
    else window.setTimeout(run, 500);
  }

  private async prefetchMidiForCurrentScore() {
    if (this.midiLoading || this.midiLoaded || this.isPlaying) return;
    await this.getMidiBufferForCurrentScore();
  }

  setTempo(value: number) {
    if (value == null || Number.isNaN(value)) return;
    this.bpm = value;
    this.tempo = this.bpm / this.baseBpm;
    this.applyTempo();
    this.emit();
  }

  setAudioVolume(value: number) {
    if (value == null || Number.isNaN(value)) return;
    this.audioVolume = Math.max(0, Math.min(1, value));
    this.applyAudioVolume();
    this.emit();
  }

  toggleMetronome() {
    this.metronomeEnabled = !this.metronomeEnabled;
    this.playerController.metronomeEnabled = this.metronomeEnabled;
    if (this.metronomeEnabled) {
      if (this.isPlaying) this.playerController.startMetronomeSync(this.bpm, this.beatsPerMeasure);
    } else {
      this.playerController.stopMetronome();
    }
    this.emit();
  }

  setMetronomeVolume(value: number) {
    if (value == null || Number.isNaN(value)) return;
    this.metronomeVolume = value;
    this.playerController.metronomeVolume = value;
    this.emit();
  }

  toggleLoop() {
    this.loopEnabled = !this.loopEnabled;
    this.applyLoop();
    if (this.loopEnabled && this.isPlaying) this.startLoopMonitor();
    else this.stopLoopMonitor();
    this.emit();
  }

  setLoopStartMeasure(v: number | null) {
    this.loopStartMeasure = v != null && Number.isFinite(v) ? v : null;
    this.applyLoop();
    this.emit();
  }

  setLoopEndMeasure(v: number | null) {
    this.loopEndMeasure = v != null && Number.isFinite(v) ? v : null;
    this.applyLoop();
    this.emit();
  }

  private restartMetronome() {
    if (!this.metronomeEnabled) return;
    this.playerController.stopMetronome();
    if (this.isPlaying) this.playerController.startMetronomeSync(this.bpm, this.beatsPerMeasure);
  }
}
