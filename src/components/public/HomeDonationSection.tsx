'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import type { DonationsSection } from '@/domains/homepage/types';

interface HomeDonationSectionProps {
  section: DonationsSection;
  className?: string;
}

const DONATION_ILLUSTRATION = '/imgs/pix-doacao-illustration.jpg';
const STEPS = ['Abra o app do seu banco', 'Escaneie o QR Code ou cole a chave'] as const;

function isStaticPublicAsset(src: string): boolean {
  return src.startsWith('/imgs/') || src.startsWith('/uploads/');
}

function CopyPixButton({
  copied,
  label,
  onClick,
}: {
  copied: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn-primary inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 px-4 text-sm font-semibold transition-[transform,box-shadow] active:scale-[0.98] motion-reduce:active:scale-100 min-[701px]:w-auto ${copied ? 'ring-2 ring-[var(--color-brand)] ring-offset-2 ring-offset-[var(--card)]' : ''}`}
      onClick={onClick}
      aria-live="polite"
    >
      <span className="material-icons text-lg" aria-hidden>
        {copied ? 'check_circle' : 'content_copy'}
      </span>
      {copied ? 'Chave copiada' : label}
    </button>
  );
}

export function HomeDonationSection({ section, className = '' }: HomeDonationSectionProps) {
  const [copied, setCopied] = useState(false);
  const pixKey = section.pixKey.trim();
  const bodyParagraphs = section.body.split(/\n\n+/).filter((paragraph) => paragraph.trim());
  const hint = section.qrHint.trim();

  const copyPix = useCallback(async () => {
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }, [pixKey]);

  return (
    <section
      id="apoie-a-banda"
      data-home-section="donations"
      className={`relative scroll-mt-24 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_28%,var(--border))] bg-[var(--card)] shadow-[var(--shadow-soft)] ${className}`}
      aria-labelledby="home-donations-title"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={DONATION_ILLUSTRATION}
          alt=""
          fill
          className="object-cover object-[center_40%]"
          sizes="100vw"
          unoptimized
        />
      </div>
      <div
        data-donation-curtain
        className="pointer-events-none absolute inset-0 bg-[color-mix(in_srgb,var(--card)_75%,transparent)]"
        aria-hidden
      />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8 min-[961px]:px-10 min-[961px]:py-10">
        {section.eyebrow.trim() ? (
          <p className="m-0 inline-flex min-h-11 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--card))] px-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-brand-strong)]">
            <span className="material-icons text-base" aria-hidden>
              favorite
            </span>
            {section.eyebrow}
          </p>
        ) : null}
        <h2
          id="home-donations-title"
          className="mt-3 max-w-[28em] text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--foreground)] min-[961px]:text-[2.15rem]"
        >
          {section.title}
        </h2>

        <div className="mt-6 space-y-3 text-base leading-[1.7] text-[color-mix(in_srgb,var(--foreground)_88%,var(--muted))]">
          {bodyParagraphs.map((paragraph, index) => (
            <p key={index} className="m-0">
              {paragraph}
            </p>
          ))}
        </div>

        <div
          data-donation-pix-grid
          className="mt-6 grid grid-cols-1 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] p-4 sm:p-5 min-[701px]:grid-cols-[minmax(0,1fr)_minmax(168px,200px)] min-[701px]:gap-8"
        >
          <div className="min-w-0">
            <div className="flex flex-col gap-4 min-[701px]:flex-row min-[701px]:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--card))] text-[var(--color-brand-strong)]"
                  aria-hidden
                >
                  <span className="material-icons text-[22px]">account_balance</span>
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {section.pixKeyLabel}
                  </p>
                  <p className="mt-1 break-all font-mono text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">
                    {pixKey}
                  </p>
                </div>
              </div>
              <CopyPixButton
                copied={copied}
                label={section.copyButtonLabel}
                onClick={() => void copyPix()}
              />
            </div>
            <div className="mt-4 flex flex-col gap-2 min-[701px]:flex-row min-[701px]:flex-wrap min-[701px]:gap-x-8">
              {STEPS.map((step, index) => (
                <p key={step} className="m-0 flex items-center gap-2 text-sm leading-snug text-[var(--foreground)]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--color-brand-strong)]">
                    {index + 1}
                  </span>
                  {step}
                </p>
              ))}
            </div>
            {hint ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--muted)]">{hint}</p>
            ) : null}
          </div>

          <div className="mx-auto w-full max-w-[200px] min-[701px]:mx-0 min-[701px]:max-w-none">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-[var(--border)] bg-white p-2">
              <Image
                src={section.qrCodeUrl}
                alt={section.qrCodeAlt}
                fill
                className="object-contain"
                sizes="200px"
                unoptimized={isStaticPublicAsset(section.qrCodeUrl)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
