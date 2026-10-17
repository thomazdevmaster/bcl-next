'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BlogPostCard } from '@/components/public/BlogPostCard';
import { PortalPageHeader } from '@/components/public/PortalPageHeader';
import { blogSection, defaultBlogPage, parseBlogPage, type BlogPageDocument } from '@/domains/blog/layout';
import type { MediaKind, MediaPost } from '@/domains/media/types';
import { apiFetch } from '@/lib/api';
import { failureMessage } from '@/lib/userMessages';
import { mediaKindLabel, publishedMediaPosts } from '@/lib/publicPortal';

type KindFilter = 'all' | MediaKind;

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'article', label: 'Matérias' },
  { id: 'photo', label: 'Galerias' },
  { id: 'video', label: 'Vídeos' },
];

export default function BlogPage() {
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [layout, setLayout] = useState<BlogPageDocument>(defaultBlogPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<KindFilter>('all');

  useEffect(() => {
    Promise.all([apiFetch<MediaPost[]>('/media'), apiFetch<unknown>('/blogpage')])
      .then(([items, page]) => {
        const nextLayout = parseBlogPage(page);
        setLayout(nextLayout);
        setPosts(publishedMediaPosts(items, nextLayout.postOrder));
      })
      .catch((caught: unknown) => setError(failureMessage(caught, 'Não foi possível carregar o blog.')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return posts;
    return posts.filter((post) => post.kind === filter);
  }, [filter, posts]);

  const header = blogSection(layout, 'header');
  const showFilters = Boolean(blogSection(layout, 'filters'));
  const showFeatured = Boolean(blogSection(layout, 'featured'));
  const showList = Boolean(blogSection(layout, 'list'));
  const cta = blogSection(layout, 'cta');
  const featured = showFeatured ? filtered[0] : undefined;
  const rest = showFeatured ? filtered.slice(1) : filtered;

  return (
    <div className="mx-auto w-[85%] py-6 sm:py-10 md:py-12">
      {header ? (
        <PortalPageHeader
          eyebrow={header.eyebrow}
          title={header.title}
          description={header.description}
          actions={
            <Link href="/" className="btn-outline-primary inline-flex min-h-11 items-center gap-1 px-4 text-sm">
              <span className="material-icons text-lg" aria-hidden>home</span>
              Início
            </Link>
          }
        />
      ) : null}

      {showFilters ? (
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filtrar publicações">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count = item.id === 'all' ? posts.length : posts.filter((post) => post.kind === item.id).length;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium ${
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]'
                }`}
                onClick={() => setFilter(item.id)}
              >
                {item.id === 'all' ? item.label : mediaKindLabel(item.id)}
                <span className="ml-1.5 text-xs opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="mt-8 text-[var(--destructive)]">{error}</p> : null}
      {loading ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl bg-[var(--card-secondary)]" aria-hidden />
          ))}
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="mt-10 text-[var(--muted)]">Nenhuma publicação nesta categoria.</p>
      ) : null}

      {!loading && !error && (featured || (showList && rest.length > 0)) ? (
        <div className="mt-10 space-y-8">
          {featured ? <BlogPostCard post={featured} featured /> : null}
          {showList && rest.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {cta ? (
        <section className="mt-14 rounded-2xl border border-[var(--border)] bg-[var(--accent)] p-6 md:p-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{cta.title}</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">{cta.description}</p>
          <Link href={cta.href} className="btn-primary mt-4 inline-flex min-h-11 items-center gap-2">
            {cta.linkLabel}
          </Link>
        </section>
      ) : null}
    </div>
  );
}
