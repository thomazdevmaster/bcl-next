import Image from "next/image";
import Link from "next/link";

import type { Presentation } from "@/domains/presentations/types";
import { formatPresentationWhen } from "@/lib/publicPortal";

import { CompactPresentationEventCard } from "./CompactPresentationEventCard";
import { PresentationTypeBadge } from "./PresentationTypeBadge";

interface PresentationEventCardProps {
  event: Presentation;
  compact?: boolean;
  layout?: "default" | "home";
}

export function PresentationEventCard({
  event,
  compact = false,
  layout = "default",
}: PresentationEventCardProps) {
  if (compact) {
    return <CompactPresentationEventCard event={event} layout={layout} />;
  }

  return <FullPresentationEventCard event={event} />;
}

function FullPresentationEventCard({ event }: { event: Presentation }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
      {event.coverUrl ? (
        <div className="relative h-44 w-full">
          <Image
            src={event.coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      ) : null}
      <div className="p-6">
        <p className="text-sm font-medium text-[var(--color-brand-strong)]">
          {formatPresentationWhen(event.startsAt)}
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          {event.title}
        </h2>
        <p className="mt-1 text-[var(--muted)]">{event.venue}</p>
        <PresentationTypeBadge eventType={event.eventType} />
        {event.description ? (
          <p className="mt-3 leading-relaxed text-[var(--foreground)]">
            {event.description}
          </p>
        ) : null}
        <Link
          href="/agenda"
          className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--color-brand-strong)] no-underline hover:underline"
        >
          Ver na agenda
          <span className="material-icons text-base" aria-hidden>
            arrow_forward
          </span>
        </Link>
      </div>
    </article>
  );
}
