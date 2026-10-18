'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BlogPostCard } from '@/components/public/BlogPostCard';
import { PresentationEventCard } from '@/components/public/PresentationEventCard';
import { PublicSectionHeading } from '@/components/public/PublicSectionHeading';
import type { HomepageDocument, HomeSection } from '@/domains/homepage/types';
import type { MediaPost } from '@/domains/media/types';
import type { Presentation } from '@/domains/presentations/types';
import { upcomingPublicPresentations, publishedMediaPosts } from '@/lib/publicPortal';
import { HomeDonationSection } from '@/components/public/HomeDonationSection';
import { failureMessage } from '@/lib/userMessages';

interface HomePageContentProps {
  document: HomepageDocument;
  events: Presentation[];
  posts: MediaPost[];
  portalError: boolean;
  isLoggedIn: boolean;
  showEditorLink: boolean;
  postOrder?: string[];
  proposal?: string;
}

const LINK_ICONS = ['event', 'article', 'info'] as const;
const sectionClass = 'mb-[42px] md:mb-16';
const fullWidthSectionClass = `${sectionClass} min-[961px]:col-span-full`;

export function HomePageContent({
  document,
  events,
  posts,
  portalError,
  isLoggedIn,
  showEditorLink,
  postOrder = [],
  proposal,
}: HomePageContentProps) {
  const router = useRouter();
  const visible = document.sections.filter((section) => section.enabled);
  const hero = visible.find((section) => section.type === 'hero');
  const rest = visible.filter((section) => section.type !== 'hero');
  const onCta = () => router.push(isLoggedIn ? '/gestao' : '/login');
  const showDonationLink = visible.some((section) => section.type === 'donations');

  return (
    <div className="w-full pt-[30px] md:pt-9" data-proposal={proposal}>
      {hero ? (
        <HomeSectionBlock
          section={hero}
          events={events}
          posts={posts}
          portalError={portalError}
          isLoggedIn={isLoggedIn}
          onCta={onCta}
          postOrder={postOrder}
          showDonationLink={showDonationLink}
        />
      ) : null}

      <div data-home-content="true" className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-y-0 px-4 pb-[38px] md:px-[22px] md:pb-[58px] min-[961px]:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] min-[961px]:gap-x-6 min-[961px]:px-7">
        {showEditorLink ? (
          <div className="col-span-full mb-4 flex justify-end">
            <Link href="/gestao/home" className="btn-outline-primary inline-flex min-h-11 items-center gap-2 px-4 text-sm">
              <span className="material-icons text-lg" aria-hidden>
                edit
              </span>
              Editar página inicial
            </Link>
          </div>
        ) : null}
        {rest.map((section) => (
          <HomeSectionBlock
            key={section.type}
            section={section}
            events={events}
            posts={posts}
            portalError={portalError}
            isLoggedIn={isLoggedIn}
            onCta={onCta}
            postOrder={postOrder}
          />
        ))}
      </div>
    </div>
  );
}

