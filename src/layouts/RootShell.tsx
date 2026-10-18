'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PortalIntroSplash, releasePortalIntroLock } from '@/components/public/PortalIntroSplash';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/layouts/AppShell';
import { PublicShell } from '@/layouts/PublicShell';

export function RootShell({ children }: { children: ReactNode }) {
  const { isLoggedIn, isHydrated } = useAuth();
  const pathname = usePathname() ?? '/';
  const forcePublic = pathname === '/login';
  // Só na carga inicial da home (entrar no site em / ou F5 em /).
  const [showHomeIntro, setShowHomeIntro] = useState(() => pathname === '/');

  useEffect(() => {
    if (pathname !== '/') {
      setShowHomeIntro(false);
      releasePortalIntroLock();
    }
  }, [pathname]);

  const shell = !isHydrated ? (
    <div className="min-h-[100dvh] bg-[var(--background)]" aria-busy="true" />
  ) : !isLoggedIn || forcePublic ? (
    <PublicShell>{children}</PublicShell>
  ) : (
    <AppShell>{children}</AppShell>
  );

  return (
    <>
      {showHomeIntro ? <PortalIntroSplash playKey={1} /> : null}
      {shell}
    </>
  );
}
