'use client';

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ActiveRolesSelector } from '@/components/auth/ActiveRolesSelector';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { MusicLoader } from '@/components/MusicLoader';
import { EntityDialog } from '@/components/shared/EntityDialog';
import { IconSelect, type IconSelectOption } from '@/components/shared/IconSelect';
import { normalizeActiveRoles } from '@/core/auth/activeRoles';
import type { AccessRoles } from '@/core/auth/roles';
import { useAuth, type SessionUser } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { formatPhoneNumber, phoneDigits } from '@/lib/formatPhone';
import { sealPassword } from '@/lib/passwordCipher';
import { userFacingError } from '@/lib/userMessages';
import type { AppUser } from '@/domains/users/types';

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  pictureUrl: string;
};

type ProfileTab = 'profile' | 'security' | 'account';
type ProfileFieldErrors = Partial<Record<'name' | 'email' | 'phone', string>>;

const profileSections: IconSelectOption<ProfileTab>[] = [
  { value: 'profile', label: 'Perfil', icon: 'person' },
  { value: 'security', label: 'Segurança', icon: 'lock' },
  { value: 'account', label: 'Conta', icon: 'manage_accounts' },
];

const tabButtonClass =
  'inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] sm:flex-none sm:gap-2 sm:px-4 sm:text-sm';

const inputClass =
  'min-h-12 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-base text-[var(--foreground)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

