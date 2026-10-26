"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EntityDialog } from "@/components/shared/EntityDialog";
import { TableRowActions } from "@/components/tables/core/TableRowActions";
import { TableView } from "@/components/tables/core/TableView";
import type { MobileTableAction } from "@/components/tables/core/table-actions";
import { tableFeatures } from "@/components/tables/core/table-features";
import type { TableColumnDef } from "@/components/tables/core/table-features";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotificationCenter,
  getNotificationReadReceipts,
  markNotificationRead,
  notifyUnreadCountChanged,
  restoreNotification,
} from "@/domains/notifications/api";
import Link from "next/link";
import { resolveNotificationLink } from "@/domains/notifications/links";
import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationItem,
  type NotificationReadReceipt,
} from "@/domains/notifications/types";
import { failureMessage } from "@/lib/userMessages";

const column = createColumnHelper<typeof tableFeatures, NotificationItem>();
const receiptColumn = createColumnHelper<
  typeof tableFeatures,
  NotificationReadReceipt
>();
const initialPagination = { pageIndex: 0, pageSize: 10 };

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}

export function NotificationCenter() {
  const auth = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [receiptsFor, setReceiptsFor] = useState<NotificationItem | null>(null);
  const [receipts, setReceipts] = useState<NotificationReadReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const currentUserId = auth.user ? Number(auth.user.id) : null;

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await getNotificationCenter({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch,
      });
      setItems(page.items);
      setTotal(page.total);
    } catch (caught) {
      setError(failureMessage(caught, "Não foi possível carregar a central."));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadPage());
    return () => window.cancelAnimationFrame(frame);
  }, [loadPage]);

  const openReceipts = async (item: NotificationItem) => {
    setReceiptsFor(item);
    setReceipts([]);
    setReceiptsError(null);
    setReceiptsLoading(true);
    try {
      setReceipts(await getNotificationReadReceipts(item.id));
    } catch (caught) {
      setReceiptsError(
        failureMessage(
          caught,
          "Não foi possível carregar as confirmações de leitura.",
        ),
      );
    } finally {
      setReceiptsLoading(false);
    }
  };

  const markRead = async (item: NotificationItem) => {
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

  const openNotification = (item: NotificationItem) => {
    setSelected(item);
    if (!item.readAt) void markRead(item);
  };

  const restore = async (item: NotificationItem) => {
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

  const columns = useMemo<TableColumnDef<NotificationItem>[]>(
    () => [
      column.accessor("title", {
        id: "notification",
        header: "Notificação",
        size: 300,
        minSize: 240,
        maxSize: 620,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="max-w-xl">
            <p className="font-semibold">{row.original.title}</p>
            <p className="line-clamp-2 text-sm text-[var(--muted)]">
              {row.original.body}
            </p>
          </div>
        ),
      }) as unknown as TableColumnDef<NotificationItem>,
      column.accessor((item) => NOTIFICATION_TYPE_LABELS[item.type], {
        id: "type",
        header: "Tipo",
        size: 160,
        minSize: 140,
        maxSize: 280,
        enableSorting: false,
      }) as unknown as TableColumnDef<NotificationItem>,
      column.accessor("createdAt", {
        id: "createdAt",
        header: "Data",
        size: 140,
        minSize: 130,
        maxSize: 220,
        enableSorting: false,
        cell: ({ getValue }) => formatDate(getValue()),
      }) as unknown as TableColumnDef<NotificationItem>,
      column.accessor((item) => (item.readAt ? "Lida" : "Não lida"), {
        id: "read",
        header: "Leitura",
        size: 120,
        minSize: 110,
        maxSize: 180,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="inline-flex rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-medium">
            {row.original.readAt ? "Lida" : "Não lida"}
          </span>
        ),
      }) as unknown as TableColumnDef<NotificationItem>,
    ],
    [],
  );

  const receiptColumns = useMemo<TableColumnDef<NotificationReadReceipt>[]>(
    () => [
      receiptColumn.accessor(
        (receipt) => `${receipt.recipientName} — @${receipt.recipientUsername}`,
        {
          id: "recipient",
          header: "Usuário",
          size: 300,
          minSize: 220,
          cell: ({ row }) => (
            <span className="font-medium">
              {row.original.recipientName} — @{row.original.recipientUsername}
            </span>
          ),
        },
      ) as unknown as TableColumnDef<NotificationReadReceipt>,
      receiptColumn.accessor(
        (receipt) => (receipt.readAt ? "Lida" : "Não lida"),
        {
          id: "readState",
          header: "Leitura",
          size: 140,
          minSize: 120,
          cell: ({ row }) => (
            <span className="inline-flex rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-medium">
              {row.original.readAt ? "Lida" : "Não lida"}
            </span>
          ),
        },
      ) as unknown as TableColumnDef<NotificationReadReceipt>,
      receiptColumn.accessor((receipt) => receipt.readAt ?? "", {
        id: "readAt",
        header: "Horário da leitura",
        size: 190,
        minSize: 160,
        cell: ({ row }) => (
          <span className="text-sm text-[var(--muted)]">
            {row.original.readAt ? formatDate(row.original.readAt) : "—"}
          </span>
        ),
      }) as unknown as TableColumnDef<NotificationReadReceipt>,
    ],
    [],
  );

  return (
    <section aria-label="Histórico de notificações">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Central de notificações</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Consulte o histórico de notificações disponíveis para sua conta.
        </p>
      </header>
      <TableView
        tableId="notification-center"
        data={items}
        columns={columns}
        getRowId={(item) => String(item.id)}
        loading={loading}
        error={error}
        onRefresh={() => void loadPage()}
        globalFilterLabel="Buscar título, conteúdo ou tipo"
        emptyMessage="Nenhuma notificação no histórico."
        noResultsMessage="Nenhuma notificação corresponde à busca."
        features={{ sorting: false, grouping: false, columnFilters: false }}
        toolbarLabels={{
          section: "Busca no histórico",
          search: "Buscar notificações",
          searchPlaceholder: "Buscar título, conteúdo ou tipo",
          reset: "Redefinir busca",
        }}
        serverSearch={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          },
        }}
        serverPagination={{
          pagination,
          rowCount: total,
          onChange: (updater) => setPagination(updater),
        }}
        pageSizeOptions={[10, 20, 50]}
        onRowClick={openNotification}
        renderRowActions={(item) => (
          <TableRowActions
            actions={[
              {
                id: "view",
                label: "Visualizar",
                icon: "visibility",
                onSelect: () => openNotification(item),
              },
              ...(item.type === "admin_message" &&
              item.actorUserId === currentUserId
                ? [
                    {
                      id: "receipts",
                      label: "Quem leu",
                      icon: "group",
                      onSelect: () => void openReceipts(item),
                    },
                  ]
                : []),
              ...(item.archived
                ? [
                    {
                      id: "restore",
                      label: "Restaurar",
                      icon: "unarchive",
                      onSelect: () => void restore(item),
                    },
                  ]
                : !item.readAt
                  ? [
                      {
                        id: "read",
                        label: "Marcar lida",
                        icon: "mark_email_read",
                        onSelect: () => void markRead(item),
                      },
                    ]
                  : []),
            ]}
          />
        )}
        renderMobileRowActions={(item): MobileTableAction[] => [
          {
            label: "Visualizar",
            icon: "visibility",
            onSelect: () => openNotification(item),
          },
          ...(item.type === "admin_message" &&
          item.actorUserId === currentUserId
            ? [
                {
                  label: "Quem leu",
                  icon: "group",
                  onSelect: () => void openReceipts(item),
                },
              ]
            : []),
          ...(item.archived
            ? [
                {
                  label: "Restaurar",
                  icon: "unarchive",
                  onSelect: () => void restore(item),
                },
              ]
            : []),
          ...(!item.readAt
            ? [
                {
                  label: "Marcar lida",
                  icon: "mark_email_read",
                  onSelect: () => void markRead(item),
                },
              ]
            : []),
        ]}
      />

      <EntityDialog
        open={Boolean(selected)}
        title={selected?.title ?? "Visualizar notificação"}
        description={
          selected
            ? `${NOTIFICATION_TYPE_LABELS[selected.type]} · ${formatDate(selected.createdAt)}`
            : undefined
        }
        size="lg"
        placement="mobile-full"
        confirmBeforeClose={false}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="whitespace-pre-wrap text-sm leading-6">
              {selected.body}
            </p>
            {(() => {
              const link = selected
                ? resolveNotificationLink(selected)
                : null;
              if (!link) return null;
              return link.external ? (
                <a
                  className="inline-flex min-h-11 items-center font-semibold text-[var(--primary)] underline"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir conteúdo relacionado
                </a>
              ) : (
                <Link
                  className="inline-flex min-h-11 items-center font-semibold text-[var(--primary)] underline"
                  href={link.href}
                >
                  Abrir conteúdo relacionado
                </Link>
              );
            })()}
          </div>
        ) : null}
      </EntityDialog>
      <EntityDialog
        open={Boolean(receiptsFor)}
        title="Quem leu"
        description={receiptsFor?.title}
        size="xl"
        placement="mobile-full"
        confirmBeforeClose={false}
        onClose={() => setReceiptsFor(null)}
      >
        <div className="p-4 sm:p-6">
          <TableView
            key={`notification-read-receipts-${receiptsFor?.id ?? "closed"}`}
            tableId="notification-read-receipts"
            data={receipts}
            columns={receiptColumns}
            getRowId={(receipt) => String(receipt.recipientId)}
            getRowLabel={(receipt) =>
              `${receipt.recipientName} — @${receipt.recipientUsername}`
            }
            loading={receiptsLoading}
            error={receiptsError}
            onRefresh={() => {
              if (receiptsFor) void openReceipts(receiptsFor);
            }}
            globalFilterLabel="Buscar destinatários"
            emptyMessage="Nenhum destinatário encontrado."
            noResultsMessage="Nenhum destinatário corresponde à busca."
            pageSizeOptions={[10, 20, 50]}
            features={{
              rowControls: false,
              rowSelection: false,
              rowPinning: false,
              grouping: false,
              columnFilters: false,
            }}
          />
        </div>
      </EntityDialog>
    </section>
  );
}
