'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { roleLabels } from '@/core/auth/roles';
import { useAuth, type SessionUser } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const auth = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<Partial<SessionUser>>(auth.user ?? {});

  useEffect(() => {
    if (!auth.isHydrated) return;
    if (!auth.isLoggedIn) {
      router.push('/login');
    }
  }, [auth.isHydrated, auth.isLoggedIn, router]);

  if (!auth.isHydrated || !auth.isLoggedIn || !auth.user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-4">
        <UserAvatar url={auth.user.pictureUrl} name={auth.user.name} className="h-16 w-16 text-[64px] leading-none" />
        <div>
          <h1 className="text-3xl font-semibold">Meu perfil</h1>
          <p className="mt-2 text-[var(--muted)]">
            Perfis: <strong>{roleLabels(auth.user.roles)}</strong>
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          Nome
          <input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          E-mail
          <input type="email" value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </label>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn-primary min-h-11" onClick={() => auth.updateProfile(form)}>
          Salvar
        </button>
        <button
          type="button"
          className="btn-outline-primary min-h-11"
          onClick={() => router.push('/alterar-senha')}
        >
          Alterar senha
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => auth.logout().then(() => router.push('/'))}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
