interface PresentationTypesFeedbackProps {
  error: string | null;
  loading: boolean;
  empty: boolean;
  formOpen: boolean;
  onRetry: () => void;
}

export function PresentationTypesFeedback({
  error,
  loading,
  empty,
  formOpen,
  onRetry,
}: PresentationTypesFeedbackProps) {
  return (
    <>
      <TypesLoadError
        error={error && !formOpen ? error : null}
        onRetry={onRetry}
      />
      {loading ? <TypesLoading /> : null}
      {!loading && !error && empty ? <TypesEmpty /> : null}
    </>
  );
}

function TypesLoadError({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  if (!error) return null;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--destructive)]/40 bg-[var(--destructive)]/5 p-4 text-sm text-[var(--destructive)]"
      role="alert"
    >
      <span>{error}</span>
      <button
        type="button"
        className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-2"
        onClick={onRetry}
      >
        Tentar novamente
      </button>
    </div>
  );
}

function TypesLoading() {
  return (
    <p
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]"
      role="status"
    >
      Carregando tipos de evento…
    </p>
  );
}

function TypesEmpty() {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
      Nenhum tipo de evento está disponível.
    </p>
  );
}
