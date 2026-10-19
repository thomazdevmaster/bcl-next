'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MusicLoader } from '@/components/MusicLoader';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { sealPassword } from '@/lib/passwordCipher';
import { userFacingError } from '@/lib/userMessages';
import type { AppUser } from '@/domains/users/types';

export default function AlterarSenhaPage() {
  const auth = useAuth();
  const router = useRouter();
  const forced = Boolean(auth.user?.mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.isHydrated) return;
    if (!auth.isLoggedIn) {
      router.replace('/login');
    }
  }, [auth.isHydrated, auth.isLoggedIn, router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }
    setSaving(true);
    try {
      const [sealedCurrent, sealedNext] = await Promise.all([
        sealPassword(currentPassword),
        sealPassword(newPassword),
      ]);
      const updated = await apiFetch<AppUser>('/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: sealedCurrent, newPassword: sealedNext }),
      });
      auth.updateProfile({ mustChangePassword: updated.mustChangePassword ?? false });
      router.replace('/');
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  if (!auth.isHydrated || !auth.isLoggedIn) return null;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          {forced ? 'Primeiro acesso' : 'Conta'}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Alterar senha</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {forced
            ? 'A senha inicial vale só para este acesso. Escolha outra para continuar.'
            : 'Informe a senha atual e a nova senha.'}
        </p>
        <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {forced ? 'Senha inicial' : 'Senha atual'}
            <input
              className="min-h-11 w-full"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              placeholder={forced ? 'Senha que você recebeu' : 'Sua senha atual'}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nova senha
            <input
              className="min-h-11 w-full"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Confirmar nova senha
            <input
              className="min-h-11 w-full"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {error && (
            <p className="text-sm text-[var(--destructive)]" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary min-h-11" disabled={saving}>
            {saving ? <MusicLoader compact label="Salvando…" /> : 'Salvar e continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
