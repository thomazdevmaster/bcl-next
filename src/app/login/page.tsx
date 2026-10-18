'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { postLoginRoute } from '@/core/auth/postLoginRoute';
import { userFacingError } from '@/lib/userMessages';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.isHydrated || !auth.isLoggedIn) return;
    router.replace(auth.user ? postLoginRoute(auth.user) : '/');
  }, [auth.isHydrated, auth.isLoggedIn, auth.user, router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session = await auth.login(identifier, password, keep);
      router.push(postLoginRoute(session));
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setBusy(false);
    }
  };

  const onGoogleCredential = async (credential: string) => {
    setError(null);
    setBusy(true);
    try {
      const session = await auth.loginWithGoogle(credential, keep);
      router.push(postLoginRoute(session));
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-soft)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Acesso interno</p>
        <h1 className="mt-2 text-3xl font-semibold">Entrar</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Entre com seu nome de usuário ou e-mail e a senha da banda.
        </p>

        <div className="mt-8">
          <GoogleSignInButton text="signin_with" onCredential={(credential) => void onGoogleCredential(credential)} disabled={busy} />
        </div>
        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]" aria-hidden="true">
          <span className="h-px flex-1 bg-[var(--border)]" />
          ou
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Usuário ou e-mail
            <input
              className="min-h-11 w-full"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              type="text"
              placeholder="nome.sobrenome ou voce@exemplo.com"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Senha
            <input
              className="min-h-11 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Sua senha"
              autoComplete="current-password"
              required
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            Manter conectado
          </label>
          {error && (
            <p className="text-sm text-[var(--destructive)]" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary min-h-11 w-full" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <div className="flex flex-wrap justify-between gap-3 text-sm">
            <Link href="/esqueci-senha" className="min-h-11 inline-flex items-center">
              Esqueci a senha
            </Link>
            <Link href="/cadastro" className="min-h-11 inline-flex items-center">
              Criar cadastro
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
