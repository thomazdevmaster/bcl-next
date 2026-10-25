"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { EntityDialog } from "@/components/shared/EntityDialog";
import {
  type ResponsiveTabOption,
  ResponsiveTabs,
} from "@/components/shared/ResponsiveTabs";
import {
  archiveNotification,
  getNotifications,
  markNotificationRead,
  markNotificationUnread,
} from "@/domains/notifications/api";
import { getNotificationLink } from "@/domains/notifications/links";
import type {
  NotificationItem,
  NotificationPage,
} from "@/domains/notifications/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onUnreadCountRefresh: () => Promise<void>;
  countError: string | null;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

type NotificationFilter = "unread" | "read" | "all";

const notificationFilters: ResponsiveTabOption<NotificationFilter>[] = [
  {
    value: "unread",
    label: "Não lidas",
    icon: "mark_email_unread",
    tabId: "notification-filter-unread",
    panelId: "notification-inbox",
  },
  {
    value: "read",
    label: "Lidas",
    icon: "drafts",
    tabId: "notification-filter-read",
    panelId: "notification-inbox",
  },
  {
    value: "all",
    label: "Todas",
    icon: "notifications",
    tabId: "notification-filter-all",
    panelId: "notification-inbox",
  },
];

export function NotificationInbox({
  open,
  onClose,
  onUnreadCountRefresh,
  countError,
  returnFocusRef,
}: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<NotificationItem | null>(
    null,
  );
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const wasOpenRef = useRef(false);
  const archiveCancelRef = useRef<HTMLButtonElement>(null);
  const inboxRef = useRef<HTMLElement>(null);
  const wasConfirmingArchiveRef = useRef(false);

  useEffect(() => {
    if (pendingArchive) {
      wasConfirmingArchiveRef.current = true;
      archiveCancelRef.current?.focus();
    } else if (wasConfirmingArchiveRef.current && open) {
      wasConfirmingArchiveRef.current = false;
      inboxRef.current?.focus();
    }
  }, [open, pendingArchive]);

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
    const frame = window.requestAnimationFrame(() => {
      void loadFirst();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, loadFirst, returnFocusRef]);

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
    if (item.readAt || updatingId === item.id) return;
    setUpdatingId(item.id);
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
    } finally {
      setUpdatingId(null);
    }
  };

  const markUnread = async (item: NotificationItem) => {
    if (!item.readAt || updatingId === item.id) return;
    setUpdatingId(item.id);
    try {
      await markNotificationUnread(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: null } : entry,
        ),
      );
      await onUnreadCountRefresh();
    } catch {
      setError(
        "Não foi possível marcar a notificação como não lida. Tente novamente.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const archive = async (item: NotificationItem) => {
    if (updatingId === item.id) return;
    setUpdatingId(item.id);
    try {
      await archiveNotification(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setPendingArchive(null);
      await onUnreadCountRefresh();
    } catch {
      setError(
        "Não foi possível remover a notificação da caixa. Tente novamente.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleItems = items.filter((item) => {
    if (filter === "unread") return !item.readAt;
    if (filter === "read") return Boolean(item.readAt);
    return true;
  });

  return (
    <EntityDialog
      open={open}
      title={pendingArchive ? "Remover notificação?" : "Notificações"}
      description={
        pendingArchive
          ? "Confirme se deseja remover este aviso da sua caixa."
          : "Acompanhe os avisos importantes da sua conta."
      }
      size="xl"
      placement="mobile-full"
      confirmBeforeClose={false}
      onClose={() => {
        setPendingArchive(null);
        onClose();
      }}
      onCloseComplete={() => returnFocusRef.current?.focus()}
    >
      {!pendingArchive ? (
        <ResponsiveTabs
          label="Filtrar notificações"
          options={notificationFilters}
          value={filter}
          onChange={setFilter}
          variant="embedded"
        >
          <section
            ref={inboxRef}
            id="notification-inbox"
            aria-label="Lista de notificações"
            role="tabpanel"
            aria-labelledby={`notification-filter-${filter}`}
            tabIndex={-1}
            className="flex min-h-0 flex-1 flex-col"
          >
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
              {visibleItems.length === 0 && !loading && !error ? (
                <div className="mx-4 my-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-5 py-10 text-center">
                  <span
                    className="material-icons rounded-full bg-[var(--accent)] p-3 text-2xl text-[var(--muted)]"
                    aria-hidden="true"
                  >
                    notifications_none
                  </span>
                  <p className="font-semibold">
                    {filter === "unread"
                      ? "Nenhuma notificação não lida"
                      : filter === "read"
                        ? "Nenhuma notificação lida"
                        : "Sua caixa está em dia"}
                  </p>
                  <p className="max-w-sm text-sm leading-5 text-[var(--muted)]">
                    {hasMore
                      ? "Carregue mais para buscar outras notificações."
                      : "Quando chegar um novo aviso, ele aparecerá aqui."}
                  </p>
                </div>
              ) : null}
              <ul className="space-y-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
                {visibleItems.map((item) => {
                  const link = getNotificationLink(item.targetUrl);
                  const content = (
                    <>
                      <span className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold leading-5">
                            {item.title}
                          </span>
                          {!item.readAt ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
                                aria-hidden="true"
                              />
                              Nova
                            </span>
                          ) : null}
                        </span>
                        <span className="text-sm leading-6 text-[var(--muted)]">
                          {item.body}
                        </span>
                        <time
                          className="text-xs tabular-nums text-[var(--muted)]"
                          dateTime={item.createdAt}
                          title={new Date(item.createdAt).toLocaleString(
                            "pt-BR",
                          )}
                        >
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(item.createdAt))}
                        </time>
                      </span>
                    </>
                  );

                  return (
                    <li
                      key={item.id}
                      className={`rounded-xl border p-3 transition-colors duration-150 motion-reduce:transition-none sm:p-4 ${!item.readAt ? "border-[var(--primary)]/30 bg-[var(--accent)]/35" : "border-[var(--border)] bg-[var(--card)]"}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                        {link ? (
                          <Link
                            href={link.href}
                            target={link.external ? "_blank" : undefined}
                            rel={
                              link.external ? "noopener noreferrer" : undefined
                            }
                            className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-md text-left no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
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
                        <div className="flex shrink-0 flex-row items-center justify-end gap-2 sm:ml-2">
                          <button
                            type="button"
                            className="btn-outline-primary inline-flex min-h-11 min-w-0 flex-1 cursor-pointer touch-manipulation select-none items-center justify-center gap-1 px-2 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed sm:flex-initial sm:gap-1.5 sm:px-4 sm:text-sm motion-reduce:transition-none"
                            aria-label={`${item.readAt ? "Marcar como não lida" : "Marcar como lida"}: ${item.title}`}
                            disabled={updatingId === item.id}
                            onClick={() => {
                              void (item.readAt
                                ? markUnread(item)
                                : markRead(item));
                            }}
                          >
                            <span
                              className="material-icons text-sm"
                              aria-hidden="true"
                            >
                              {item.readAt ? "mark_email_unread" : "done"}
                            </span>
                            <span className="sm:hidden">
                              {item.readAt ? "Marcar não lida" : "Marcar lida"}
                            </span>
                            <span className="hidden sm:inline">
                              {item.readAt
                                ? "Marcar como não lida"
                                : "Marcar como lida"}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="btn-danger inline-flex min-h-11 min-w-0 flex-1 cursor-pointer touch-manipulation select-none items-center justify-center gap-1 px-2 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed sm:flex-initial sm:gap-1.5 sm:px-4 sm:text-sm motion-reduce:transition-none"
                            aria-label={`Remover da caixa: ${item.title}`}
                            disabled={updatingId === item.id}
                            onClick={() => {
                              setError(null);
                              setPendingArchive(item);
                            }}
                          >
                            <span
                              className="material-icons text-sm"
                              aria-hidden="true"
                            >
                              delete_outline
                            </span>
                            Remover
                          </button>
                        </div>
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
        </ResponsiveTabs>
      ) : null}
      {pendingArchive ? (
        <section className="flex min-h-0 flex-1 flex-col justify-between gap-6 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              className="material-icons rounded-full bg-[var(--destructive)]/10 p-2 text-xl text-[var(--destructive)]"
              aria-hidden="true"
            >
              delete_outline
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-[var(--foreground)]">
                {pendingArchive.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Este aviso será removido da sua caixa. Você poderá consultá-lo
                novamente no histórico de notificações da gestão.
              </p>
            </div>
          </div>
          {error ? (
            <p
              className="rounded-lg bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              ref={archiveCancelRef}
              type="button"
              className="btn-outline-secondary inline-flex min-h-11 cursor-pointer items-center justify-center"
              disabled={updatingId === pendingArchive.id}
              onClick={() => setPendingArchive(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-danger inline-flex min-h-11 cursor-pointer items-center justify-center"
              disabled={updatingId === pendingArchive.id}
              onClick={() => void archive(pendingArchive)}
            >
              {updatingId === pendingArchive.id ? "Removendo…" : "Sim, remover"}
            </button>
          </div>
        </section>
      ) : null}
    </EntityDialog>
  );
}
