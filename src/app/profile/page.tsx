'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActiveRolesSelector } from '@/components/auth/ActiveRolesSelector';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { MusicLoader } from '@/components/MusicLoader';
import { usesRemoteApi } from '@/core/auth/accessToken';
import { useAuth, type SessionUser } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { formatPhoneNumber, phoneDigits } from '@/lib/formatPhone';
import { userFacingError } from '@/lib/userMessages';

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  pictureUrl: string;
};

function toForm(user: SessionUser): ProfileForm {
  return {
    name: user.name ?? '',
    email: user.email ?? '',
    phone: user.phone ? formatPhoneNumber(user.phone) : '',
    address: user.address ?? '',
    pictureUrl: user.pictureUrl ?? '',
  };
}

export default function ProfilePage() {
  const auth = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.isHydrated) return;
    if (!auth.isLoggedIn) {
      router.push('/login');
      return;
    }
    if (auth.user) setForm(toForm(auth.user));
  }, [auth.isHydrated, auth.isLoggedIn, auth.user, router]);

  const onPhotoFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) setForm((current) => (current ? { ...current, pictureUrl: result } : current));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const onSave = async () => {
    if (!form || !auth.user) return;
    setError(null);
    setSaved(false);
    const name = form.name.trim();
    if (!name) {
      setError('Informe o nome.');
      return;
    }
    const email = form.email.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    const digits = phoneDigits(form.phone);
    if (digits.length > 0 && (digits.length < 10 || digits.length > 11)) {
      setError('Informe um telefone com DDD.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        email: email || '',
        phone: form.phone.trim(),
        address: form.address.trim(),
        pictureUrl: form.pictureUrl.trim(),
      };
      if (usesRemoteApi()) {
        const updated = await apiFetch<SessionUser>('/auth/me', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        auth.updateProfile(updated);
        setForm(toForm(updated));
      } else {
        auth.updateProfile({
          name,
          email: email || null,
          phone: payload.phone || null,
          address: payload.address || null,
          pictureUrl: payload.pictureUrl || null,
        });
      }
      setSaved(true);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  if (!auth.isHydrated || !auth.isLoggedIn || !auth.user || !form) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <UserAvatar
              url={form.pictureUrl || auth.user.pictureUrl}
              name={form.name || auth.user.name}
              className="h-24 w-24 text-[96px] leading-none"
            />
            <label className="btn-outline-primary inline-flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm">
              <span className="material-icons text-lg" aria-hidden>
                photo_camera
              </span>
              Alterar foto
              <input type="file" accept="image/*" className="sr-only" onChange={onPhotoFile} />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">Meu perfil</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Usuário: <strong className="text-[var(--foreground)]">{auth.user.username}</strong>
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ActiveRolesSelector
            accountRoles={auth.accountRoles}
            activeRoles={auth.activeRoles}
            onChange={(roles) => {
              auth.setActiveRoles(roles);
              router.push('/');
            }}
          />
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nome
            <input
              className="min-h-11 w-full"
              value={form.name}
              onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
              autoComplete="name"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            E-mail
            <input
              type="email"
              className="min-h-11 w-full"
              value={form.email}
              onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
              autoComplete="email"
              inputMode="email"
              placeholder="seu@email.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Telefone
            <input
              type="tel"
              className="min-h-11 w-full"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => (f ? { ...f, phone: formatPhoneNumber(e.target.value) } : f))
              }
              autoComplete="tel"
              inputMode="tel"
              placeholder="(35) 99999-9999"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Endereço
            <input
              className="min-h-11 w-full"
              value={form.address}
              onChange={(e) => setForm((f) => (f ? { ...f, address: e.target.value } : f))}
              autoComplete="street-address"
              placeholder="Rua, número, bairro, cidade"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            URL da foto (opcional)
            <input
              type="url"
              className="min-h-11 w-full"
              value={form.pictureUrl.startsWith('data:') ? '' : form.pictureUrl}
              onChange={(e) => setForm((f) => (f ? { ...f, pictureUrl: e.target.value } : f))}
              placeholder="https://…"
            />
            <span className="text-xs font-normal text-[var(--muted)]">
              Envie uma imagem acima ou cole um link público.
            </span>
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}
        {saved && !error ? (
          <p className="mt-4 text-sm text-[var(--color-brand-strong)]" role="status">
            Perfil atualizado.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="btn-primary min-h-11" disabled={saving} onClick={() => void onSave()}>
            {saving ? <MusicLoader compact label="Salvando…" /> : 'Salvar'}
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
            className="btn-danger min-h-11"
            onClick={() => auth.logout().then(() => router.push('/'))}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
