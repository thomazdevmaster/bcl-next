import { describe, expect, it, vi } from 'vitest';
import {
  clampPlaygroundVolume,
  connectMasterGain,
  playgroundVolumeIcon,
  volumeAfterMuteToggle,
} from './playgroundVolume';

describe('clampPlaygroundVolume', () => {
  it('limita o volume entre silêncio e o máximo', () => {
    expect(clampPlaygroundVolume(1.4)).toBe(1);
    expect(clampPlaygroundVolume(-0.2)).toBe(0);
    expect(clampPlaygroundVolume(Number.NaN)).toBe(1);
  });
});

describe('playgroundVolumeIcon', () => {
  it('escolhe o ícone pelo nível', () => {
    expect(playgroundVolumeIcon(0)).toBe('volume_off');
    expect(playgroundVolumeIcon(0.4)).toBe('volume_down');
    expect(playgroundVolumeIcon(0.8)).toBe('volume_up');
  });
});

describe('volumeAfterMuteToggle', () => {
  it('silencia e restaura o volume anterior', () => {
    expect(volumeAfterMuteToggle(0.6, 1)).toEqual({ volume: 0, remembered: 0.6 });
    expect(volumeAfterMuteToggle(0, 0.6)).toEqual({ volume: 0.6, remembered: 0.6 });
  });

  it('volta ao máximo quando não há nível anterior', () => {
    expect(volumeAfterMuteToggle(0, 0)).toEqual({ volume: 1, remembered: 1 });
  });
});

describe('connectMasterGain', () => {
  it('coloca o ganho entre o sintetizador e a saída', () => {
    const gain = { gain: { value: 0 }, connect: vi.fn() };
    const synth = { disconnect: vi.fn(), connect: vi.fn() };
    const destination = {};
    const context = {
      createGain: () => gain,
      destination,
    };

    const attached = connectMasterGain(
      synth,
      context as unknown as AudioContext & { createGain: () => typeof gain },
      0.35,
    );

    expect(attached.gain.value).toBe(0.35);
    expect(synth.disconnect).toHaveBeenCalledOnce();
    expect(synth.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(destination);
  });
});
