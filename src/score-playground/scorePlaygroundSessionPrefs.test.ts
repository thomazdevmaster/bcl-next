import { describe, expect, it } from 'vitest';
import {
  normalizePlaygroundSessionPrefs,
  playgroundSessionPrefsKey,
  readPlaygroundSessionPrefs,
  writePlaygroundSessionPrefs,
} from './scorePlaygroundSessionPrefs';

function memoryStore(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('normalizePlaygroundSessionPrefs', () => {
  it('aceita zoom, forma, metrônomo, volume e andamento válidos', () => {
    expect(
      normalizePlaygroundSessionPrefs({
        measuresPerLine: 3.2,
        displayMode: 'written',
        metronome: true,
        volume: 0.4,
        velocity: 1.25,
      }),
    ).toEqual({
      measuresPerLine: 3,
      displayMode: 'written',
      metronome: true,
      volume: 0.4,
      velocity: 1.25,
    });
  });

  it('descarta valores fora da faixa e tipos errados', () => {
    expect(
      normalizePlaygroundSessionPrefs({
        measuresPerLine: 20,
        displayMode: 'partitura',
        metronome: 'sim',
        volume: -1,
        velocity: 4,
      }),
    ).toEqual({
      volume: 0,
      velocity: 1.5,
    });
  });

  it('devolve vazio para JSON que não é objeto', () => {
    expect(normalizePlaygroundSessionPrefs(null)).toEqual({});
    expect(normalizePlaygroundSessionPrefs('desdobrada')).toEqual({});
  });
});

describe('read/write por música', () => {
  it('isola a preferência por conta e por música', () => {
    const storage = memoryStore();
    writePlaygroundSessionPrefs(storage, 'user-1', 'song-a', { volume: 0.2, metronome: true });
    writePlaygroundSessionPrefs(storage, 'user-1', 'song-b', { volume: 0.8 });
    writePlaygroundSessionPrefs(storage, 'user-2', 'song-a', { velocity: 0.5 });

    expect(readPlaygroundSessionPrefs(storage, 'user-1', 'song-a')).toEqual({
      volume: 0.2,
      metronome: true,
    });
    expect(readPlaygroundSessionPrefs(storage, 'user-1', 'song-b')).toEqual({ volume: 0.8 });
    expect(readPlaygroundSessionPrefs(storage, 'user-2', 'song-a')).toEqual({ velocity: 0.5 });
    expect(readPlaygroundSessionPrefs(storage, null, 'song-a')).toEqual({});
  });

  it('atualiza um campo sem apagar os outros da mesma música', () => {
    const storage = memoryStore();
    writePlaygroundSessionPrefs(storage, 'user-1', 'song-a', {
      displayMode: 'written',
      measuresPerLine: 4,
      volume: 0.7,
    });
    writePlaygroundSessionPrefs(storage, 'user-1', 'song-a', { metronome: true, volume: 0 });

    expect(readPlaygroundSessionPrefs(storage, 'user-1', 'song-a')).toEqual({
      displayMode: 'written',
      measuresPerLine: 4,
      volume: 0,
      metronome: true,
    });
  });

  it('guarda o volume de cada naipe e descarta valor inválido', () => {
    const storage = memoryStore();
    writePlaygroundSessionPrefs(storage, 'user-1', 'song-a', {
      volume: 0.5,
      partVolumes: { P1: 0.25, P2: -1, ruim: 'alto' as unknown as number },
    });
    writePlaygroundSessionPrefs(storage, 'user-1', 'song-a', { metronome: true });

    expect(readPlaygroundSessionPrefs(storage, 'user-1', 'song-a')).toEqual({
      volume: 0.5,
      metronome: true,
      partVolumes: { P1: 0.25, P2: 0 },
    });
  });

  it('ignora JSON corrompido', () => {
    const storage = memoryStore();
    storage.setItem(playgroundSessionPrefsKey('user-1', 'song-a'), '{');
    expect(readPlaygroundSessionPrefs(storage, 'user-1', 'song-a')).toEqual({});
  });
});
