'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BLOG_SECTION_LABELS,
  defaultBlogPage,
  parseBlogPage,
  type BlogPageDocument,
  type BlogSection,
} from '@/domains/blog/layout';
import { parseMediaPost } from '@/domains/media/blocks';
import type { MediaPost } from '@/domains/media/types';
import { orderMediaPosts } from '@/lib/publicPortal';
import { apiFetch } from '@/lib/api';
import { failureMessage } from '@/lib/userMessages';

export function BlogLayoutEditor() {
  const [layout, setLayout] = useState<BlogPageDocument | null>(null);
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [openType, setOpenType] = useState<BlogSection['type'] | null>('header');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([apiFetch<unknown>('/blogpage'), apiFetch<unknown[]>('/media')])
      .then(([page, media]) => {
        const parsed = parseBlogPage(page);
        const items = media.flatMap((item) => {
          const post = parseMediaPost(item);
          return post ? [post] : [];
        });
        const known = new Set(parsed.postOrder);
        const extras = orderMediaPosts(items)
          .map((post) => String(post.id))
          .filter((id) => !known.has(id));
        setLayout({ ...parsed, postOrder: [...parsed.postOrder.filter((id) => items.some((post) => String(post.id) === id)), ...extras] });
        setPosts(items);
      })
      .catch((caught: unknown) => {
        setLayout(defaultBlogPage());
        setError(failureMessage(caught, 'Não foi possível carregar a organização salva.'));
      })
      .finally(() => setLoading(false));
  }, []);

  const moveSection = (index: number, direction: -1 | 1) => {
    setLayout((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.sections.length) return current;
      const sections = current.sections.slice();
      const [item] = sections.splice(index, 1);
      sections.splice(target, 0, item);
      return { ...current, sections };
    });
    setSaved(false);
  };

  const movePost = (index: number, direction: -1 | 1) => {
    setLayout((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.postOrder.length) return current;
      const postOrder = current.postOrder.slice();
      const [item] = postOrder.splice(index, 1);
      postOrder.splice(target, 0, item);
      return { ...current, postOrder };
    });
    setSaved(false);
  };

  const save = async () => {
    if (!layout) return;
    setSaving(true);
    setError(null);
    try {
      const payload: BlogPageDocument = { ...layout, id: 'blog', updatedAt: new Date().toISOString() };
      const savedDoc = await apiFetch<unknown>('/blogpage/blog', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setLayout(parseBlogPage(savedDoc));
      setSaved(true);
    } catch (caught) {
      setError(failureMessage(caught, 'Não foi possível publicar a organização do blog.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !layout) return <p className="text-[var(--muted)]">Carregando organização…</p>;

  const postsById = new Map(posts.map((post) => [String(post.id), post]));

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Administração</p>
      <h1 className="mt-2 text-3xl font-semibold">Organização do blog</h1>
      <p className="mt-2 text-[var(--muted)]">
        Defina as seções da página pública e a ordem dos posts. A escrita dos posts fica em Posts do blog.
      </p>
      {error ? <p className="mt-4 text-sm text-[var(--destructive)]">{error}</p> : null}
      {saved ? <p className="mt-4 text-sm text-[var(--color-brand-strong)]">Blog publicado.</p> : null}

      <h2 className="mt-8 text-lg font-semibold">Seções da página</h2>
      <ol className="mt-3 space-y-3">
        {layout.sections.map((section, index) => {
          const open = openType === section.type;
          return (
            <li key={section.type} className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <div className="flex items-center gap-2 px-3 py-3">
                <button type="button" className="min-h-11 flex-1 text-left" aria-expanded={open} onClick={() => setOpenType(open ? null : section.type)}>
                  <span className="block text-xs text-[var(--muted)]">{section.enabled ? 'Visível' : 'Oculta'}</span>
                  <span className="font-semibold">{BLOG_SECTION_LABELS[section.type]}</span>
                </button>
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Subir seção" disabled={index === 0} onClick={() => moveSection(index, -1)}>
                  <span className="material-icons" aria-hidden>arrow_upward</span>
                </button>
                <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Descer seção" disabled={index === layout.sections.length - 1} onClick={() => moveSection(index, 1)}>
                  <span className="material-icons" aria-hidden>arrow_downward</span>
                </button>
              </div>
              {open ? (
                <div className="space-y-3 border-t border-[var(--border)] px-4 py-4">
                  <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={section.enabled}
                      onChange={(event) => {
                        const sections = layout.sections.slice();
                        sections[index] = { ...section, enabled: event.target.checked };
                        setLayout({ ...layout, sections });
                        setSaved(false);
                      }}
                    />
                    Mostrar na página
                  </label>
                  {section.type === 'header' ? (
                    <>
                      <TextField label="Linha acima" value={section.eyebrow} onChange={(eyebrow) => patchSection(index, { ...section, eyebrow })} />
                      <TextField label="Título" value={section.title} onChange={(title) => patchSection(index, { ...section, title })} />
                      <TextField label="Descrição" value={section.description} multiline onChange={(description) => patchSection(index, { ...section, description })} />
                    </>
                  ) : null}
                  {section.type === 'cta' ? (
                    <>
                      <TextField label="Título" value={section.title} onChange={(title) => patchSection(index, { ...section, title })} />
                      <TextField label="Texto" value={section.description} multiline onChange={(description) => patchSection(index, { ...section, description })} />
                      <TextField label="Botão" value={section.linkLabel} onChange={(linkLabel) => patchSection(index, { ...section, linkLabel })} />
                      <TextField label="Link" value={section.href} onChange={(href) => patchSection(index, { ...section, href })} />
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <h2 className="mt-10 text-lg font-semibold">Ordem dos posts</h2>
      <ol className="mt-3 space-y-2">
        {layout.postOrder.map((id, index) => {
          const post = postsById.get(id);
          if (!post) return null;
          return (
            <li key={id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{post.title || 'Sem título'}</p>
                <p className="text-xs text-[var(--muted)]">{post.status === 'published' ? 'Publicado' : 'Rascunho'}</p>
              </div>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Subir post" disabled={index === 0} onClick={() => movePost(index, -1)}>
                <span className="material-icons" aria-hidden>arrow_upward</span>
              </button>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Descer post" disabled={index === layout.postOrder.length - 1} onClick={() => movePost(index, 1)}>
                <span className="material-icons" aria-hidden>arrow_downward</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl justify-end gap-2">
          <Link href="/blog" className="btn-outline-primary inline-flex min-h-11 items-center px-4 text-sm">Ver blog</Link>
          <button type="button" className="btn-primary min-h-11 px-5" disabled={saving} onClick={() => void save()}>
            {saving ? 'Salvando…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );

  function patchSection(index: number, next: BlogSection) {
    setLayout((current) => {
      if (!current) return current;
      const sections = current.sections.slice();
      sections[index] = next;
      return { ...current, sections };
    });
    setSaved(false);
  }
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const className = 'mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-base';
  return (
    <label className="block text-sm font-medium">
      {label}
      {multiline ? (
        <textarea className={`${className} min-h-24`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={className} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
