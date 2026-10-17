'use client';

import { useCallback, useLayoutEffect, useRef, useState, type TransitionEvent } from 'react';
import Image from 'next/image';

const LOGO_WIDTH = 306;
const LOGO_HEIGHT = 270;
const MAIN_ANIM_MS = 3600;
const MORPH_MS = 900;

type IntroPhase = 'visible' | 'morph' | 'exit' | 'hidden';

interface PortalIntroSplashProps {
  playKey: number;
}

export function releasePortalIntroLock() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('portal-intro-pending', 'portal-intro-active');
  document.documentElement.style.background = '';
  document.body.classList.remove('overflow-x-hidden');
}

export function PortalIntroSplash({ playKey }: PortalIntroSplashProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<IntroPhase>('visible');
  const [playMotion, setPlayMotion] = useState(false);

  const finishIntro = useCallback(() => {
    releasePortalIntroLock();
    setPhase('hidden');
  }, []);

  const startMorph = useCallback(() => {
    const shell = shellRef.current;
    const hero = document.getElementById('portal-home-hero');
    if (!shell || !hero) {
      finishIntro();
      return;
    }

    const rect = hero.getBoundingClientRect();
    shell.style.position = 'fixed';
    shell.style.inset = 'auto';
    shell.style.margin = '0';
    shell.style.top = '0px';
    shell.style.left = '0px';
    shell.style.width = `${window.innerWidth}px`;
    shell.style.height = `${window.innerHeight}px`;
    shell.style.borderRadius = '0';
    shell.style.opacity = '1';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        shell.style.transition = [
          `top ${MORPH_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          `left ${MORPH_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          `width ${MORPH_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          `height ${MORPH_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          `border-radius ${MORPH_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        ].join(', ');
        // Commit the starting geometry before changing targets, or the browser
        // can skip the transition and never emit the event that unlocks scroll.
        void shell.offsetWidth;
        shell.style.top = `${rect.top}px`;
        shell.style.left = `${rect.left}px`;
        shell.style.width = `${rect.width}px`;
        shell.style.height = `${rect.height}px`;
        shell.style.borderRadius = '1rem';
        document.documentElement.classList.remove('portal-intro-pending');
        document.documentElement.style.background = '';
        setPhase('morph');
      });
    });
  }, [finishIntro]);

  useLayoutEffect(() => {
    document.documentElement.classList.add('portal-intro-active');
    document.body.classList.add('overflow-x-hidden');
    setPlayMotion(true);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(startMorph, reduced ? 500 : MAIN_ANIM_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [playKey, startMorph]);

  const handleShellTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    const shell = shellRef.current;
    if (!shell || event.target !== shell) return;

    if (phase === 'morph' && event.propertyName === 'height') {
      shell.style.transition = 'opacity 320ms ease-out';
      shell.style.opacity = '0';
      setPhase('exit');
      return;
    }

    if (phase === 'exit' && event.propertyName === 'opacity') {
      finishIntro();
    }
  };

  if (phase === 'hidden') {
    return null;
  }

  return (
    <div
      ref={shellRef}
      className={`portal-intro-splash bg-black${playMotion ? ' portal-intro-splash--play' : ''}${phase === 'morph' || phase === 'exit' ? ' portal-intro-splash--morph' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-intro-title"
      aria-describedby="portal-intro-desc"
      onTransitionEnd={handleShellTransitionEnd}
    >
      <div className="portal-intro-splash__bg" aria-hidden>
        <Image
          src="/imgs/img1.jpg"
          alt=""
          fill
          className="portal-intro-splash__bg-photo object-cover"
          priority
          sizes="100vw"
        />
        <div className="portal-intro-splash__scrim" />
        <div className="portal-intro-splash__veil" />
      </div>

      <div className="portal-intro-splash__content">
        <div className="portal-intro-splash__logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- proporção exata do PNG, sem crop do Image */}
          <img
            src="/assets/logo.png"
            alt=""
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="portal-intro-splash__logo"
            decoding="sync"
          />
        </div>
        <p id="portal-intro-desc" className="portal-intro-splash__eyebrow">
          Luminárias · Minas Gerais
        </p>
        <h1 id="portal-intro-title" className="portal-intro-splash__title">
          Banda Carmelitana Luminarense
        </h1>
      </div>

      <button type="button" className="portal-intro-splash__skip" onClick={startMorph}>
        Entrar no portal
      </button>
    </div>
  );
}
