'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import type { DonationsSection } from '@/domains/homepage/types';

interface HomeDonationSectionProps {
  section: DonationsSection;
  className?: string;
}

const DONATION_ILLUSTRATION = '/imgs/pix-doacao-illustration.jpg';

function isStaticPublicAsset(src: string): boolean {
  return src.startsWith('/imgs/') || src.startsWith('/uploads/');
}

export function HomeDonationSection({ section, className = '' }: HomeDonationSectionProps) {
  const [copied, setCopied] = useState(false);
  const pixKey = section.pixKey.trim();
  const bodyParagraphs = section.body.split(/\n\n+/).filter((p) => p.trim());

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
      className={`relative scroll-mt-24 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_28%,var(--border))] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] sm:p-8 min-[701px]:p-9 ${className}`}
      aria-labelledby="home-donations-title"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={DONATION_ILLUSTRATION}
          alt=""
          fill
          className="object-cover object-[center_38%] min-[701px]:object-[58%_center]"
          sizes="(max-width: 960px) 100vw, 1320px"
          unoptimized
        />
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--card)_52%,transparent)]" />
      </div>

      <div className="relative grid grid-cols-1 items-start gap-6 min-[701px]:grid-cols-[minmax(0,1fr)_minmax(148px,188px)] min-[701px]:gap-8 min-[961px]:grid-cols-[minmax(0,1fr)_minmax(160px,200px)]">
        <div className="min-w-0">
          {section.eyebrow.trim() ? (
            <p className="m-0 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--border))] bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--card))] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-brand-strong)]">
              <span className="material-icons text-base" aria-hidden>
                favorite
              </span>
              {section.eyebrow}
            </p>
          ) : null}
          <h2
            id="home-donations-title"
            className="mt-4 text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--foreground)] min-[701px]:text-[2.05rem]"
          >
            {section.title}
          </h2>
          <div className="mt-4 space-y-3 text-base leading-[1.75] text-[var(--muted)]">
            {bodyParagraphs.map((paragraph, index) => (
              <p key={index} className="m-0 max-w-[54ch]">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--card-secondary))] text-[var(--color-brand-strong)]"
                aria-hidden
              >
                <span className="material-icons text-[22px]">account_balance</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {section.pixKeyLabel}
                </p>
                <p className="mt-1.5 break-all font-mono text-base font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-lg">
                  {pixKey}
                </p>
              </div>
            </div>
            <button
              type="button"
              className={`btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 text-sm font-semibold transition-[transform,box-shadow] active:scale-[0.98] motion-reduce:active:scale-100 min-[701px]:w-auto ${copied ? 'ring-2 ring-[var(--color-brand)] ring-offset-2 ring-offset-[var(--card)]' : ''}`}
              onClick={() => void copyPix()}
              aria-live="polite"
            >
              <span className="material-icons text-lg" aria-hidden>
                {copied ? 'check_circle' : 'content_copy'}
              </span>
              {copied ? 'Chave copiada' : section.copyButtonLabel}
            </button>
          </div>
        </div>

        <aside className="min-[701px]:pt-1">
          <div className="mx-auto w-full max-w-[200px] min-[701px]:max-w-none">
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--border))] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] p-3 shadow-[var(--shadow-soft)]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_14%,var(--card-secondary))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-brand-strong)]">
                  <span className="material-icons text-sm" aria-hidden>
                    qr_code_scanner
                  </span>
                  Pix
                </span>
                <span className="text-[10px] text-[var(--muted)]">Doação</span>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-[148px] overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_18%,var(--border))] bg-white p-1.5 min-[701px]:max-w-none">
                <Image
                  src={section.qrCodeUrl}
                  alt={section.qrCodeAlt}
                  fill
                  className="object-contain"
                  sizes="160px"
                  unoptimized={isStaticPublicAsset(section.qrCodeUrl)}
                />
              </div>
              <ol className="mt-2.5 space-y-1.5 text-[11px] leading-snug text-[var(--muted)]">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[var(--color-brand-strong)]">
                    1
                  </span>
                  <span>Abra o app do seu banco</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[var(--color-brand-strong)]">
                    2
                  </span>
                  <span>Escaneie o QR Code ou cole a chave</span>
                </li>
              </ol>
            </div>
            {section.qrHint.trim() ? (
              <p className="mt-3 text-center text-xs leading-relaxed text-[var(--muted)] min-[701px]:text-left">
                {section.qrHint}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
