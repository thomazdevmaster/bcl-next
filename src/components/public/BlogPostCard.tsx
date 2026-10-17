import Image from 'next/image';
import Link from 'next/link';
import { formatPublishedDate, mediaKindLabel } from '@/lib/publicPortal';
import type { MediaPost } from '@/domains/media/types';

interface BlogPostCardProps {
  post: MediaPost;
  featured?: boolean;
  layout?: 'default' | 'home';
}

export function BlogPostCard({ post, featured = false, layout = 'default' }: BlogPostCardProps) {
  const published = formatPublishedDate(post.publishedAt ?? post.createdAt);
  const homeLayout = layout === 'home';

  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className={`group grid overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] no-underline hover:no-underline ${homeLayout ? 'min-h-[110px] grid-cols-[98px_minmax(0,1fr)] md:min-h-[102px] md:grid-cols-[120px_minmax(0,1fr)]' : 'md:grid-cols-2'}`}
      >
        {post.coverUrl ? (
          <div className={`relative ${homeLayout ? 'min-h-[110px] w-[98px] md:min-h-[102px] md:w-[120px]' : 'min-h-[220px] md:min-h-full'}`}>
            <Image
              src={post.coverUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        ) : (
          <div className={`relative flex items-center justify-center bg-[var(--accent)] text-[var(--color-brand-strong)] ${homeLayout ? 'min-h-[110px] w-[98px] md:min-h-[102px] md:w-[120px]' : 'min-h-[220px] md:min-h-full'}`} aria-hidden>
            <span className="material-icons text-6xl">article</span>
          </div>
        )}
        <div className={`flex min-w-0 flex-col justify-center ${homeLayout ? 'p-3 md:px-3.5 md:py-3' : 'p-6 md:p-8'}`}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand-strong)]">
            {mediaKindLabel(post.kind)}
            {published ? ` · ${published}` : ''}
          </p>
          <h2 className={`font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--color-brand-strong)] ${homeLayout ? 'mt-1 text-base leading-tight' : 'mt-2 text-2xl md:text-3xl'}`}>
            {post.title}
          </h2>
          <p className={`${homeLayout ? 'mt-1 line-clamp-2 text-xs leading-[1.4]' : 'mt-3 line-clamp-3'} text-[var(--muted)]`}>{post.excerpt}</p>
          <span className={`inline-flex items-center gap-1 font-medium text-[var(--color-brand-strong)] ${homeLayout ? 'mt-[5px] min-h-9 text-xs' : 'mt-5 min-h-11 text-sm'}`}>
            Ler agora
            <span className="material-icons text-lg" aria-hidden>
              arrow_forward
            </span>
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] no-underline hover:no-underline ${homeLayout ? 'grid min-h-[138px] grid-cols-[minmax(0,1fr)_108px] md:grid-cols-[minmax(0,1fr)_minmax(104px,32%)]' : 'flex h-full flex-col'}`}
    >
      {post.coverUrl ? (
        <div className={`relative w-full shrink-0 ${homeLayout ? 'col-start-2 row-start-1 h-full min-h-[138px]' : 'h-44'}`}>
          <Image
            src={post.coverUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div className={`flex items-center justify-center bg-[var(--accent)] text-[var(--color-brand-strong)] ${homeLayout ? 'col-start-2 row-start-1 h-full min-h-[138px]' : 'h-44'}`} aria-hidden>
          <span className="material-icons text-5xl">article</span>
        </div>
      )}
      <div className={`flex min-w-0 flex-col ${homeLayout ? 'col-start-1 row-start-1 justify-center p-[15px]' : 'flex-1 p-5'}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand-strong)]">
          {mediaKindLabel(post.kind)}
          {published ? ` · ${published}` : ''}
        </p>
        <h2 className="mt-2 text-xl font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--color-brand-strong)]">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-[var(--muted)]">{post.excerpt}</p>
      </div>
    </Link>
  );
}
