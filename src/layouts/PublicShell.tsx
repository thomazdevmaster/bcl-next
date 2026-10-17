'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { PUBLIC_NAV } from '@/core/navigation/menus';

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const menuOpen = openOnPath === pathname;
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenOnPath(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-[var(--sidebar-border)] bg-[var(--header-bg)] text-[var(--header-fg)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2.5 text-[var(--header-fg)] no-underline hover:no-underline md:flex-none"
          >
            <Image src="/assets/logo.png" alt="" width={306} height={270} className="h-10 w-10 shrink-0 object-contain" />
            <span className="truncate text-sm font-semibold tracking-tight sm:text-base">Banda Carmelitana</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Páginas públicas">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm no-underline hover:no-underline ${
                  isActive(item.href)
                    ? 'bg-[var(--color-brand)] text-[var(--color-ink)]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="btn-primary hidden min-h-11 shrink-0 px-4 md:inline-flex"
            onClick={() => router.push('/login')}
          >
            Entrar
          </button>

          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpenOnPath((current) => (current === pathname ? null : pathname))}
          >
            <span className="material-icons block w-7 shrink-0 overflow-hidden text-center text-[28px] leading-none" aria-hidden>
              {menuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[80] bg-black/50 md:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpenOnPath(null)}
        />
      ) : null}

      <nav
        id={menuId}
        className={`fixed top-0 right-0 z-[90] flex h-[100dvh] w-[min(88vw,20rem)] flex-col bg-[var(--header-bg)] text-[var(--header-fg)] shadow-[var(--shadow-soft)] transition-transform duration-200 md:hidden ${
          menuOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
        aria-label="Menu do portal"
        aria-hidden={!menuOpen}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 pt-[env(safe-area-inset-top)]">
          <span className="font-semibold">Menu</span>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full"
            aria-label="Fechar menu"
            onClick={() => setOpenOnPath(null)}
          >
            <span className="material-icons" aria-hidden>
              close
            </span>
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-base no-underline hover:no-underline ${
                isActive(item.href) ? 'bg-[var(--color-brand)] font-semibold text-[var(--color-ink)]' : 'text-white/90'
              }`}
              onClick={() => setOpenOnPath(null)}
            >
              <span className="material-icons text-2xl" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" className="btn-primary min-h-12 w-full" onClick={() => router.push('/login')}>
            Entrar na área interna
          </button>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--border)] bg-[var(--card)] py-8 text-sm text-[var(--muted)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:justify-between">
          <div>
            <p className="font-semibold text-[var(--foreground)]">Banda Carmelitana Luminarense</p>
            <p className="mt-2 max-w-sm">Portal público · Luminárias, Minas Gerais</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-6 gap-y-1 sm:flex sm:flex-wrap" aria-label="Links do portal">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center text-[var(--muted)] no-underline hover:text-[var(--foreground)]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center font-medium text-[var(--color-brand-strong)] no-underline"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
