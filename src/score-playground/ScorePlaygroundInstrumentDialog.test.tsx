// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { InstrumentInfo } from '@/study/studyUtils';
import { ScorePlaygroundInstrumentDialog } from './ScorePlaygroundInstrumentDialog';

const instruments = [
  { id: 'P1', name: 'Clarinete em Bb 1', iconPath: 'icons/clarinete.png' },
  { id: 'P17', name: 'Bateria', iconPath: 'icons/bateria.png' },
] as InstrumentInfo[];

function renderDialog(overrides: Partial<Parameters<typeof ScorePlaygroundInstrumentDialog>[0]> = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(
    <ScorePlaygroundInstrumentDialog
      instruments={instruments}
      scoreInstrumentIds={['P1']}
      midiInstrumentIds={['P1']}
      singleScore={false}
      onApply={onApply}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onApply, onClose };
}

describe('ScorePlaygroundInstrumentDialog', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });
  afterEach(() => cleanup());

  it('aplica bateria só no áudio, mantendo a pauta escolhida', async () => {
    const user = userEvent.setup();
    const { onApply } = renderDialog();

    const apply = screen.getByRole('button', { name: 'Aplicar' }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);

    await user.click(screen.getByRole('checkbox', { name: 'Tocar Bateria no MIDI' }));
    expect(apply.disabled).toBe(false);
    await user.click(apply);

    expect(onApply).toHaveBeenCalledWith(['P1'], ['P1', 'P17']);
  });

  it('bloqueia aplicar quando nenhuma pauta fica visível', async () => {
    const user = userEvent.setup();
    const { onApply } = renderDialog();

    await user.click(screen.getByRole('checkbox', { name: 'Mostrar Clarinete em Bb 1 na partitura' }));

    expect(screen.getByRole('alert').textContent).toContain('Selecione ao menos uma pauta');
    expect((screen.getByRole('button', { name: 'Aplicar' }) as HTMLButtonElement).disabled).toBe(true);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('no celular troca a pauta única pelo rádio', async () => {
    const user = userEvent.setup();
    const { onApply } = renderDialog({ singleScore: true });

    await user.click(screen.getByRole('radio', { name: 'Mostrar Bateria na partitura' }));
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onApply).toHaveBeenCalledWith(['P17'], ['P1']);
  });

  it('cancelar fecha sem aplicar', async () => {
    const user = userEvent.setup();
    const { onApply, onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
