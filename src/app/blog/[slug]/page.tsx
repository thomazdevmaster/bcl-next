'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PostBlocks } from '@/components/blog/PostBlocks';
import { MusicLoader } from '@/components/MusicLoader';
import { readBlocks } from '@/domains/media/blocks';
import { apiFetch } from '@/lib/api';
import { formatPublishedDate, mediaKindLabel } from '@/lib/publicPortal';
import { failureMessage } from '@/lib/userMessages';
import type { MediaPost } from '@/domains/media/types';

const postShellClass = 'mx-auto w-[85%] py-16';

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<MediaPost | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const slug = params?.slug;

  useEffect(() => {
    if (!slug) return;
    apiFetch<MediaPost[]>('/media')
      .then((items) => setPost(items.find((item) => item.slug === slug && item.status === 'published') ?? null))
      .catch(() => setLoadError(true));
  }, [slug]);

  if (post === undefined) {
    return (
      <div className={postShellClass}>
        <MusicLoader />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={postShellClass}>
        <p className="text-[var(--muted)]">{failureMessage(undefined, 'Não foi possível carregar o post.')}</p>
        <Link href="/blog" className="mt-4 inline-flex min-h-11 items-center text-[var(--color-brand-strong)]">
          Voltar ao blog
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={postShellClass}>
        <h1 className="text-2xl font-semibold">Conteúdo não encontrado</h1>
        <Link href="/blog" className="mt-4 inline-flex min-h-11 items-center text-[var(--color-brand-strong)]">
          Voltar ao blog
        </Link>
      </div>
    );
  }

  const published = formatPublishedDate(post.publishedAt ?? post.createdAt);

  return (
    <article className="mx-auto w-[85%] py-10 md:py-14">
      <Link
        href="/blog"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--color-brand-strong)] no-underline hover:underline"
      >
        <span className="material-icons text-lg" aria-hidden>
          arrow_back
        </span>
        Blog
      </Link>

      <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        {mediaKindLabel(post.kind)}
        {published ? ` · ${published}` : ''}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{post.title}</h1>
      {post.excerpt ? <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">{post.excerpt}</p> : null}

      {post.coverUrl ? (
        <Image
          src={post.coverUrl}
          alt=""
          width={1200}
          height={800}
          className="mx-auto mt-8 h-auto max-h-[28rem] w-auto max-w-full rounded-2xl shadow-[var(--shadow-soft)] sm:max-w-4xl"
          sizes="(max-width: 768px) 85vw, 896px"
          priority
        />
      ) : null}

      <PostBlocks blocks={readBlocks(post)} />

      <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">Explore mais conteúdo público da banda.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/blog" className="btn-outline-primary min-h-11 px-4 text-sm">
            Mais publicações
          </Link>
          <Link href="/agenda" className="btn-primary min-h-11 px-4 text-sm">
            Agenda
          </Link>
        </div>
      </div>
    </article>
  );
}
