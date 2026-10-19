const BARS = [
  { delay: '0ms', duration: '0.7s' },
  { delay: '0.15s', duration: '0.95s' },
  { delay: '0.28s', duration: '0.62s' },
  { delay: '0.08s', duration: '1.05s' },
  { delay: '0.2s', duration: '0.78s' },
];

export function MusicLoader({
  label = 'Carregando…',
  compact = false,
  className = '',
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`flex items-center justify-center ${compact ? 'inline-flex gap-2' : 'flex-col gap-3 py-8'} ${className}`}
    >
      <span className={`inline-flex items-end gap-1 ${compact ? 'h-5' : 'h-12'}`} aria-hidden>
        {!compact ? (
          <span className="music-loader__note material-icons text-3xl leading-none text-[var(--primary)]">music_note</span>
        ) : null}
        {BARS.map((bar, index) => (
          <span
            key={index}
            className={`music-loader__bar block rounded-full bg-[var(--primary)] ${compact ? 'w-1' : 'w-1.5'}`}
            style={{ animationDelay: bar.delay, animationDuration: bar.duration }}
          />
        ))}
      </span>
      {label ? (
        <span className={`text-[var(--muted)] ${compact ? 'text-sm' : 'text-sm font-medium'}`}>{label}</span>
      ) : (
        <span className="sr-only">Carregando…</span>
      )}
    </div>
  );
}
