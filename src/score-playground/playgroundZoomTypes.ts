export type PlaygroundZoomState = {
  engine: 'webmscore' | 'osmd';
  label: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
};

export const MOBILE_MEASURES_MIN = 1;
export const MOBILE_MEASURES_MAX = 5;
export const DESKTOP_MEASURES_MIN = 2;
export const DESKTOP_MEASURES_MAX = 6;

export interface PlaygroundZoomable {
  getZoomState(): PlaygroundZoomState;
  zoomIn(): void;
  zoomOut(): void;
}

export function isPlaygroundZoomable(
  renderer: unknown,
): renderer is PlaygroundZoomable {
  if (!renderer || typeof renderer !== 'object') return false;
  const candidate = renderer as PlaygroundZoomable;
  return (
    typeof candidate.zoomIn === 'function' &&
    typeof candidate.zoomOut === 'function' &&
    typeof candidate.getZoomState === 'function'
  );
}
