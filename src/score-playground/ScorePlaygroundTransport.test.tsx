// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InstrumentInfo } from '@/study/studyUtils';
import {
  ScorePlaygroundTransport,
  type ScorePlaygroundTransportProps,
} from './ScorePlaygroundTransport';
import type { ScorePlaygroundViewState } from './useScorePlaygroundPlayer';

const readyState: ScorePlaygroundViewState = {
  phase: 'ready',
  songTitle: '505',
  error: null,
  playerReady: true,
  playing: false,
  positionMs: 65_000,
  durationMs: 200_000,
  velocity: 1,
  scoreLoading: false,
  zoom: {
    engine: 'webmscore',
    label: '2 comp./linha',
    canZoomIn: true,
    canZoomOut: true,
    measuresPerLine: 2,
  },
  instruments: [{ id: 'P1', name: 'Clarinete', iconPath: '', title: 'Clarinete' }] as InstrumentInfo[],
  scoreInstrumentIds: ['P1'],
  midiInstrumentIds: ['P1', 'P13'],
  volume: 0.8,
  partVolumeRows: [
    { id: 'P1', label: 'Clarinete', channel: 0, partIds: ['P1'] },
    { id: 'P13', label: 'Bateria', channel: 9, partIds: ['P13'] },
  ],
  partVolumes: { P1: 0.5 },
  metronomeEnabled: false,
  displayMode: 'unrolled',
  canToggleScoreForm: true,
};

function renderTransport(overrides: Partial<ScorePlaygroundTransportProps> = {}) {
  const props: ScorePlaygroundTransportProps = {
    state: readyState,
    mobile: true,
    onRewind: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onToggleMetronome: vi.fn(),
    onOpenInstruments: vi.fn(),
    onToggleMute: vi.fn(),
    onVolume: vi.fn(),
    onPartVolume: vi.fn(),
    onVelocity: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onToggleDisplayMode: vi.fn(),
    ...overrides,
  };
  render(<ScorePlaygroundTransport {...props} />);
  return props;
}

describe('ScorePlaygroundTransport no celular', () => {
  afterEach(() => cleanup());

  it('deixa no rodapé só início, tocar, tempo, zoom e o menu', () => {
    renderTransport();
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tocar' })).toBeTruthy();
    expect(screen.getByLabelText('1:05 de 3:20')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Diminuir zoom/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Aumentar zoom/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mais opções' }).getAttribute('aria-expanded')).toBe('false');

    expect(screen.queryByRole('button', { name: 'Metrônomo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Instrumentos' })).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Volume geral' })).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Andamento' })).toBeNull();
  });

  it('abre o menu com metrônomo, instrumentos, voltas, volumes e andamento', async () => {
    const user = userEvent.setup();
    const props = renderTransport();
    await user.click(screen.getByRole('button', { name: 'Mais opções' }));

    const menu = document.getElementById('playground-more-options');
    expect(menu).toBeTruthy();
    const scope = within(menu as HTMLElement);
    expect(screen.getByRole('button', { name: 'Fechar opções' }).getAttribute('aria-expanded')).toBe('true');
    expect(scope.getByRole('slider', { name: 'Volume geral' })).toBeTruthy();
    expect(scope.getByRole('slider', { name: 'Volume de Clarinete' })).toBeTruthy();
    expect(scope.getByRole('slider', { name: 'Volume de Bateria' })).toBeTruthy();
    expect(scope.getByRole('slider', { name: 'Andamento' })).toBeTruthy();

    await user.click(scope.getByRole('button', { name: 'Metrônomo' }));
    expect(props.onToggleMetronome).toHaveBeenCalledTimes(1);

    await user.click(scope.getByRole('button', { name: 'Desdobrada' }));
    expect(props.onToggleDisplayMode).toHaveBeenCalledTimes(1);

    await user.click(scope.getByRole('button', { name: 'Instrumentos' }));
    expect(props.onOpenInstruments).toHaveBeenCalledTimes(1);
    expect(document.getElementById('playground-more-options')).toBeNull();
  });

  it('esconde a troca de voltas quando a música não tem repetição', async () => {
    const user = userEvent.setup();
    renderTransport({ state: { ...readyState, canToggleScoreForm: false } });
    await user.click(screen.getByRole('button', { name: 'Mais opções' }));
    expect(screen.queryByRole('button', { name: 'Desdobrada' })).toBeNull();
  });

  it('aciona zoom e tocar pelo rodapé', async () => {
    const user = userEvent.setup();
    const props = renderTransport();
    await user.click(screen.getByRole('button', { name: /Aumentar zoom/ }));
    await user.click(screen.getByRole('button', { name: 'Tocar' }));
    expect(props.onZoomIn).toHaveBeenCalledTimes(1);
    expect(props.onPlay).toHaveBeenCalledTimes(1);
  });
});

describe('ScorePlaygroundTransport no desktop', () => {
  afterEach(() => cleanup());

  it('mantém metrônomo, instrumentos, volume e andamento à vista', async () => {
    const user = userEvent.setup();
    renderTransport({ mobile: false });
    expect(screen.queryByRole('button', { name: 'Mais opções' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ligar metrônomo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Alterar instrumentos' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Volume geral' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Andamento' })).toBeTruthy();
    expect(screen.getByText('1:05 / 3:20')).toBeTruthy();

    expect(screen.queryByRole('slider', { name: 'Volume de Clarinete' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Volume dos naipes' }));
    expect(screen.getByRole('slider', { name: 'Volume de Clarinete' })).toBeTruthy();
  });
});
