'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { MusicLoader } from '@/components/MusicLoader';
import { apiFetch } from '@/lib/api';
import type { SessionUser } from '@/contexts/AuthContext';
import { formatPhoneNumber } from '@/lib/formatPhone';
import { userFacingError } from '@/lib/userMessages';

export default function CompletarCadastroPage() {
  const auth = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.isHydrated) return;
    if (!auth.isLoggedIn) {
      router.replace('/login');
      return;
    }
    if (!auth.user?.needsProfileCompletion) {
      router.replace('/gestao');
      return;
    }
    setUsername(auth.user.username ?? '');
    setPhone('');
  }, [auth.isHydrated, auth.isLoggedIn, auth.user, router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError('Informe um telefone com DDD.');
      return;
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(username.trim())) {
      setError('Nome de usuário: use de 3 a 60 caracteres com letras minúsculas, números, ponto, hífen ou _.');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<SessionUser>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          phone,
          username: username.trim().toLowerCase(),
        }),
      });
      auth.updateProfile(updated);
      router.replace('/gestao');
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  if (!auth.isHydrated || !auth.isLoggedIn || !auth.user?.needsProfileCompletion) {
    return null;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="flex items-center gap-4">
          <UserAvatar url={auth.user.pictureUrl} name={auth.user.name} className="h-14 w-14 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Quase lá</p>
            <h1 className="text-2xl font-semibold">Complete seu cadastro</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Você entrou com Google como <strong>{auth.user.name}</strong> ({auth.user.email}). Informe telefone e nome de
          usuário para usar o painel — não é preciso criar senha.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nome de usuário
            <input
              className="min-h-11 w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Telefone (WhatsApp)
            <input
              className="min-h-11 w-full"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              inputMode="tel"
              autoComplete="tel"
              placeholder="(35) 99999-9999"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--destructive)]" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-primary min-h-11 w-full" disabled={saving}>
            {saving ? <MusicLoader compact label="Salvando…" /> : 'Continuar para o painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
