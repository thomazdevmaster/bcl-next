"use client";

import type { Ref } from "react";

type Props = {
  count: number;
  expanded: boolean;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
};

function formatCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function NotificationBell({ count, expanded, onClick, buttonRef }: Props) {
  const label = count === 1 ? "1 notificação não lida" : `${count} notificações não lidas`;

  return (
    <button
      ref={buttonRef}
      type="button"
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      aria-label={`Notificações, ${label}`}
      aria-expanded={expanded}
      aria-controls="notification-inbox"
      onClick={onClick}
    >
      <span className="material-icons text-[24px]" aria-hidden="true">
        notifications
      </span>
      {count > 0 ? (
        <span
          className="absolute right-0 top-0 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--header-bg)] bg-[var(--destructive)] px-1 text-[10px] font-bold leading-none text-white"
          aria-hidden="true"
        >
          {formatCount(count)}
        </span>
      ) : null}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {label}
      </span>
    </button>
  );
}
