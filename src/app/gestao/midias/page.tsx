'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DomainGuard } from '@/components/domain/DomainGuard';
import { parseMediaPost } from '@/domains/media/blocks';
import { mediaKindLabel } from '@/lib/publicPortal';
import type { MediaPost } from '@/domains/media/types';
import { apiFetch } from '@/lib/api';
import { failureMessage } from '@/lib/userMessages';

export default function MidiasPage() {
  return (
    <DomainGuard resource="media">
      <PostList />
    </DomainGuard>
  );
}

function PostList() {
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<unknown[]>('/media')
      .then((items) => setPosts(items.flatMap((item) => {
        const post = parseMediaPost(item);
        return post ? [post] : [];
      })))
      .catch((caught: unknown) => setError(failureMessage(caught, 'Não foi possível carregar os posts.')));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Blog</p>
          <h1 className="mt-2 text-3xl font-semibold">Posts</h1>
          <p className="mt-2 text-[var(--muted)]">Crie matérias com texto, fotos, vídeos e áudios, na ordem da publicação.</p>
        </div>
        <Link href="/gestao/midias/novo" className="btn-primary inline-flex min-h-11 items-center px-4">
          Novo post
        </Link>
      </div>
      {error ? <p className="mt-4 text-sm text-[var(--destructive)]">{error}</p> : null}
      <ul className="mt-6 space-y-3">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/gestao/midias/${post.id}`}
              className="flex min-h-16 flex-col justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 no-underline hover:no-underline"
            >
              <span className="font-semibold text-[var(--foreground)]">{post.title || 'Sem título'}</span>
              <span className="text-sm text-[var(--muted)]">
                {mediaKindLabel(post.kind)} · {post.status === 'published' ? 'Publicado' : 'Rascunho'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
