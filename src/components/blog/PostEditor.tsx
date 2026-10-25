"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MusicLoader } from "@/components/MusicLoader";
import { MediaSourceField } from "@/components/blog/MediaSourceField";
import { PostBlocks } from "@/components/blog/PostBlocks";
import { RichTextEditor } from "@/components/blog/RichTextEditor";
import { usesRemoteApi } from "@/core/auth/accessToken";
import {
  bodyFromBlocks,
  createBlock,
  emptyPostDraft,
  parseMediaPost,
  readBlocks,
  slugifyTitle,
  validatePost,
  youtubeIdFromInput,
} from "@/domains/media/blocks";
import type {
  AlbumLayout,
  MediaKind,
  MediaPost,
  MediaSize,
  MediaStatus,
  PostBlock,
  SectionLayout,
} from "@/domains/media/types";
import { apiFetch } from "@/lib/api";
import { uploadMediaFile } from "@/lib/uploadMedia";
import { failureMessage, userFacingError } from "@/lib/userMessages";

interface PostEditorProps {
  postId?: string;
}

export function PostEditor({ postId }: PostEditorProps) {
  const router = useRouter();
  const [post, setPost] = useState<MediaPost | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(postId));
  const [loading, setLoading] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifyAll, setNotifyAll] = useState(true);

  useEffect(() => {
    if (!postId) {
      const frame = window.requestAnimationFrame(() => {
        const now = new Date().toISOString();
        setPost({
          id: "",
          ...emptyPostDraft(),
          createdAt: now,
          updatedAt: now,
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    apiFetch<unknown[]>(`/media`)
      .then((items) => {
        const found =
          items.map(parseMediaPost).find((item) => item?.id === postId) ?? null;
        if (!found) {
          setError("Post não encontrado.");
          return;
        }
        setPost({ ...found, blocks: readBlocks(found) });
        setSlugTouched(true);
      })
      .catch((caught: unknown) =>
        setError(failureMessage(caught, "Não foi possível carregar o post.")),
      )
      .finally(() => setLoading(false));
  }, [postId]);

  const blocks = post?.blocks ?? [];

  const updateBlocks = (next: PostBlock[]) => {
    setPost((current) =>
      current
        ? { ...current, blocks: next, body: bodyFromBlocks(next) }
        : current,
    );
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = blocks.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    updateBlocks(next);
  };

  const save = async () => {
    if (!post) return;
    const draft = {
      ...post,
      slug: post.slug.trim(),
      blocks,
      body: bodyFromBlocks(blocks),
    };
    const validation = validatePost(draft);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const existing = await apiFetch<MediaPost[]>("/media");
      const slugTaken = existing.some(
        (item) =>
          item.slug === draft.slug && String(item.id) !== String(post.id),
      );
      if (slugTaken) {
        setError("Já existe um post com esse endereço.");
        setSaving(false);
        return;
      }
      const now = new Date().toISOString();
      const payload = {
        title: draft.title.trim(),
        slug: draft.slug,
        excerpt: draft.excerpt.trim(),
        body: draft.body,
        coverUrl: draft.coverUrl ?? "",
        videoUrl: (() => {
          const video = draft.blocks?.find(
            (block): block is Extract<PostBlock, { type: "video" }> =>
              block.type === "video" && Boolean(block.youtubeId),
          );
          return video
            ? `https://www.youtube.com/embed/${video.youtubeId}`
            : "";
        })(),
        kind: draft.kind,
        status: draft.status,
        ...(usesRemoteApi() ? { notifyAll } : {}),
        publishedAt:
          draft.status === "published" ? (draft.publishedAt ?? now) : undefined,
        blocks: draft.blocks,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      };
      if (!postId) {
        const created = await apiFetch<MediaPost>("/media", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        router.replace(`/gestao/midias/${created.id}`);
        return;
      }
      await apiFetch(`/media/${postId}`, {
        method: "PUT",
        body: JSON.stringify({ ...payload, id: postId }),
      });
      setPost({ ...draft, ...payload, id: postId });
    } catch (caught) {
      setError(failureMessage(caught, "Não foi possível salvar o post."));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !post) {
    return error ? (
      <p className="text-[var(--destructive)]">{error}</p>
    ) : (
      <MusicLoader label="Carregando post…" />
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <Link
        href="/gestao/midias"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--color-brand-strong)] no-underline"
      >
        <span className="material-icons text-lg" aria-hidden>
          arrow_back
        </span>
        Posts
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {postId ? "Editar post" : "Novo post"}
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Os blocos abaixo aparecem na publicação na mesma ordem.
      </p>
      {error ? (
        <p className="mt-4 text-sm text-[var(--destructive)]">{error}</p>
      ) : null}

      <div className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <label className="block text-sm font-medium">
          Título
          <input
            className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base"
            value={post.title}
            onChange={(event) => {
              const title = event.target.value;
              setPost((current) =>
                current
                  ? {
                      ...current,
                      title,
                      slug: slugTouched ? current.slug : slugifyTitle(title),
                    }
                  : current,
              );
            }}
          />
        </label>
        <label className="block text-sm font-medium">
          Endereço
          <input
            className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base"
            value={post.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setPost((current) =>
                current ? { ...current, slug: event.target.value } : current,
              );
            }}
          />
        </label>
        <label className="block text-sm font-medium">
          Resumo da listagem
          <textarea
            className="mt-1 min-h-20 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base"
            value={post.excerpt}
            onChange={(event) =>
              setPost((current) =>
                current ? { ...current, excerpt: event.target.value } : current,
              )
            }
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Tipo
            <select
              className="mt-1 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3"
              value={post.kind}
              onChange={(event) =>
                setPost((current) =>
                  current
                    ? { ...current, kind: event.target.value as MediaKind }
                    : current,
                )
              }
            >
              <option value="article">Matéria</option>
              <option value="photo">Galeria</option>
              <option value="video">Vídeo</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Status
            <select
              className="mt-1 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3"
              value={post.status}
              onChange={(event) =>
                setPost((current) =>
                  current
                    ? { ...current, status: event.target.value as MediaStatus }
                    : current,
                )
              }
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
            </select>
          </label>
        </div>
        {!postId || post.status !== "published" ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--primary)]"
                checked={notifyAll}
                onChange={(event) => setNotifyAll(event.target.checked)}
              />
              <span>
                Notificar todas as contas quando este post for publicado
              </span>
            </label>
            <p className="text-sm text-[var(--muted)]">
              A notificação é enviada ao salvar o post como publicado. O padrão
              é enviar.
            </p>
          </div>
        ) : null}
        <MediaSourceField
          label="Capa"
          placeholder="https://… ou /caminho/da-imagem"
          accept="image/*"
          value={post.coverUrl ?? ""}
          onChange={(coverUrl) =>
            setPost((current) => (current ? { ...current, coverUrl } : current))
          }
          onError={setError}
        />
      </div>

      <ol className="mt-8 space-y-4">
        {blocks.map((block, index) => (
          <li
            key={block.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                {index + 1} · {blockLabel(block.type)}
              </span>
              <div className="flex">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center"
                  aria-label="Subir bloco"
                  disabled={index === 0}
                  onClick={() => moveBlock(index, -1)}
                >
                  <span className="material-icons" aria-hidden>
                    arrow_upward
                  </span>
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center"
                  aria-label="Descer bloco"
                  disabled={index === blocks.length - 1}
                  onClick={() => moveBlock(index, 1)}
                >
                  <span className="material-icons" aria-hidden>
                    arrow_downward
                  </span>
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center text-[var(--destructive)]"
                  aria-label="Remover bloco"
                  disabled={blocks.length <= 1}
                  onClick={() =>
                    updateBlocks(
                      blocks.filter((_, blockIndex) => blockIndex !== index),
                    )
                  }
                >
                  <span className="material-icons" aria-hidden>
                    delete
                  </span>
                </button>
              </div>
            </div>
            <BlockFields
              block={block}
              onChange={(next) => {
                const copy = blocks.slice();
                copy[index] = next;
                updateBlocks(copy);
              }}
              onError={setError}
            />
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["text", "section", "image", "album", "video", "audio"] as const).map(
          (type) => (
            <button
              key={type}
              type="button"
              className="btn-outline-primary min-h-11 px-4 text-sm"
              onClick={() =>
                updateBlocks([...blocks, createBlock(type, blocks)])
              }
            >
              {blockLabel(type)}
            </button>
          ),
        )}
      </div>

      <section className="mt-10 border-t border-[var(--border)] pt-6">
        <h2 className="text-lg font-semibold">Prévia do conteúdo</h2>
        <PostBlocks blocks={blocks} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl justify-end">
          <button
            type="button"
            className="btn-primary min-h-11 px-5"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? (
              <MusicLoader compact label="Salvando…" />
            ) : postId ? (
              "Salvar post"
            ) : (
              "Criar post"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
  onError,
}: {
  block: PostBlock;
  onChange: (block: PostBlock) => void;
  onError: (message: string) => void;
}) {
  const inputClass =
    "mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base";
  if (block.type === "text") {
    return (
      <RichTextEditor
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
      />
    );
  }
  if (block.type === "section") {
    return (
      <SectionFields block={block} onChange={onChange} onError={onError} />
    );
  }
  if (block.type === "album") {
    return <AlbumFields block={block} onChange={onChange} onError={onError} />;
  }
  if (block.type === "image") {
    return (
      <div className="space-y-3">
        {block.src ? (
          <img
            src={block.src}
            alt={block.alt}
            className="max-h-64 w-full rounded-xl object-cover"
          />
        ) : null}
        <MediaSourceField
          label="Foto"
          placeholder="https://… ou /caminho/da-foto"
          accept="image/*"
          value={block.src}
          onChange={(src) => onChange({ ...block, src })}
          onError={onError}
        />
        <SizePicker
          value={block.size}
          onChange={(size) => onChange({ ...block, size })}
        />
        <input
          className={inputClass}
          placeholder="Descrição da foto"
          value={block.alt}
          onChange={(event) => onChange({ ...block, alt: event.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Legenda"
          value={block.caption}
          onChange={(event) =>
            onChange({ ...block, caption: event.target.value })
          }
        />
      </div>
    );
  }
  if (block.type === "video") {
    const shown = block.src || block.youtubeId;
    return (
      <div className="space-y-3">
        <MediaSourceField
          label="Vídeo"
          placeholder="Link do YouTube, https://… ou envie um arquivo"
          accept="video/*"
          value={shown}
          onChange={(value) => {
            const youtubeId = youtubeIdFromInput(value);
            if (youtubeId && !value.startsWith("/")) {
              onChange({ ...block, youtubeId, src: "" });
              return;
            }
            onChange({ ...block, src: value, youtubeId: "" });
          }}
          onError={onError}
        />
        <input
          className={inputClass}
          placeholder="Legenda"
          value={block.caption}
          onChange={(event) =>
            onChange({ ...block, caption: event.target.value })
          }
        />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {block.src ? <audio src={block.src} controls className="w-full" /> : null}
      <MediaSourceField
        label="Áudio"
        placeholder="https://… ou /caminho/do-audio"
        accept="audio/*"
        value={block.src}
        onChange={(src) => onChange({ ...block, src })}
        onError={onError}
      />
      <input
        className={inputClass}
        placeholder="Título do áudio"
        value={block.title}
        onChange={(event) => onChange({ ...block, title: event.target.value })}
      />
    </div>
  );
}

function blockLabel(type: PostBlock["type"]): string {
  if (type === "text") return "Texto";
  if (type === "section") return "Seção";
  if (type === "image") return "Foto";
  if (type === "album") return "Álbum";
  if (type === "video") return "Vídeo";
  return "Áudio";
}

const SECTION_LAYOUTS: { value: SectionLayout; label: string }[] = [
  { value: "text-image", label: "Texto à esquerda" },
  { value: "image-text", label: "Imagem à esquerda" },
  { value: "stack-image", label: "Imagem acima" },
  { value: "stack-text", label: "Texto acima" },
];

function SectionFields({
  block,
  onChange,
  onError,
}: {
  block: Extract<PostBlock, { type: "section" }>;
  onChange: (block: PostBlock) => void;
  onError: (message: string) => void;
}) {
  const inputClass =
    "mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base";
  const stacked =
    block.layout === "stack-image" || block.layout === "stack-text";
  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Layout da seção"
      >
        {SECTION_LAYOUTS.map((layout) => (
          <button
            key={layout.value}
            type="button"
            role="radio"
            aria-checked={block.layout === layout.value}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm ${block.layout === layout.value ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--card-secondary)] text-[var(--foreground)]"}`}
            onClick={() => onChange({ ...block, layout: layout.value })}
          >
            {layout.label}
          </button>
        ))}
      </div>
      <p className="m-0 text-sm text-[var(--muted)]">
        {stacked
          ? "A imagem fica em uma linha e o texto na outra. O tamanho muda a largura da foto."
          : "No celular, imagem e texto ficam um embaixo do outro. O tamanho muda a coluna da foto."}
      </p>
      <SizePicker
        value={block.size}
        onChange={(size) => onChange({ ...block, size })}
      />
      {block.src ? (
        <img
          src={block.src}
          alt={block.alt}
          className="max-h-48 w-full rounded-xl object-cover"
        />
      ) : null}
      <MediaSourceField
        label="Foto da seção"
        placeholder="https://… ou /caminho/da-foto"
        accept="image/*"
        value={block.src}
        onChange={(src) => onChange({ ...block, src })}
        onError={onError}
      />
      <input
        className={inputClass}
        placeholder="Descrição da foto"
        value={block.alt}
        onChange={(event) => onChange({ ...block, alt: event.target.value })}
      />
      <input
        className={inputClass}
        placeholder="Legenda"
        value={block.caption}
        onChange={(event) =>
          onChange({ ...block, caption: event.target.value })
        }
      />
      <RichTextEditor
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
      />
    </div>
  );
}

function AlbumFields({
  block,
  onChange,
  onError,
}: {
  block: Extract<PostBlock, { type: "album" }>;
  onChange: (block: PostBlock) => void;
  onError: (message: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputClass =
    "mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base";

  const addImages = (
    images: { src: string; alt: string; size: MediaSize }[],
  ) => {
    if (images.length === 0) return;
    onChange({ ...block, images: [...block.images, ...images] });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Exibição
        <select
          className="mt-1 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3"
          value={block.layout}
          onChange={(event) =>
            onChange({ ...block, layout: event.target.value as AlbumLayout })
          }
        >
          <option value="carousel">Carrossel</option>
          <option value="thumbnails">Miniaturas</option>
          <option value="gallery">Galeria</option>
        </select>
      </label>
      {block.layout === "carousel" ? (
        <p className="m-0 text-sm text-[var(--muted)]">
          No carrossel as fotos aparecem no mesmo tamanho. O tamanho escolhido
          vale ao abrir “Ver imagens”.
        </p>
      ) : null}
      <input
        className={inputClass}
        placeholder="Legenda do álbum"
        value={block.caption}
        onChange={(event) =>
          onChange({ ...block, caption: event.target.value })
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium">
          Endereço da foto
          <input
            className={inputClass}
            placeholder="https://…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn-outline-primary min-h-11 px-4 text-sm"
          onClick={() => {
            const src = url.trim();
            if (!src) return;
            addImages([{ src, alt: "", size: "medium" }]);
            setUrl("");
          }}
        >
          Adicionar URL
        </button>
      </div>
      <label className="btn-outline-primary inline-flex min-h-11 cursor-pointer items-center px-4 text-sm">
        {uploading ? (
          <MusicLoader compact label="Enviando…" />
        ) : (
          "Enviar várias fotos"
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (files.length === 0) return;
            setUploading(true);
            Promise.all(files.map((file) => uploadMediaFile(file)))
              .then((sources) =>
                addImages(
                  sources.map((src) => ({
                    src,
                    alt: "",
                    size: "medium" as const,
                  })),
                ),
              )
              .catch((reason: unknown) => {
                onError(userFacingError(reason));
              })
              .finally(() => setUploading(false));
          }}
        />
      </label>
      <ul className="space-y-2">
        {block.images.map((image, index) => (
          <li key={`${image.src}-${index}`} className="flex items-center gap-2">
            <img
              src={image.src}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
            <select
              className="min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-2 text-sm"
              aria-label="Tamanho da foto"
              value={image.size}
              onChange={(event) => {
                const images = block.images.slice();
                images[index] = {
                  ...image,
                  size: event.target.value as MediaSize,
                };
                onChange({ ...block, images });
              }}
            >
              <option value="small">Pequeno</option>
              <option value="medium">Médio</option>
              <option value="large">Grande</option>
            </select>
            <input
              className="min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm"
              placeholder="Descrição"
              value={image.alt}
              onChange={(event) => {
                const images = block.images.slice();
                images[index] = { ...image, alt: event.target.value };
                onChange({ ...block, images });
              }}
            />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center"
              aria-label="Subir foto"
              disabled={index === 0}
              onClick={() => {
                const images = block.images.slice();
                const [item] = images.splice(index, 1);
                images.splice(index - 1, 0, item);
                onChange({ ...block, images });
              }}
            >
              <span className="material-icons" aria-hidden>
                arrow_upward
              </span>
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center"
              aria-label="Descer foto"
              disabled={index === block.images.length - 1}
              onClick={() => {
                const images = block.images.slice();
                const [item] = images.splice(index, 1);
                images.splice(index + 1, 0, item);
                onChange({ ...block, images });
              }}
            >
              <span className="material-icons" aria-hidden>
                arrow_downward
              </span>
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center text-[var(--destructive)]"
              aria-label="Remover foto"
              onClick={() =>
                onChange({
                  ...block,
                  images: block.images.filter(
                    (_, imageIndex) => imageIndex !== index,
                  ),
                })
              }
            >
              <span className="material-icons" aria-hidden>
                delete
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SIZES: { value: MediaSize; label: string }[] = [
  { value: "small", label: "Pequeno" },
  { value: "medium", label: "Médio" },
  { value: "large", label: "Grande" },
];

function SizePicker({
  value,
  onChange,
}: {
  value: MediaSize;
  onChange: (size: MediaSize) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Tamanho da foto"
    >
      {SIZES.map((size) => (
        <button
          key={size.value}
          type="button"
          role="radio"
          aria-checked={value === size.value}
          className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm ${value === size.value ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--card-secondary)] text-[var(--foreground)]"}`}
          onClick={() => onChange(size.value)}
        >
          {size.label}
        </button>
      ))}
    </div>
  );
}
