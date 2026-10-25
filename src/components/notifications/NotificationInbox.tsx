"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import {
  getNotifications,
  markNotificationRead,
} from "@/domains/notifications/api";
import type {
  NotificationItem,
  NotificationPage,
} from "@/domains/notifications/types";

type Props = {
  open: boolean;
  mobile: boolean;
  onClose: () => void;
  onUnreadCountRefresh: () => Promise<void>;
  countError: string | null;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

function safeInternalPath(path: string | null): string | null {
  return path?.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(path)
    ? path
    : null;
}

export function NotificationInbox({
  open,
  mobile,
  onClose,
  onUnreadCountRefresh,
  countError,
  returnFocusRef,
}: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page: NotificationPage = await getNotifications();
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      await onUnreadCountRefresh();
    } catch {
      setError("Não foi possível carregar as notificações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountRefresh]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) returnFocusRef.current?.focus();
      wasOpenRef.current = false;
      return;
    }
    wasOpenRef.current = true;
    void loadFirst();
    closeButtonRef.current?.focus();
  }, [open, loadFirst, returnFocusRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sectionRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const loadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const page = await getNotifications(nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      setError("Não foi possível carregar mais notificações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (item: NotificationItem) => {
    if (item.readAt) return;
    try {
      await markNotificationRead(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, readAt: new Date().toISOString() }
            : entry,
        ),
      );
      await onUnreadCountRefresh();
    } catch {
      setError(
        "Não foi possível marcar a notificação como lida. Tente novamente.",
      );
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className={`fixed inset-x-0 bottom-0 z-[119] ${mobile ? "top-14 bg-black/40" : "top-0 bg-transparent"}`}
        aria-label="Fechar notificações"
        onClick={onClose}
      />
      <section
        id="notification-inbox"
        ref={sectionRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-inbox-title"
        className={
          mobile
            ? "fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] top-14 z-[120] flex max-h-[calc(100dvh-3.5rem)] flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)] shadow-2xl"
            : "fixed bottom-4 left-[calc(var(--content-margin)+1rem)] z-[120] flex max-h-[min(42rem,calc(100dvh-2rem))] w-[min(26rem,calc(100vw-var(--content-margin)-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        }
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <h2 id="notification-inbox-title" className="text-lg font-semibold">
              Notificações
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Avisos recentes da sua conta.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            aria-label="Fechar notificações"
            onClick={onClose}
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        {error ? (
          <p
            className="mx-4 mt-3 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {countError ? (
          <div
            className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
            role="alert"
          >
            <span>{countError}</span>
            <button
              type="button"
              className="min-h-11 rounded-md px-3 font-semibold underline"
              onClick={() => {
                void onUnreadCountRefresh();
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : null}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          aria-busy={loading}
        >
          {items.length === 0 && !loading && !error ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">
              Nenhuma notificação
            </p>
          ) : null}
          <ul className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const href = safeInternalPath(item.targetUrl);
              const content = (
                <>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-medium leading-5">{item.title}</span>
                    <span className="text-sm leading-5 text-[var(--muted)]">
                      {item.body}
                    </span>
                    <time
                      className="text-xs text-[var(--muted)]"
                      dateTime={item.createdAt}
                    >
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </time>
                  </span>
                  {!item.readAt ? (
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--primary)]"
                      aria-label="Não lida"
                    />
                  ) : null}
                </>
              );

              return (
                <li
                  key={item.id}
                  className={`px-4 py-3 ${!item.readAt ? "bg-[var(--accent)]/30" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {href ? (
                      <Link
                        href={href}
                        className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-md text-left no-underline hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        onClick={() => {
                          void markRead(item);
                          onClose();
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {content}
                      </div>
                    )}
                    {!item.readAt ? (
                      <button
                        type="button"
                        className="min-h-11 shrink-0 rounded-md px-2 text-xs font-medium text-[var(--primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                        aria-label={`Marcar como lida: ${item.title}`}
                        onClick={() => {
                          void markRead(item);
                        }}
                      >
                        Lida
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {loading && items.length === 0 ? (
            <p
              className="px-4 py-8 text-center text-sm text-[var(--muted)]"
              role="status"
            >
              Carregando notificações…
            </p>
          ) : null}
          {hasMore ? (
            <div className="p-4">
              <button
                type="button"
                className="min-h-11 w-full rounded-lg border border-[var(--border)] px-4 text-sm font-medium hover:bg-[var(--accent)] disabled:opacity-60"
                disabled={loading}
                onClick={() => {
                  void loadMore();
                }}
              >
                {loading ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
