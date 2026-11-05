/** Subconjunto dos tipos do webmscore usado pelo playground. */

export interface WebMscorePositionElement {
  id: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  page: number;
}

export interface WebMscorePositions {
  elements: WebMscorePositionElement[];
  pageSize: { width: number; height: number };
}

export interface WebMscoreInstance {
  npages(): Promise<number>;
  saveSvg(pageNumber?: number, drawPageBackground?: boolean): Promise<string>;
  measurePositions(): Promise<WebMscorePositions>;
  segmentPositions(): Promise<WebMscorePositions>;
  destroy(soft?: boolean): void | Promise<void>;
}

export interface WebMscoreModule {
  ready: Promise<void>;
  load(
    format: 'musicxml' | 'mxl' | 'mscz' | 'midi',
    data: Uint8Array,
    fonts?: Uint8Array[] | Promise<Uint8Array[]>,
    doLayout?: boolean,
  ): Promise<WebMscoreInstance>;
}
