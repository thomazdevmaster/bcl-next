interface PresentationTypeBadgeProps {
  eventType: { name: string; icon?: string | null } | null | undefined;
}

export function PresentationTypeBadge({
  eventType,
}: PresentationTypeBadgeProps) {
  if (!eventType) return null;

  return (
    <span className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-sm font-medium text-[var(--color-brand-strong)]">
      {eventType.icon ? (
        <span className="material-icons text-base" aria-hidden="true">
          {eventType.icon}
        </span>
      ) : null}
      {eventType.name}
    </span>
  );
}
