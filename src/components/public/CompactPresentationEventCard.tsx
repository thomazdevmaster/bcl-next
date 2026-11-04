import Image from "next/image";

import type { Presentation } from "@/domains/presentations/types";
import { formatPresentationWhen } from "@/lib/publicPortal";

interface CompactPresentationEventCardProps {
  event: Presentation;
  layout: "default" | "home";
}

export function CompactPresentationEventCard({
  event,
  layout,
}: CompactPresentationEventCardProps) {
  const homeLayout = layout === "home";
  const imageLayout = homeLayout
    ? "col-start-2 row-start-1 h-full min-h-[138px] w-full rounded-none"
    : "h-20 w-20 rounded-xl";
  const imageSize = homeLayout ? "text-4xl" : "text-3xl";

  return (
    <article
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] ${homeLayout ? "grid min-h-[138px] grid-cols-[minmax(0,1fr)_108px] gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(104px,32%)]" : "flex gap-4 p-4"}`}
    >
      {event.coverUrl ? (
        <div className={`relative shrink-0 overflow-hidden ${imageLayout}`}>
          <Image
            src={event.coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
      ) : (
        <div
          className={`flex shrink-0 items-center justify-center bg-[var(--accent)] text-[var(--color-brand-strong)] ${imageLayout}`}
          aria-hidden
        >
          <span className={`material-icons ${imageSize}`}>event</span>
        </div>
      )}
      <div
        className={`min-w-0 ${homeLayout ? "col-start-1 row-start-1 self-center p-4" : "flex-1"}`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand-strong)]">
          {formatPresentationWhen(event.startsAt)}
        </p>
        <h3 className="mt-1 text-lg font-semibold leading-snug text-[var(--foreground)]">
          {event.title}
        </h3>
        <p className="mt-1 truncate text-sm text-[var(--muted)]">
          {event.venue}
        </p>
      </div>
    </article>
  );
}
