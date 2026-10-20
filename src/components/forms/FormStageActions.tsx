import type { ReactNode } from "react";

type Props = {
  active: number;
  total: number;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  continueLabel?: string;
  backLabel?: string;
  submitLabel?: string;
  pendingLabel?: string;
  pendingContent?: ReactNode;
  submitDisabled?: boolean;
  desktop?: boolean;
  centered?: boolean;
  fullWidth?: boolean;
};

const buttonMotion =
  "transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

export function FormStageActions({
  active,
  total,
  busy,
  onBack,
  onNext,
  onSubmit,
  continueLabel = "Continuar",
  backLabel = "Voltar",
  submitLabel = "Enviar",
  pendingLabel = "Enviando…",
  pendingContent,
  submitDisabled = false,
  desktop = false,
  centered = false,
  fullWidth = false,
}: Props) {
  const alignmentClass = fullWidth ? "w-full pt-3" : centered ? "mx-auto w-fit justify-center" : desktop ? "justify-end border-t border-[var(--border)] pt-5" : "pt-3";
  const buttonWidthClass = fullWidth ? "w-full" : centered ? "flex-none" : "flex-1 sm:flex-none";

  return (
    <div className={`flex gap-3 ${alignmentClass}`}>
      {active > 0 ? (
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex min-h-12 ${buttonWidthClass} items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${buttonMotion}`}
        >
          {backLabel}
        </button>
      ) : null}
      {active < total - 1 ? (
        <button
          type="button"
          onClick={onNext}
          className={`btn-primary inline-flex min-h-12 ${buttonWidthClass} items-center justify-center rounded-xl px-5 text-sm font-semibold ${buttonMotion}`}
        >
          {continueLabel}
        </button>
      ) : (
        <button
          type={onSubmit ? "button" : "submit"}
          onClick={onSubmit}
          disabled={busy || submitDisabled}
          className={`btn-primary inline-flex min-h-12 ${buttonWidthClass} items-center justify-center rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${buttonMotion}`}
        >
          {busy ? pendingContent ?? pendingLabel : submitLabel}
        </button>
      )}
    </div>
  );
}
