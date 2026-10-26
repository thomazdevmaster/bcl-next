'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MusicLoader } from '@/components/MusicLoader';
import { useAuth } from '@/contexts/AuthContext';

const AUTH_ENTRY_PATHS = new Set(['/login', '/cadastro']);

/**
 * Cobre a tela durante login/cadastro com Google até a rota pós-login renderizar.
 */
export function GoogleSignInOverlay() {
  const { googleSignInPending, isLoggedIn, dismissGoogleSignInPending } = useAuth();
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    if (!googleSignInPending || !isLoggedIn) return;
    if (!AUTH_ENTRY_PATHS.has(pathname)) {
      dismissGoogleSignInPending();
    }
  }, [googleSignInPending, isLoggedIn, pathname, dismissGoogleSignInPending]);

  if (!googleSignInPending) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-[var(--background)] px-4"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <MusicLoader label="Entrando com Google…" />
    </div>
  );
}
