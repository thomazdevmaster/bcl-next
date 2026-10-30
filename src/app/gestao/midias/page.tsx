"use client";

import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { TableRowActions } from "@/components/tables/core/TableRowActions";
import { TableView } from "@/components/tables/core/TableView";
import { createCrudTableRowActions } from "@/components/tables/core/table-actions";
import { tableFeatures } from "@/components/tables/core/table-features";
import type { TableColumnDef } from "@/components/tables/core/table-features";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/core/auth/permissions";
import { parseMediaPost } from "@/domains/media/blocks";
import type { MediaPost } from "@/domains/media/types";
import { apiFetch } from "@/lib/api";
import { mediaKindLabel } from "@/lib/publicPortal";
import { failureMessage } from "@/lib/userMessages";

const columnHelper = createColumnHelper<typeof tableFeatures, MediaPost>();

const columns: TableColumnDef<MediaPost>[] = [
  columnHelper.accessor((post): unknown => post.title, {
    id: "title",
    header: "Título",
    cell: ({ row }) => row.original.title || "Sem título",
  }),
  columnHelper.accessor((post): unknown => post.kind, {
    id: "kind",
    header: "Tipo",
    cell: ({ row }) => mediaKindLabel(row.original.kind),
  }),
  columnHelper.accessor((post): unknown => post.status, {
    id: "status",
    header: "Status",
    cell: ({ row }) =>
      row.original.status === "published" ? "Publicado" : "Rascunho",
  }),
  columnHelper.accessor((post): unknown => post.publishedAt ?? "", {
    id: "publishedAt",
    header: "Publicação",
    cell: ({ row }) => {
      const value = row.original.publishedAt;
      if (!value) return "—";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
    },
  }),
];

export default function MidiasPage() {
  const { roles, permissions } = useAuth();
  const canCreate = can(roles, "media", "create", permissions);
  const canUpdate = can(roles, "media", "update", permissions);
  const canDelete = can(roles, "media", "delete", permissions);
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<MediaPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await apiFetch<unknown[]>("/media");
      setPosts(
        items.flatMap((item) => {
          const post = parseMediaPost(item);
          return post ? [post] : [];
        }),
      );
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Não foi possível carregar os posts."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Inicia a carga ao montar a tela e mantém o estado visual de atualização.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPosts();
  }, [fetchPosts]);

  const getRowActions = useCallback(
    (post: MediaPost) =>
      createCrudTableRowActions({
        edit: canUpdate
          ? {
              label: "Editar post",
              href: `/gestao/midias/${post.id}`,
              onSelect: () =>
                window.location.assign(`/gestao/midias/${post.id}`),
            }
          : undefined,
        remove: canDelete
          ? {
              label: "Excluir post",
              onSelect: () => setDeleteTargets([post]),
            }
          : undefined,
      }),
    [canDelete, canUpdate],
  );

  const confirmDelete = async () => {
    if (!canDelete || !deleteTargets?.length) return;
    setDeleting(true);
    setError(null);
    const results = await Promise.allSettled(
      deleteTargets.map((post) =>
        apiFetch<void>(`/media/${String(post.id)}`, { method: "DELETE" }),
      ),
    );
    const deletedIds = deleteTargets
      .filter((_, index) => results[index].status === "fulfilled")
      .map((post) => String(post.id));
    const failedTargets = deleteTargets.filter(
      (_, index) => results[index].status === "rejected",
    );
    if (deletedIds.length > 0) {
      setPosts((current) =>
        current.filter((post) => !deletedIds.includes(String(post.id))),
      );
    }
    if (failedTargets.length > 0) {
      const failure = results.find((result) => result.status === "rejected");
      setError(
        failureMessage(
          failure?.status === "rejected" ? failure.reason : undefined,
          `Não foi possível excluir ${failedTargets.length} post(s).`,
        ),
      );
      setDeleteTargets(failedTargets);
    } else {
      setDeleteTargets(null);
    }
    setDeleting(false);
  };

  return (
    <section className="mx-auto w-full space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            Posts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Crie matérias com texto, fotos, vídeos e áudios, na ordem da
            publicação.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/gestao/midias/novo"
            className="btn-primary hidden min-h-11 shrink-0 items-center justify-center px-4 min-[960px]:inline-flex"
          >
            Novo post
          </Link>
        ) : null}
      </header>

      <TableView
        tableId="media"
        data={posts}
        columns={columns}
        getRowId={(post) => String(post.id)}
        loading={loading}
        error={error}
        onRefresh={() => void fetchPosts()}
        globalFilterLabel="Buscar posts por título, tipo, status ou data"
        emptyMessage="Nenhum post cadastrado. Crie um post para começar."
        noResultsMessage="Nenhum post corresponde à busca ou aos filtros."
        getRowLabel={(post) => post.title || "Post sem título"}
        getMobilePrimaryLabel={(post) =>
          `${mediaKindLabel(post.kind)} - ${post.status === "published" ? "Publicado" : "Rascunho"}`
        }
        getMobilePrimary={(post) => post.title || "Sem título"}
        mobilePrimaryAction={
          canCreate ? (
            <Link
              href="/gestao/midias/novo"
              className="btn-primary inline-flex min-h-11 w-full items-center justify-center px-4"
            >
              Novo post
            </Link>
          ) : undefined
        }
        renderRowActions={(post) => (
          <TableRowActions actions={getRowActions(post)} />
        )}
        renderMobileRowActions={getRowActions}
        mobileSelectionEnabled={canDelete}
        onDeleteSelected={(targets, clearSelection) => {
          if (!canDelete || targets.length === 0) return;
          clearSelection();
          setDeleteTargets(targets);
        }}
        toolbarLabels={{ section: "Controles de posts" }}
      />

      <ConfirmationDialog
        open={deleteTargets !== null}
        title={`Excluir ${deleteTargets?.length ?? 0} post(s)?`}
        description="Esta ação não pode ser desfeita."
        closeOnBackdropClick={!deleting}
        confirmLabel={deleting ? "Excluindo…" : "Excluir"}
        danger
        busy={deleting}
        onClose={() => {
          if (!deleting) setDeleteTargets(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
