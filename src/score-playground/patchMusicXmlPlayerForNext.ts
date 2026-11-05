let workletPatched = false;

/** Mesmo ajuste do modo estudo: worklet do SpessaSynth em `/spessasynth_processor.js`. */
export function patchMusicXmlPlayerAudioWorklet(): void {
  if (workletPatched || typeof window === 'undefined') return;
  const awProto = (
    window as unknown as {
      AudioWorklet?: { prototype: { addModule: typeof AudioWorklet.prototype.addModule } };
    }
  ).AudioWorklet?.prototype;
  if (!awProto?.addModule) return;
  const original = awProto.addModule;
  awProto.addModule = function (
    this: AudioWorklet,
    moduleURL: string | URL,
    options?: unknown,
  ) {
    try {
      const url = typeof moduleURL === 'string' ? moduleURL : moduleURL?.toString?.();
      if (url && url.includes('spessasynth_processor.js')) {
        return original.call(this, '/spessasynth_processor.js', options as never);
      }
    } catch {
      /* mantém URL original */
    }
    return original.call(this, moduleURL, options as never);
  };
  workletPatched = true;
}