function HomeSectionBlock({
  section,
  events,
  posts,
  portalError,
  isLoggedIn,
  onCta,
  postOrder,
  showDonationLink = false,
}: {
  section: HomeSection;
  events: Presentation[];
  posts: MediaPost[];
  portalError: boolean;
  isLoggedIn: boolean;
  onCta: () => void;
  postOrder: string[];
  showDonationLink?: boolean;
}) {
  if (section.type === 'hero') {
    const agendaIndex = section.links.findIndex((link) => link.href === '/agenda');
    const primaryIndex = agendaIndex >= 0 ? agendaIndex : 0;

    return (
      <section
        id="portal-home-hero"
        data-home-section="hero"
        className="relative mb-[42px] flex w-full min-h-0 flex-col items-stretch overflow-hidden bg-[var(--header-bg)] transition-opacity duration-300 [html.portal-intro-pending_&]:pointer-events-none [html.portal-intro-pending_&]:opacity-0 [html.portal-intro-active_&]:pointer-events-none [html.portal-intro-active_&]:opacity-0 min-[701px]:min-h-[400px] min-[701px]:flex-row min-[701px]:items-center min-[961px]:min-h-[430px]"
      >
        <div data-home-image="true" className="relative order-first min-h-[250px] w-full shrink-0 overflow-hidden bg-[var(--header-bg)] min-[701px]:absolute min-[701px]:inset-0 min-[701px]:min-h-0 min-[701px]:opacity-50">
          <Image src={section.imageUrl} alt="" fill className="object-cover" priority sizes="(max-width: 700px) 100vw, 42vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--header-bg)_64%,transparent)] to-transparent min-[701px]:bg-gradient-to-r min-[701px]:from-[color-mix(in_srgb,var(--header-bg)_95%,transparent)] min-[701px]:via-[color-mix(in_srgb,var(--header-bg)_72%,transparent)] min-[701px]:to-transparent" />
        </div>
        <div data-home-copy="true" className="relative z-[1] flex w-full max-w-none flex-col items-start justify-center px-5 py-[22px] min-[701px]:px-7 min-[701px]:py-16 min-[961px]:px-[max(2rem,calc((100%_-_72rem)/2))]">
          <p data-home-eyebrow="true" className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--header-fg)]">{section.eyebrow}</p>
          <h1 className="mt-2 max-w-[30ch] text-[clamp(2rem,8vw,2.65rem)] font-bold leading-[1.03] tracking-[-0.03em] text-[var(--header-fg)] min-[701px]:mt-3 min-[701px]:text-[clamp(2.25rem,4.5vw,3.5rem)] min-[701px]:font-extrabold">
            {section.title}
          </h1>
          <p data-home-subtitle="true" className="mt-3 max-w-[52ch] text-[0.9375rem] leading-[1.65] text-[var(--header-fg)] min-[701px]:mt-4 min-[701px]:text-base">{section.subtitle}</p>
          <div data-home-actions="true" className="mt-[17px] grid w-full gap-1 min-[701px]:mt-6 min-[701px]:flex min-[701px]:w-auto min-[701px]:flex-wrap min-[701px]:gap-x-4 min-[701px]:gap-y-2">
            {section.links.map((link, index) =>
              link.label.trim() ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    index === primaryIndex
                      ? 'btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-[18px] text-sm font-semibold text-[var(--color-ink)] min-[701px]:text-[0.875rem]'
                      : 'inline-flex min-h-11 items-center justify-start gap-2 rounded-[var(--radius)] px-2 text-sm font-semibold text-[var(--header-fg)] underline decoration-1 underline-offset-4 min-[701px]:justify-center'
                  }
                  data-home-primary={index === primaryIndex ? 'true' : undefined}
                >
                  <span className="material-icons text-lg" aria-hidden>
                    {LINK_ICONS[index] ?? 'arrow_forward'}
                  </span>
                  {link.label}
                </Link>
              ) : null,
            )}
            {showDonationLink ? (
              <Link
                href="#apoie-a-banda"
                className="inline-flex min-h-11 items-center justify-start gap-2 rounded-[var(--radius)] px-2 text-sm font-semibold text-[var(--header-fg)] underline decoration-1 underline-offset-4 min-[701px]:justify-center"
              >
                <span className="material-icons text-lg" aria-hidden>
                  favorite
                </span>
                Apoie a banda
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === 'highlights') {
    return (
      <section data-home-section="highlights" className={`${fullWidthSectionClass} grid grid-cols-1 gap-0 border-y border-[var(--border)] sm:grid-cols-3`}>
        {section.items.map((item) => (
          <div
            key={`${item.value}-${item.label}`}
            data-home-highlight="true"
            className="flex min-h-[74px] items-center gap-4 border-b border-[var(--border)] px-4 py-[14px] last:border-b-0 sm:min-h-[94px] sm:border-b-0 sm:border-r sm:px-[22px] sm:py-[18px] sm:last:border-r-0"
          >
            <p className="m-0 text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold leading-none text-[var(--home-accent-text)]">{item.value}</p>
            <span className="max-w-[18ch] text-sm leading-[1.4] text-[var(--muted)]">{item.label}</span>
          </div>
        ))}
      </section>
    );
  }

  if (section.type === 'events') {
    const upcoming = upcomingPublicPresentations(events, section.limit);
    return (
      <section data-home-section="events" className={`${sectionClass} min-[961px]:col-start-1`}>
        <PublicSectionHeading
          title={section.title}
          description={section.description}
          href="/agenda"
          linkLabel={section.linkLabel}
        />
        {portalError ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--muted)]">
            {failureMessage(undefined, 'Não foi possível carregar os eventos agora.')}
          </p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <p className="text-[var(--muted)]">Nenhum evento público agendado no momento.</p>
          </div>
        ) : (
          <div data-home-event-grid="true" className="grid grid-cols-1 items-stretch gap-3">
            {upcoming.map((event) => (
              <PresentationEventCard key={event.id} event={event} compact layout="home" />
            ))}
          </div>
        )}
      </section>
    );
  }

  if (section.type === 'blog') {
    const visiblePosts = publishedMediaPosts(posts, postOrder).slice(0, section.limit);
    return (
      <section data-home-section="blog" className={`${sectionClass} min-[961px]:col-start-2`}>
        <PublicSectionHeading
          title={section.title}
          description={section.description}
          href="/blog"
          linkLabel={section.linkLabel}
        />
        {visiblePosts.length === 0 && !portalError ? (
          <p className="text-[var(--muted)]">Em breve novas publicações.</p>
        ) : (
          <div data-home-post-grid="true" className="grid grid-cols-1 gap-3">
            {visiblePosts.map((post, index) => (
              <BlogPostCard key={post.id} post={post} featured={index === 0} layout="home" />
            ))}
          </div>
        )}
      </section>
    );
  }

  if (section.type === 'story') {
    return (
      <section data-home-section="story" className={`${fullWidthSectionClass} grid grid-cols-1 items-center gap-[22px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-[21px] shadow-[var(--shadow-soft)] sm:p-7 min-[701px]:gap-6 min-[961px]:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] min-[961px]:gap-[clamp(24px,6vw,76px)]`}>
        <div data-home-story-copy="true">
          <h2 className="m-0 max-w-[16ch] text-[1.875rem] font-semibold leading-[1.1] tracking-[-0.03em] min-[961px]:text-[clamp(1.875rem,2.7vw,2.25rem)]">{section.title}</h2>
          <p className="mt-4 whitespace-pre-line leading-[1.7] text-[var(--muted)]">{section.body}</p>
          <Link
            href="/sobre"
            className="mt-6 inline-flex min-h-11 items-center gap-1 font-medium text-[var(--color-brand-strong)] no-underline hover:underline"
          >
            {section.linkLabel}
            <span className="material-icons text-lg" aria-hidden>
              arrow_forward
            </span>
          </Link>
        </div>
        <div data-home-gallery="true" className="grid grid-cols-[1.15fr_0.85fr] grid-rows-[repeat(2,minmax(100px,28vw))] gap-2 min-[701px]:grid-rows-[repeat(2,145px)]">
          {section.images.map((image) => (
            <div key={image.src} className="relative min-h-0 overflow-hidden rounded-xl first:row-span-2">
              <Image src={image.src} alt={image.alt} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'videos') {
    const ids = section.videoIds.slice(0, section.limit);
    return (
      <section data-home-section="videos" className={fullWidthSectionClass}>
        <PublicSectionHeading title={section.title} description={section.description} />
        <div className="grid grid-cols-1 gap-[14px] min-[701px]:grid-cols-3 min-[701px]:gap-[18px]">
          {ids.map((id, index) => (
            <div key={id} className="relative aspect-video overflow-hidden rounded-xl bg-[var(--color-ink)] shadow-[var(--shadow-soft)]">
              <iframe
                src={`https://www.youtube.com/embed/${id}`}
                title={`Vídeo ${index + 1} — Banda Carmelitana`}
                className="h-full w-full border-0"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === 'donations') {
    return <HomeDonationSection section={section} className={fullWidthSectionClass} />;
  }

  if (section.type !== 'cta') return null;

  return (
    <section data-home-section="cta" className={`${fullWidthSectionClass} flex flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-6 text-[var(--foreground)] sm:p-7 min-[701px]:flex-row min-[701px]:items-center`}>
      <div>
        <h2 className="m-0 text-2xl text-[var(--foreground)]">{isLoggedIn ? section.titleLoggedIn : section.titleLoggedOut}</h2>
        <p className="mt-2 max-w-[58ch] leading-6 text-[var(--muted)]">{isLoggedIn ? section.bodyLoggedIn : section.bodyLoggedOut}</p>
      </div>
      <button type="button" className="btn-primary min-h-[46px] shrink-0 px-5" onClick={onCta}>
        {isLoggedIn ? section.buttonLoggedIn : section.buttonLoggedOut}
      </button>
    </section>
  );
}