function roleSelectionKey(roles: AccessRoles): string {
  return [...roles].sort().join('|');
}

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
  const profileTabRef = useRef<HTMLButtonElement>(null);
  const securityTabRef = useRef<HTMLButtonElement>(null);
  const accountTabRef = useRef<HTMLButtonElement>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [accountDeletionSimulated, setAccountDeletionSimulated] = useState(false);
  const [draftActiveRoles, setDraftActiveRoles] = useState<AccessRoles>(auth.activeRoles);
  const [applyingActiveRoles, setApplyingActiveRoles] = useState(false);

  useEffect(() => {
    setDraftActiveRoles(auth.activeRoles);
  }, [auth.activeRoles]);

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
      if (result) updateField('pictureUrl', result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const onSave = async () => {
    if (!form || !auth.user) return;
    setError(null);
    setSaved(false);
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const digits = phoneDigits(form.phone);
    const nextFieldErrors: ProfileFieldErrors = {};
    if (!name) {
      nextFieldErrors.name = 'Informe seu nome completo.';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextFieldErrors.email = 'Informe um e-mail válido.';
    }
    if (digits.length > 0 && (digits.length < 10 || digits.length > 11)) {
      nextFieldErrors.phone = 'Informe um telefone com DDD, com 10 ou 11 dígitos.';
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
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
      const updated = await apiFetch<SessionUser>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      auth.updateProfile(updated);
      setForm(toForm(updated));
      setSaved(true);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Informe sua senha atual.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação não confere com a nova senha.');
      return;
    }

    setPasswordSaving(true);
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordUpdated(true);
    } catch (caught) {
      setPasswordError(userFacingError(caught));
    } finally {
      setPasswordSaving(false);
    }
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    if (field === 'name' || field === 'email' || field === 'phone') {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
    setError(null);
    setSaved(false);
  };

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordError(null);
    setPasswordUpdated(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const confirmLogout = async () => {
    setLogoutError(null);
    setLoggingOut(true);
    try {
      await auth.logout();
      setLogoutDialogOpen(false);
      router.push('/');
    } catch (caught) {
      setLogoutError(userFacingError(caught));
    } finally {
      setLoggingOut(false);
    }
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletePhrase('');
  };

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs: ProfileTab[] = ['profile', 'security', 'account'];
    const activeIndex = tabs.indexOf(activeTab);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (activeIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab);
    const refs = { profile: profileTabRef, security: securityTabRef, account: accountTabRef };
    refs[nextTab].current?.focus();
  };

  if (!auth.isHydrated || !auth.isLoggedIn || !auth.user || !form) return null;

  const displayedPhoto = form.pictureUrl || auth.user.pictureUrl || '';
  const originalForm = toForm(auth.user);
  const hasChanges =
    form.name.trim() !== originalForm.name.trim() ||
    form.email.trim().toLowerCase() !== originalForm.email.trim().toLowerCase() ||
    phoneDigits(form.phone) !== phoneDigits(originalForm.phone) ||
    form.address.trim() !== originalForm.address.trim() ||
    form.pictureUrl.trim() !== originalForm.pictureUrl.trim();
  const forcedPasswordChange = Boolean(auth.user.mustChangePassword);
  const normalizedDraft = normalizeActiveRoles(draftActiveRoles, auth.accountRoles);
  const activeRolesPending =
    roleSelectionKey(normalizedDraft) !== roleSelectionKey(auth.activeRoles);
  const canPickMultipleRoles = auth.accountRoles.length > 1;

  const applyActiveRoles = () => {
    if (!activeRolesPending || applyingActiveRoles) return;
    setApplyingActiveRoles(true);
    auth.setActiveRoles(normalizedDraft);
    window.location.assign('/');
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-6xl p-1">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Seu perfil</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
          Atualize suas informações, preferências de acesso e segurança da conta.
        </p>
      </header>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
        <div className="flex min-h-14 w-full items-center gap-2 border-b border-[var(--border)] bg-[var(--card-secondary)] p-3 sm:px-4">
          <IconSelect
            label="Seções do perfil"
            options={profileSections}
            value={activeTab}
            onChange={setActiveTab}
            className="relative min-w-0 flex-1 md:hidden"
          />
          <div role="tablist" aria-label="Configurações da conta" className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
            <button
              ref={profileTabRef}
              type="button"
              role="tab"
              id="profile-tab"
              aria-controls="profile-panel"
              aria-selected={activeTab === 'profile'}
              tabIndex={activeTab === 'profile' ? 0 : -1}
              onClick={() => setActiveTab('profile')}
              onKeyDown={handleTabKeyDown}
              className={`${tabButtonClass} ${activeTab === 'profile' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:bg-[var(--card)]/70'}`}
            >
              <span className="material-icons text-lg" aria-hidden="true">person</span>
              Perfil
            </button>
            <button
              ref={securityTabRef}
              type="button"
              role="tab"
              id="security-tab"
              aria-controls="security-panel"
              aria-selected={activeTab === 'security'}
              tabIndex={activeTab === 'security' ? 0 : -1}
              onClick={() => setActiveTab('security')}
              onKeyDown={handleTabKeyDown}
              className={`${tabButtonClass} ${activeTab === 'security' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:bg-[var(--card)]/70'}`}
            >
              <span className="material-icons text-lg" aria-hidden="true">lock</span>
              Segurança
            </button>
            <button
              ref={accountTabRef}
              type="button"
              role="tab"
              id="account-tab"
              aria-controls="account-panel"
              aria-selected={activeTab === 'account'}
              tabIndex={activeTab === 'account' ? 0 : -1}
              onClick={() => setActiveTab('account')}
              onKeyDown={handleTabKeyDown}
              className={`${tabButtonClass} ${activeTab === 'account' ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted)] hover:bg-[var(--card)]/70'}`}
            >
              <span className="material-icons text-lg" aria-hidden="true">manage_accounts</span>
              Conta
            </button>
          </div>
          <button
            type="button"
            aria-label="Sair da conta"
            onClick={() => {
              setLogoutError(null);
              setLogoutDialogOpen(true);
            }}
            className="btn-danger ml-auto inline-flex min-h-11 shrink-0 items-center justify-center px-4 text-sm"
          >
            Sair
          </button>
        </div>

        {activeTab === 'profile' ? (
          <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab" className="min-w-0">
            <div className="grid min-w-0 gap-4 bg-[var(--card-secondary)] p-4 sm:p-6 md:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] md:items-stretch">
              <div className="flex min-w-0 items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:gap-6 sm:p-6">
                <div className="group relative size-28 shrink-0 overflow-hidden rounded-full bg-[var(--accent)]">
                  {displayedPhoto ? (
                    <UserAvatar
                      url={displayedPhoto}
                      name={form.name || auth.user.name}
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <Image
                      src="/imgs/avatar-default.svg"
                      alt=""
                      width={112}
                      height={112}
                      sizes="112px"
                      unoptimized
                      className="rounded-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/25 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:transition-none">
                    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full bg-[var(--card)] text-[var(--foreground)] shadow-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)]">
                      <span className="material-icons text-lg" aria-hidden="true">photo_camera</span>
                      <span className="sr-only">Alterar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        aria-label="Selecionar nova foto de perfil"
                        className="sr-only"
                        onChange={onPhotoFile}
                      />
                    </label>
                    {displayedPhoto ? (
                      <button
                        type="button"
                        aria-label="Ver foto do perfil"
                        title="Ver foto"
                        onClick={() => setIsPhotoPreviewOpen(true)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--card)] text-[var(--foreground)] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                      >
                        <span className="material-icons text-lg" aria-hidden="true">visibility</span>
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-xl font-bold">{form.name || 'Seu perfil'}</h2>
                  <p className="mt-1 break-all text-sm text-[var(--muted)]">
                    {form.email || 'E-mail não informado'}
                  </p>
                  <p className="mt-2 break-all text-xs text-[var(--muted)]">
                    Usuário: <strong className="text-[var(--foreground)]">{auth.user.username}</strong>
                  </p>
                </div>
              </div>
              <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
                <h3 className="text-lg font-bold">Acesso ao sistema</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Marque os perfis que deseja usar e recarregue a sessão. A alteração só vale após
                  confirmar — você pode ajustar a seleção sem recarregar a cada clique.
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  <ActiveRolesSelector
                    accountRoles={auth.accountRoles}
                    activeRoles={draftActiveRoles}
                    disabled={applyingActiveRoles}
                    onChange={setDraftActiveRoles}
                  />
                  {canPickMultipleRoles || activeRolesPending ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-[var(--muted)]" role="status">
                        {activeRolesPending
                          ? 'Há alterações nos perfis ativos ainda não aplicadas.'
                          : 'Perfis ativos iguais à sessão atual.'}
                      </p>
                      <button
                        type="button"
                        className="btn-primary min-h-11 w-full shrink-0 sm:w-auto"
                        disabled={!activeRolesPending || applyingActiveRoles}
                        onClick={applyActiveRoles}
                      >
                        {applyingActiveRoles ? (
                          <MusicLoader compact label="Recarregando…" />
                        ) : (
                          'Recarregar com perfis selecionados'
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="p-4 sm:p-7">
              <form
                noValidate
                className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSave();
                }}
              >
                <div className="border-b border-[var(--border)] pb-4">
                  <h3 className="text-lg font-bold">Informações pessoais</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Mantenha seus dados de contato atualizados.
                  </p>
                </div>
                <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">
                    Nome completo
                    <input
                      className={inputClass}
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={fieldErrors.name ? 'profile-name-error' : undefined}
                      value={form.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      autoComplete="name"
                    />
                    {fieldErrors.name ? <span id="profile-name-error" className="text-sm text-[var(--destructive)]">{fieldErrors.name}</span> : null}
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">
                    E-mail
                    <input
                      className={inputClass}
                      type="email"
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'profile-email-error' : undefined}
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      autoComplete="email"
                      inputMode="email"
                      placeholder="seu@email.com"
                    />
                    {fieldErrors.email ? <span id="profile-email-error" className="text-sm text-[var(--destructive)]">{fieldErrors.email}</span> : null}
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">
                    Telefone
                    <input
                      className={inputClass}
                      type="tel"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={fieldErrors.phone ? 'profile-phone-error' : undefined}
                      value={form.phone}
                      onChange={(event) => updateField('phone', formatPhoneNumber(event.target.value))}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="(35) 99999-9999"
                    />
                    {fieldErrors.phone ? <span id="profile-phone-error" className="text-sm text-[var(--destructive)]">{fieldErrors.phone}</span> : null}
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold sm:col-span-2">
                    Endereço
                    <input
                      className={inputClass}
                      value={form.address}
                      onChange={(event) => updateField('address', event.target.value)}
                      autoComplete="street-address"
                      placeholder="Rua, número, bairro, cidade"
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold sm:col-span-2">
                    URL da foto (opcional)
                    <input
                      className={inputClass}
                      type="url"
                      value={form.pictureUrl.startsWith('data:') ? '' : form.pictureUrl}
                      onChange={(event) => updateField('pictureUrl', event.target.value)}
                      placeholder="https://…"
                    />
                    <span className="text-xs font-normal text-[var(--muted)]">
                      Envie uma imagem acima ou cole um link público.
                    </span>
                  </label>
                </div>

                {error ? (
                  <p className="mt-4 text-sm font-medium text-[var(--destructive)]" role="alert">
                    {error}
                  </p>
                ) : null}
                {saved && !error ? (
                  <p className="mt-4 text-sm text-[var(--color-brand-strong)]" role="status">
                    Perfil atualizado.
                  </p>
                ) : null}

                <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-5">
                  <button
                    type="submit"
                    className="btn-primary min-h-11 w-full sm:w-auto"
                    disabled={saving || !hasChanges}
                  >
                    {saving ? <MusicLoader compact label="Salvando…" /> : 'Salvar mudanças'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : activeTab === 'security' ? (
          <div role="tabpanel" id="security-panel" aria-labelledby="security-tab" className="p-4 sm:p-7">
            <div className="mb-5 border-b border-[var(--border)] pb-5">
              <h2 className="text-xl font-bold">Acesso e segurança</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Gerencie a senha usada para acessar sua conta.
              </p>
            </div>
            <div className="grid gap-4">
              <section className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-[var(--border)] bg-[var(--card-secondary)] p-5 sm:p-6">
                <div>
                  <h3 className="font-semibold">Senha</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {forcedPasswordChange
                      ? 'Sua senha inicial precisa ser alterada para manter a conta protegida.'
                      : 'Altere sua senha para manter a conta protegida.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordError(null);
                    setPasswordUpdated(false);
                    setPasswordDialogOpen(true);
                  }}
                  className="btn-outline-primary min-h-11 w-full sm:w-auto"
                >
                  Alterar senha
                </button>
              </section>
            </div>
          </div>
        ) : (
          <div role="tabpanel" id="account-panel" aria-labelledby="account-tab" className="p-4 sm:p-7">
            <div className="mb-5 border-b border-[var(--border)] pb-5">
              <h2 className="text-xl font-bold">Conta</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Ações que afetam sua conta e seus dados.
              </p>
            </div>
            <section className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-[var(--destructive)]/50 bg-[var(--card-secondary)] p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="min-w-0">
                <h3 className="font-semibold">Excluir conta</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  A exclusão ainda é uma simulação. Nenhum dado será removido. Para confirmar, digite{' '}
                  <strong className="text-[var(--foreground)]">excluir conta</strong>.
                </p>
                {accountDeletionSimulated ? (
                  <p className="mt-3 text-sm text-[var(--color-brand-strong)]" role="status">
                    Simulação concluída com sucesso.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeletePhrase('');
                  setDeleteDialogOpen(true);
                }}
                className="btn-danger min-h-11 w-full shrink-0 sm:w-auto"
              >
                Excluir conta
              </button>
            </section>
          </div>
        )}
      </section>
      <EntityDialog
        open={isPhotoPreviewOpen && Boolean(displayedPhoto)}
        title="Foto do perfil"
        size="xl"
        placement="center"
        closeOnBackdropClick
        onClose={() => setIsPhotoPreviewOpen(false)}
      >
        {displayedPhoto ? (
          <div className="flex min-h-0 items-center justify-center p-3 sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayedPhoto}
              alt={`Foto de ${form.name}`}
              className="max-h-[min(76dvh,720px)] max-w-full object-contain"
            />
          </div>
        ) : null}
      </EntityDialog>

      <EntityDialog
        open={passwordDialogOpen}
        title="Alterar senha"
        description={
          forcedPasswordChange
            ? 'Sua senha inicial precisa ser substituída por uma nova senha.'
            : 'Informe a senha atual e escolha uma nova senha.'
        }
        placement="center"
        closeOnBackdropClick={false}
        onClose={closePasswordDialog}
      >
        {passwordUpdated ? (
          <div className="flex flex-col gap-5 p-4 sm:p-6">
            <p className="text-sm text-[var(--color-brand-strong)]" role="status">
              Senha atualizada com sucesso.
            </p>
            <div className="flex justify-end">
              <button type="button" className="btn-primary min-h-11 w-full sm:w-auto" onClick={closePasswordDialog}>
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form noValidate className="flex flex-col gap-4 p-4 sm:p-6" onSubmit={onPasswordSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium">
              {forcedPasswordChange ? 'Senha inicial' : 'Senha atual'}
              <input
                className={inputClass}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                placeholder={forcedPasswordChange ? 'Senha que você recebeu' : 'Sua senha atual'}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Nova senha
              <input
                className={inputClass}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Confirmar nova senha
              <input
                className={inputClass}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            {passwordError ? (
              <p className="text-sm text-[var(--destructive)]" role="alert">
                {passwordError}
              </p>
            ) : null}
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--card)] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-outline-primary min-h-11 w-full sm:w-auto"
                onClick={closePasswordDialog}
                disabled={passwordSaving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary min-h-11 w-full sm:w-auto" disabled={passwordSaving}>
                {passwordSaving ? <MusicLoader compact label="Salvando…" /> : 'Salvar nova senha'}
              </button>
            </div>
          </form>
        )}
      </EntityDialog>

      <EntityDialog
        open={logoutDialogOpen}
        title="Sair da conta?"
        description="Você precisará entrar novamente para acessar sua área de gestão."
        closeOnBackdropClick
        onClose={() => setLogoutDialogOpen(false)}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          {logoutError ? (
            <p className="text-sm text-[var(--destructive)]" role="alert">
              {logoutError}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-outline-primary min-h-11 w-full sm:w-auto"
              onClick={() => setLogoutDialogOpen(false)}
              disabled={loggingOut}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-danger min-h-11 w-full sm:w-auto"
              onClick={() => void confirmLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? <MusicLoader compact label="Saindo…" /> : 'Sair da conta'}
            </button>
          </div>
        </div>
      </EntityDialog>

      <EntityDialog
        open={deleteDialogOpen}
        title={accountDeletionSimulated ? 'Simulação concluída' : 'Confirmar exclusão da conta'}
        description={
          accountDeletionSimulated
            ? 'A simulação foi concluída. Nenhum dado foi removido.'
            : 'Esta ação é apenas uma simulação e não exclui sua conta nem seus dados.'
        }
        closeOnBackdropClick
        onClose={closeDeleteDialog}
      >
        {accountDeletionSimulated ? (
          <div className="flex flex-col gap-5 p-4 sm:p-6">
            <p className="text-sm text-[var(--color-brand-strong)]" role="status">
              Conta excluída com sucesso (simulação).
            </p>
            <div className="flex justify-end">
              <button type="button" className="btn-primary min-h-11 w-full sm:w-auto" onClick={closeDeleteDialog}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Digite <strong>excluir conta</strong> para habilitar a confirmação
              <input
                className={inputClass}
                value={deletePhrase}
                onChange={(event) => setDeletePhrase(event.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Digite excluir conta para confirmar"
                placeholder="excluir conta"
              />
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-outline-primary min-h-11 w-full sm:w-auto"
                onClick={closeDeleteDialog}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger min-h-11 w-full sm:w-auto"
                disabled={deletePhrase !== 'excluir conta'}
                onClick={() => setAccountDeletionSimulated(true)}
              >
                Excluir conta
              </button>
            </div>
          </div>
        )}
      </EntityDialog>
    </main>
  );
}
