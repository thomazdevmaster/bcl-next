"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  getNotificationCenter,
  getNotificationReadReceipts,
  markNotificationRead,
  notifyUnreadCountChanged,
  restoreNotification,
} from "@/domains/notifications/api";
import { getNotificationLink } from "@/domains/notifications/links";
import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationItem,
  type NotificationPage,
  type NotificationReadReceipt,
} from "@/domains/notifications/types";
import { failureMessage } from "@/lib/userMessages";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}

export function NotificationCenter() {
  const auth = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<
    Record<number, NotificationReadReceipt[]>
  >({});
  const [openReceipts, setOpenReceipts] = useState<number[]>([]);
  const [loadingReceiptsId, setLoadingReceiptsId] = useState<number | null>(
    null,
  );
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [openMessages, setOpenMessages] = useState<number[]>([]);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page: NotificationPage = await getNotificationCenter();
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(failureMessage(caught, "Não foi possível carregar a central."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadFirst();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadFirst]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getNotificationCenter(nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(
        failureMessage(caught, "Não foi possível carregar mais notificações."),
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const loadReceipts = async (item: NotificationItem) => {
    const isOpen = openReceipts.includes(item.id);
    if (isOpen) {
      setOpenReceipts((current) => current.filter((id) => id !== item.id));
      return;
    }
    setOpenReceipts((current) => [...current, item.id]);
    if (receiptItems[item.id]) return;

    setLoadingReceiptsId(item.id);
    setReceiptError(null);
    try {
      const receipts = await getNotificationReadReceipts(item.id);
      setReceiptItems((current) => ({ ...current, [item.id]: receipts }));
    } catch (caught) {
      setOpenReceipts((current) => current.filter((id) => id !== item.id));
      setReceiptError(
        failureMessage(
          caught,
          "Não foi possível carregar as confirmações de leitura.",
        ),
      );
    } finally {
      setLoadingReceiptsId(null);
    }
  };

  const toggleMessage = async (item: NotificationItem) => {
    const isOpen = openMessages.includes(item.id);
    setOpenMessages((current) =>
      isOpen ? current.filter((id) => id !== item.id) : [...current, item.id],
    );
    if (isOpen || item.readAt) return;

    try {
      await markNotificationRead(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, readAt: new Date().toISOString() }
            : entry,
        ),
      );
      notifyUnreadCountChanged();
    } catch (caught) {
      setError(
        failureMessage(
          caught,
          "Não foi possível marcar a notificação como lida.",
        ),
      );
    }
  };

  const restoreFromInbox = async (item: NotificationItem) => {
    try {
      await restoreNotification(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, archived: false } : entry,
        ),
      );
      notifyUnreadCountChanged();
    } catch (caught) {
      setError(
        failureMessage(
          caught,
          "Não foi possível restaurar a notificação na caixa.",
        ),
      );
    }
  };

  const currentUserId = auth.user ? Number(auth.user.id) : null;

  return (
    <section aria-labelledby="notification-center-title">
      <header className="mb-5">
        <h1 id="notification-center-title" className="text-xl font-semibold">
          Central de notificações
        </h1>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Consulte e releia as notificações disponíveis para sua conta,
          incluindo as removidas da caixa principal.
        </p>
      </header>

      {error ? (
        <div
          className="mb-4 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 min-h-11 font-semibold underline"
            onClick={() => void loadFirst()}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {receiptError ? (
        <p
          className="mb-4 rounded-lg bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
          role="alert"
        >
          {receiptError}
        </p>
      ) : null}

      {loading ? (
        <p
          className="py-8 text-center text-sm text-[var(--muted)]"
          role="status"
        >
          Carregando central…
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
          Nenhuma notificação no histórico.
        </p>
      ) : null}

      <ul className="space-y-3" aria-busy={loading || loadingMore}>
        {items.map((item) => {
          const ownManualMessage =
            item.type === "admin_message" && item.actorUserId === currentUserId;
          const receipts = receiptItems[item.id];
          const readCount =
            receipts?.filter((receipt) => receipt.readAt !== null).length ?? 0;
          const targetLink = getNotificationLink(item.targetUrl);

          return (
            <li
              key={item.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-medium">
                  {item.readAt ? "Lida" : "Não lida"}
                </span>
                {item.archived ? (
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
                    Removida da caixa
                  </span>
                ) : null}
                <span className="text-xs text-[var(--muted)]">
                  {NOTIFICATION_TYPE_LABELS[item.type]}
                </span>
              </div>
              <h2 className="mt-3 text-base font-semibold">{item.title}</h2>
              {openMessages.includes(item.id) ? (
                <>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted)]">
                    {item.body}
                  </p>
                  {targetLink ? (
                    <Link
                      href={targetLink.href}
                      target={targetLink.external ? "_blank" : undefined}
                      rel={
                        targetLink.external ? "noopener noreferrer" : undefined
                      }
                      className="mt-2 inline-flex min-h-11 items-center break-all text-sm text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      Abrir link da notificação
                    </Link>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-[var(--muted)]">
                  {item.body}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                <time
                  className="text-xs text-[var(--muted)]"
                  dateTime={item.createdAt}
                >
                  {formatDate(item.createdAt)}
                </time>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-lg px-3 text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                    aria-expanded={openMessages.includes(item.id)}
                    onClick={() => void toggleMessage(item)}
                  >
                    {openMessages.includes(item.id)
                      ? "Fechar mensagem"
                      : "Ler mensagem"}
                  </button>
                  {item.archived ? (
                    <button
                      type="button"
                      className="min-h-11 rounded-lg px-3 text-sm font-medium text-[var(--muted)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                      onClick={() => void restoreFromInbox(item)}
                    >
                      Restaurar na caixa
                    </button>
                  ) : null}
                  {ownManualMessage ? (
                    <button
                      type="button"
                      className="min-h-11 rounded-lg px-3 text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                      aria-expanded={openReceipts.includes(item.id)}
                      onClick={() => void loadReceipts(item)}
                      disabled={loadingReceiptsId === item.id}
                    >
                      {loadingReceiptsId === item.id
                        ? "Carregando confirmações…"
                        : openReceipts.includes(item.id)
                          ? "Ocultar confirmações"
                          : receipts
                            ? `${readCount} de ${receipts.length} leram`
                            : "Ver quem leu"}
                    </button>
                  ) : null}
                </div>
              </div>
              {ownManualMessage &&
              openReceipts.includes(item.id) &&
              receipts ? (
                <div
                  className="mt-3 rounded-lg bg-[var(--accent)]/40 p-3"
                  aria-label="Confirmações de leitura dos destinatários"
                >
                  <h3 className="text-sm font-semibold">Destinatários</h3>
                  <ul className="mt-2 divide-y divide-[var(--border)]">
                    {receipts.map((receipt) => (
                      <li
                        key={receipt.recipientId}
                        className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span>
                          {receipt.recipientName}{" "}
                          <span className="text-[var(--muted)]">
                            @{receipt.recipientUsername}
                          </span>
                        </span>
                        <span
                          className={
                            receipt.readAt
                              ? "text-[var(--success)]"
                              : "text-[var(--muted)]"
                          }
                        >
                          {receipt.readAt
                            ? `Lida em ${formatDate(receipt.readAt)}`
                            : "Ainda não lida"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded-lg border border-[var(--border)] px-4 text-sm font-medium hover:bg-[var(--accent)] disabled:opacity-60"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "Carregando…" : "Carregar mais"}
        </button>
      ) : null}
    </section>
  );
}
