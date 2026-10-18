"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { roleLabels } from '@/core/auth/roles';
import { getManagementNav, PUBLIC_NAV, titleForPath } from '@/core/navigation/menus';
import { UserAvatar } from '@/components/auth/UserAvatar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [desktop, setDesktop] = useState(false);
  const [sidenavCollapsed, setSidenavCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const managementNav = getManagementNav(auth.roles, auth.permissions);
  const primaryNav = managementNav.slice(0, 4);
  const extraNav = managementNav.slice(4);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)');
    const onMediaChange = () => setDesktop(mq.matches);
    const hydrateState = () => {
      setDesktop(mq.matches);
      setSidenavCollapsed(window.localStorage.getItem('app.sidenavCollapsed') === 'true');
    };
    requestAnimationFrame(hydrateState);
    mq.addEventListener('change', onMediaChange);
    return () => mq.removeEventListener('change', onMediaChange);
  }, []);

  useEffect(() => {
    if (!auth.isHydrated || !auth.isLoggedIn) return;
    if (auth.user?.mustChangePassword && pathname !== '/alterar-senha') {
      router.replace('/alterar-senha');
      return;
    }
    if (auth.user?.needsProfileCompletion && pathname !== '/completar-cadastro') {
      router.replace('/completar-cadastro');
    }
  }, [
    auth.isHydrated,
    auth.isLoggedIn,
    auth.user?.mustChangePassword,
    auth.user?.needsProfileCompletion,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (!moreOpen || desktop) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen, desktop]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const contentMargin = desktop ? (sidenavCollapsed ? 56 : 280) : 0;
  const pageTitle = titleForPath(pathname);
  const isActiveRoute = (to: string) => pathname === to || (to !== '/' && pathname.startsWith(to));
  const toggleCollapsed = () => {
    const next = !sidenavCollapsed;
    setSidenavCollapsed(next);
    localStorage.setItem('app.sidenavCollapsed', String(next));
  };

  const NavLink = ({ href, label, icon }: { href: string; label: string; icon: string }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 no-underline hover:no-underline transition-colors ${
        isActiveRoute(href) ? 'bg-white/10 text-[var(--color-brand)] font-semibold' : 'text-[var(--sidebar-fg)]'
      } ${sidenavCollapsed ? 'justify-center px-0' : ''}`}
      title={label}
    >
      <span className="material-icons text-2xl w-6 flex-shrink-0">{icon}</span>
      {!sidenavCollapsed && <span className="text-sm">{label}</span>}
    </Link>
  );

  return (
    <div
      className="relative min-h-screen w-full flex app-shell-container"
      style={{ ['--content-margin' as string]: `${contentMargin}px` }}
    >
      <aside
        className={`fixed left-0 top-0 bottom-0 z-[100] flex flex-col transition-all duration-200 ${
          sidenavCollapsed ? 'w-14 min-w-[3.5rem]' : 'w-[280px]'
        } ${desktop ? '' : 'hidden'}`}
        style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
        aria-label="Navegação"
      >
        <div className={`flex-shrink-0 ${!sidenavCollapsed ? 'px-4 py-4' : 'px-1 py-3'} flex items-center justify-center gap-3`}>
          <Image src="/assets/logo.png" alt="Banda Carmelitana" className="w-12 h-12 rounded-full" width={48} height={48} />
          {!sidenavCollapsed && (
            <div>
              <p className="font-semibold text-[var(--header-fg)] leading-tight">Banda Carmelitana</p>
              <p className="text-xs text-[var(--color-brand)]">{roleLabels(auth.roles)}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {primaryNav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          {!sidenavCollapsed && extraNav.length > 0 && (
            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Gestão</div>
          )}
          {extraNav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          {!sidenavCollapsed && (
            <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Portal</div>
          )}
          {PUBLIC_NAV.map((item) => (
            <NavLink key={`public-${item.href}`} {...item} />
          ))}
        </nav>
        {desktop && auth.user && (
          <Link
            href="/profile"
            className={`mx-2 mb-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 no-underline hover:bg-white/10 hover:no-underline ${
              sidenavCollapsed ? 'justify-center' : ''
            }`}
            title="Meu perfil"
          >
            <UserAvatar url={auth.user.pictureUrl} name={auth.user.name} className="h-10 w-10 shrink-0 text-[40px] leading-none" />
            {!sidenavCollapsed && (
              <span className="min-w-0 truncate text-sm text-[var(--sidebar-fg)]">{auth.displayName ?? auth.user.name}</span>
            )}
          </Link>
        )}
        {desktop && (
          <div className="flex-shrink-0 px-2 py-3 border-t border-[var(--sidebar-border)] flex items-center justify-between">
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--sidebar-fg)] hover:bg-white/10"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label="Alternar tema"
            >
              <span className="material-icons">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--sidebar-fg)] hover:bg-white/10"
              onClick={toggleCollapsed}
              aria-label={sidenavCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              <span className="material-icons">{sidenavCollapsed ? 'chevron_right' : 'chevron_left'}</span>
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {!desktop && (
          <header className="sticky top-0 z-50 flex items-center gap-2 px-4 h-14 bg-[var(--header-bg)] text-[var(--header-fg)]">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white"
              aria-label={moreOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span className="material-icons">menu</span>
            </button>
            <span className="font-semibold text-base">{pageTitle}</span>
            <span className="flex-1" />
            <div className="relative user-menu">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white"
                aria-label="Conta"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <UserAvatar url={auth.user?.pictureUrl} name={auth.user?.name} className="h-9 w-9 text-[28px] leading-none" />
              </button>
              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg z-50 min-w-48">
                  <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-sm" onClick={() => router.push('/profile')}>
                    Perfil
                  </button>
                  <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-sm" onClick={() => router.push('/settings')}>
                    Configurações
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm"
                    onClick={() => {
                      void auth.logout();
                      router.push('/');
                    }}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        {!desktop && moreOpen && (
          <div className="fixed inset-0 bg-black/40 z-[120]" onClick={() => setMoreOpen(false)} aria-hidden />
        )}

        {!desktop && moreOpen && (
          <aside className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[280px] z-[130] flex flex-col" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
            <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-[var(--header-fg)]">
              <span className="font-semibold">Menu</span>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Fechar menu" onClick={() => setMoreOpen(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <nav className="overflow-y-auto py-2">
              {[...managementNav, ...PUBLIC_NAV].map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className="flex min-h-12 items-center gap-3 px-4 text-[var(--sidebar-fg)] no-underline hover:no-underline text-sm"
                  onClick={() => setMoreOpen(false)}
                >
                  <span className="material-icons">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        )}

        {desktop && (
          <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-3 border-b border-[var(--border)] bg-[var(--card)] px-6 ml-[var(--content-margin)]">
            <UserAvatar url={auth.user?.pictureUrl} name={auth.user?.name} className="h-9 w-9 text-[28px] leading-none" />
            <p className="text-sm text-[var(--muted)]">Olá, {auth.displayName}</p>
            <Link href="/profile" className="text-sm no-underline">Perfil</Link>
            <Link href="/settings" className="text-sm no-underline">Configurações</Link>
            <button
              type="button"
              className="text-sm"
              onClick={() => {
                void auth.logout();
                router.push('/');
              }}
            >
              Sair
            </button>
          </header>
        )}

        <main
          className={`flex-1 overflow-x-hidden overflow-y-auto pb-20 ${
            pathname === '/' ? 'px-0 pt-0' : 'px-4 pt-6'
          } ${desktop ? 'ml-[var(--content-margin)]' : ''}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
