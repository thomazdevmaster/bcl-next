import type { WebMscoreModule } from './webmscoreTypes';

let loadPromise: Promise<WebMscoreModule> | null = null;

/** Após falha grave no worker WASM, força novo contexto na próxima abertura. */
export function resetWebMscoreModule(): void {
  loadPromise = null;
}

/** Carrega o WASM do MuseScore (webmscore) uma vez por sessão — só no browser. */
export function loadWebMscoreModule(): Promise<WebMscoreModule> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('webmscore exige o navegador'));
  }
  if (!loadPromise) {
    const url = `${window.location.origin}/vendor/webmscore/webmscore.mjs`;
    loadPromise = import(/* webpackIgnore: true */ url).then(async (mod: { default: WebMscoreModule }) => {
      const WebMscore = mod.default;
      await WebMscore.ready;
      return WebMscore;
    });
  }
  return loadPromise;
}
