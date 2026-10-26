"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { EntityDialog } from "@/components/shared/EntityDialog";
import { IconSelect } from "@/components/shared/IconSelect";
import {
  type ResponsiveTabOption,
  ResponsiveTabs,
} from "@/components/shared/ResponsiveTabs";
import { TableActionButton } from "@/components/tables/toolbar/TableActionButton";
import { TableSelectionToolbar } from "@/components/tables/toolbar/TableSelectionToolbar";
import {
  archiveNotification,
  bulkUpdateNotifications,
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
type NotificationSort = "recent" | "title";

const notificationSortOptions = [
  { value: "recent", label: "Mais recentes", icon: "schedule" },
  { value: "title", label: "Título A–Z", icon: "sort_by_alpha" },
] as const;

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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<NotificationItem | null>(
    null,
  );
  const [pendingBulkRemove, setPendingBulkRemove] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const [sort, setSort] = useState<NotificationSort>("recent");
  const wasOpenRef = useRef(false);
  const archiveCancelRef = useRef<HTMLButtonElement>(null);
  const inboxRef = useRef<HTMLElement>(null);
  const wasConfirmingArchiveRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(
    () => () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    },
    [],
  );

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
    setSelectedIds([]);
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

  const runBulkAction = async (action: "read" | "unread" | "remove") => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await bulkUpdateNotifications(selectedIds, action);
      const selected = new Set(selectedIds);
      if (action === "remove") {
        setItems((current) => current.filter((item) => !selected.has(item.id)));
      } else {
        const readAt = action === "read" ? new Date().toISOString() : null;
        setItems((current) =>
          current.map((item) =>
            selected.has(item.id) ? { ...item, readAt } : item,
          ),
        );
      }
      setSelectedIds([]);
      setPendingBulkRemove(false);
      try {
        await onUnreadCountRefresh();
      } catch {
        setError(
          "A ação foi aplicada, mas não foi possível atualizar o contador de notificações.",
        );
      }
    } catch {
      setError(
        "Não foi possível atualizar as notificações selecionadas. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const visibleItems = items
    .filter((item) => {
      if (filter === "unread") return !item.readAt;
      if (filter === "read") return Boolean(item.readAt);
      return true;
    })
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }) ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
        : Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id,
    );

  const toggleSelected = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const toggleAllVisible = () => {
    const visibleIds = visibleItems.map((item) => item.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  };

  return (
    <EntityDialog
      open={open}
      title={
        pendingBulkRemove
          ? "Remover notificações selecionadas?"
          : pendingArchive
            ? "Remover notificação?"
            : "Notificações"
      }
      description={
        pendingBulkRemove
          ? `Confirme se deseja remover ${selectedIds.length} notificações da sua caixa.`
          : pendingArchive
            ? "Confirme se deseja remover este aviso da sua caixa."
            : "Acompanhe os avisos importantes da sua conta."
      }
      size="xl"
      placement="mobile-full"
      confirmBeforeClose={false}
      onClose={() => {
        setPendingArchive(null);
        setPendingBulkRemove(false);
        onClose();
      }}
      onCloseComplete={() => returnFocusRef.current?.focus()}
    >
      {!pendingArchive ? (
        <ResponsiveTabs
          label="Filtrar notificações"
          options={notificationFilters}
          value={filter}
          onChange={(nextFilter) => {
            setFilter(nextFilter);
            setSelectedIds([]);
          }}
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
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2">
              <span className="text-sm text-[var(--muted)]">Ordenar por</span>
              <IconSelect
                label="Ordenar notificações"
                options={notificationSortOptions}
                value={sort}
                onChange={setSort}
                className="relative min-w-[10rem]"
              />
            </div>
            {selectedIds.length > 0 ? (
              <TableSelectionToolbar
                visible
                selectedCount={selectedIds.length}
                totalCount={visibleItems.length}
                allSelected={
                  visibleItems.length > 0 &&
                  visibleItems.every((item) => selectedIds.includes(item.id))
                }
                onToggleAll={toggleAllVisible}
                onDelete={() => setPendingBulkRemove(true)}
                deleteLabel="Remover"
                extraActions={
                  <div className="flex items-center gap-1">
                    <TableActionButton
                      ariaLabel="Marcar notificações selecionadas como lidas"
                      disabled={loading}
                      onClick={() => void runBulkAction("read")}
                    >
                      <span className="material-icons" aria-hidden="true">
                        mark_email_read
                      </span>
                    </TableActionButton>
                    <TableActionButton
                      ariaLabel="Marcar notificações selecionadas como não lidas"
                      disabled={loading}
                      onClick={() => void runBulkAction("unread")}
                    >
                      <span className="material-icons" aria-hidden="true">
                        mark_email_unread
                      </span>
                    </TableActionButton>
                  </div>
                }
              />
            ) : null}
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
                  const selected = selectedIds.includes(item.id);
                  const content = (
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="break-words font-semibold leading-5">
                        {item.title}
                      </span>
                      <span className="hidden text-sm leading-6 text-[var(--muted)] sm:block">
                        {item.body}
                      </span>
                      <time
                        className="text-xs tabular-nums text-[var(--muted)]"
                        dateTime={item.createdAt}
                        title={new Date(item.createdAt).toLocaleString("pt-BR")}
                      >
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.createdAt))}
                      </time>
                    </span>
                  );

                  return (
                    <li
                      key={item.id}
                      className={`rounded-xl border p-3 transition-colors duration-150 motion-reduce:transition-none sm:p-4 ${selected ? "border-[var(--primary)] bg-[var(--accent)]/55" : !item.readAt ? "border-[var(--primary)]/30 bg-[var(--accent)]/35" : "border-[var(--border)] bg-[var(--card)]"}`}
                      onPointerDown={(event) => {
                        longPressTriggeredRef.current = false;
                        if (event.pointerType !== "touch") return;
                        if (
                          event.target instanceof Element &&
                          event.target.closest("button, input, label")
                        )
                          return;
                        clearLongPress();
                        longPressTimerRef.current = setTimeout(() => {
                          longPressTriggeredRef.current = true;
                          setSelectedIds((current) =>
                            current.includes(item.id)
                              ? current
                              : [...current, item.id],
                          );
                        }, 550);
                      }}
                      onPointerUp={clearLongPress}
                      onPointerCancel={clearLongPress}
                      onPointerLeave={clearLongPress}
                      onContextMenu={(event) => event.preventDefault()}
                      onClick={(event) => {
                        if (longPressTriggeredRef.current) {
                          longPressTriggeredRef.current = false;
                          return;
                        }
                        if (selectedIds.length === 0) return;
                        if (
                          event.target instanceof Element &&
                          event.target.closest("button, input, label, a")
                        )
                          return;
                        toggleSelected(item.id);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <label
                          className={`${selectedIds.length > 0 ? "inline-flex" : "hidden sm:inline-flex"} min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center`}
                          aria-label={`Selecionar ${item.title}`}
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-[var(--primary)]"
                            checked={selected}
                            onChange={() => toggleSelected(item.id)}
                          />
                          <span className="sr-only">
                            Selecionar esta notificação
                          </span>
                        </label>
                        <div className="min-w-0 flex-1 sm:flex sm:items-start sm:gap-3">
                          {link ? (
                            <Link
                              href={link.href}
                              target={link.external ? "_blank" : undefined}
                              rel={
                                link.external
                                  ? "noopener noreferrer"
                                  : undefined
                              }
                              className="flex min-h-11 min-w-0 items-start gap-3 rounded-md text-left no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:flex-1"
                              onClick={(event) => {
                                if (longPressTriggeredRef.current) {
                                  longPressTriggeredRef.current = false;
                                  event.preventDefault();
                                  return;
                                }
                                if (selectedIds.length > 0) {
                                  event.preventDefault();
                                  toggleSelected(item.id);
                                  return;
                                }
                                void markRead(item);
                                onClose();
                              }}
                            >
                              {content}
                            </Link>
                          ) : (
                            <div className="flex min-w-0 items-start gap-3 sm:flex-1">
                              {content}
                            </div>
                          )}
                          <div className="mt-2 flex flex-row items-center gap-1 sm:mt-0 sm:shrink-0 sm:gap-2">
                            <button
                              type="button"
                              className="btn-outline-primary inline-flex min-h-11 min-w-11 cursor-pointer touch-manipulation select-none items-center justify-center gap-1 px-2 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed sm:min-w-0 sm:gap-1.5 sm:px-4 sm:text-sm motion-reduce:transition-none"
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
                              <span className="sr-only sm:not-sr-only">
                                {item.readAt
                                  ? "Marcar como não lida"
                                  : "Marcar como lida"}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="btn-danger inline-flex min-h-11 min-w-11 cursor-pointer touch-manipulation select-none items-center justify-center gap-1 px-2 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed sm:min-w-0 sm:gap-1.5 sm:px-4 sm:text-sm motion-reduce:transition-none"
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
                              <span className="sr-only sm:not-sr-only">
                                Remover
                              </span>
                            </button>
                          </div>
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
                    onClick={() => void loadMore()}
                  >
                    {loading ? "Carregando…" : "Carregar mais"}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </ResponsiveTabs>
      ) : null}
      {pendingArchive || pendingBulkRemove ? (
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
                {pendingBulkRemove
                  ? `${selectedIds.length} notificações selecionadas`
                  : pendingArchive?.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {pendingBulkRemove
                  ? "Os avisos selecionados serão removidos da sua caixa."
                  : "Este aviso será removido da sua caixa."}{" "}
                Você poderá consultá-los novamente no histórico de notificações
                da gestão.
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
              disabled={loading || updatingId !== null}
              onClick={() => {
                setPendingArchive(null);
                setPendingBulkRemove(false);
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-danger inline-flex min-h-11 cursor-pointer items-center justify-center"
              disabled={loading || updatingId !== null}
              onClick={() =>
                pendingBulkRemove
                  ? void runBulkAction("remove")
                  : pendingArchive
                    ? void archive(pendingArchive)
                    : undefined
              }
            >
              {loading || updatingId !== null ? "Removendo…" : "Sim, remover"}
            </button>
          </div>
        </section>
      ) : null}
    </EntityDialog>
  );
}
