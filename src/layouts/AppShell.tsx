"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { roleLabels } from '@/core/auth/roles';
import { getAuthenticatedNavGroups, titleForPath, type AuthenticatedNavGroup } from '@/core/navigation/menus';
import { UserAvatar } from '@/components/auth/UserAvatar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [desktop, setDesktop] = useState(false);
  const [sidenavCollapsed, setSidenavCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [desktopUserMenuOpen, setDesktopUserMenuOpen] = useState(false);
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const auth = useAuth();
  const { theme, setTheme } = useTheme();
  const navGroups = getAuthenticatedNavGroups(auth.roles, auth.permissions);

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
      const target = event.target as Element;
      if (userMenuOpen && !target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
      if (desktopUserMenuOpen && !target.closest('.desktop-user-menu')) {
        setDesktopUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, desktopUserMenuOpen]);

  useEffect(() => {
    if (sidenavCollapsed) setDesktopUserMenuOpen(false);
  }, [sidenavCollapsed]);

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
      aria-label={label}
      aria-current={isActiveRoute(href) ? 'page' : undefined}
    >
      <span className="material-icons text-2xl w-6 flex-shrink-0" aria-hidden>
        {icon}
      </span>
      {!sidenavCollapsed && <span className="text-sm">{label}</span>}
    </Link>
  );

  const NavGroupHeading = ({
    group,
    isFirst,
    mobile,
  }: {
    group: AuthenticatedNavGroup;
    isFirst: boolean;
    mobile: boolean;
  }) => {
    if (mobile || !sidenavCollapsed) {
      return (
        <p
          id={`nav-group-${group.id}`}
          className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40"
        >
          {group.label}
        </p>
      );
    }
    if (isFirst) return null;
    return <div className="mx-2 my-1 h-px bg-white/15" role="presentation" aria-hidden />;
  };

  const renderNavGroups = (onNavigate?: () => void, mobile = false) =>
    navGroups.map((group, groupIndex) => (
      <div
        key={group.id}
        role="group"
        aria-labelledby={!mobile && sidenavCollapsed ? undefined : `nav-group-${group.id}`}
      >
        <NavGroupHeading group={group} isFirst={groupIndex === 0} mobile={mobile} />
        {group.items.map((item) =>
          mobile ? (
            <Link
              key={`${group.id}-${item.href}`}
              href={item.href}
              className={`flex min-h-12 items-center gap-3 px-4 text-sm no-underline hover:no-underline ${
                isActiveRoute(item.href) ? 'bg-white/10 font-semibold text-[var(--color-brand)]' : 'text-[var(--sidebar-fg)]'
              }`}
              aria-label={item.label}
              aria-current={isActiveRoute(item.href) ? 'page' : undefined}
              onClick={onNavigate}
            >
              <span className="material-icons" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ) : (
            <NavLink key={`${group.id}-${item.href}`} {...item} />
          ),
        )}
      </div>
    ));

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
        <nav className="flex-1 overflow-y-auto py-2">{renderNavGroups()}</nav>
        {desktop && auth.user ? (
          <div className="desktop-user-menu relative mx-2 mb-2 border-t border-[var(--sidebar-border)] pt-2">
            <button
              type="button"
              className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/10 ${
                sidenavCollapsed ? 'justify-center' : ''
              }`}
              aria-expanded={desktopUserMenuOpen}
              aria-controls="desktop-user-submenu"
              onClick={() => setDesktopUserMenuOpen((open) => !open)}
            >
              <UserAvatar url={auth.user.pictureUrl} name={auth.user.name} className="h-10 w-10 shrink-0 text-[40px] leading-none" />
              {!sidenavCollapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--sidebar-fg)]">
                    {auth.displayName ?? auth.user.name}
                  </span>
                  <span className="material-icons text-xl text-[var(--sidebar-fg)]" aria-hidden>
                    {desktopUserMenuOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </>
              ) : (
                <span className="sr-only">Conta</span>
              )}
            </button>
            {desktopUserMenuOpen && !sidenavCollapsed ? (
              <div id="desktop-user-submenu" className="mb-1 space-y-0.5 pl-3" role="menu">
                <Link
                  href="/profile"
                  role="menuitem"
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[var(--sidebar-fg)] no-underline hover:bg-white/10 hover:no-underline"
                  onClick={() => setDesktopUserMenuOpen(false)}
                >
                  <span className="material-icons text-xl" aria-hidden>
                    person
                  </span>
                  Perfil
                </Link>
                <Link
                  href="/settings"
                  role="menuitem"
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[var(--sidebar-fg)] no-underline hover:bg-white/10 hover:no-underline"
                  onClick={() => setDesktopUserMenuOpen(false)}
                >
                  <span className="material-icons text-xl" aria-hidden>
                    settings
                  </span>
                  Configurações
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[var(--sidebar-fg)] hover:bg-white/10"
                  onClick={() => {
                    setDesktopUserMenuOpen(false);
                    void auth.logout();
                    router.push('/');
                  }}
                >
                  <span className="material-icons text-xl" aria-hidden>
                    logout
                  </span>
                  Sair
                </button>
              </div>
            ) : null}
            {desktopUserMenuOpen && sidenavCollapsed ? (
              <div
                id="desktop-user-submenu"
                className="absolute bottom-0 left-[calc(100%+0.5rem)] z-[110] min-w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
                role="menu"
              >
                <Link
                  href="/profile"
                  role="menuitem"
                  className="flex min-h-11 items-center gap-3 px-4 text-sm text-[var(--foreground)] no-underline hover:bg-[var(--accent)] hover:no-underline"
                  onClick={() => setDesktopUserMenuOpen(false)}
                >
                  Perfil
                </Link>
                <Link
                  href="/settings"
                  role="menuitem"
                  className="flex min-h-11 items-center gap-3 px-4 text-sm text-[var(--foreground)] no-underline hover:bg-[var(--accent)] hover:no-underline"
                  onClick={() => setDesktopUserMenuOpen(false)}
                >
                  Configurações
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-[var(--foreground)] hover:bg-[var(--accent)]"
                  onClick={() => {
                    setDesktopUserMenuOpen(false);
                    void auth.logout();
                    router.push('/');
                  }}
                >
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
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
            <nav className="overflow-y-auto py-2">{renderNavGroups(() => setMoreOpen(false), true)}</nav>
          </aside>
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
