'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { sealPassword } from '@/lib/passwordCipher';
import { readGoogleProfile } from '@/lib/googleIdentity';
import { isPersonUnderage } from '@/domains/people/types';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { userFacingError } from '@/lib/userMessages';

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Mesma cara em todos os campos: largura total, borda fina, altura de toque. */
const FIELD = 'min-h-11 w-full';
const LABEL = 'flex flex-col gap-1.5 text-sm font-medium';

export default function CadastroPage() {
  const auth = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [googlePicture, setGooglePicture] = useState<string | null>(null);

  const onGoogleCredential = async (credential: string) => {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const session = await auth.loginWithGoogle(credential, true);
      router.push(session.mustChangePassword ? '/alterar-senha' : '/gestao');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        const profile = readGoogleProfile(credential);
        if (profile.givenName) setFirstName(profile.givenName);
        if (profile.familyName) setLastName(profile.familyName);
        if (profile.email) setEmail(profile.email);
        setGoogleCredential(credential);
        setGooglePicture(profile.picture ?? null);
        setNotice('Ainda não há cadastro para esta conta Google. Complete os dados abaixo para pedir acesso. O perfil será Amigos e usaremos sua foto do Google.');
      } else {
        setError(userFacingError(caught));
      }
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError('Informe um telefone com DDD.');
      return;
    }
    if (isPersonUnderage(birthDate)) {
      setError('Menores de idade são cadastrados pela banda junto com o responsável. Procure a secretaria.');
      return;
    }
    if (username && !/^[a-z0-9][a-z0-9._-]{2,59}$/.test(username)) {
      setError('Nome de usuário: use de 3 a 60 caracteres com letras minúsculas, números, ponto, hífen ou _.');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmação não confere com a senha.');
      return;
    }
    setSaving(true);
    try {
      // A senha vai cifrada com a chave pública da API; o texto real nunca entra no JSON.
      const sealed = await sealPassword(password);
      const response = await apiFetch<{ message: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          birthDate,
          username,
          password: sealed,
          googleCredential: googleCredential || undefined,
        }),
      });
      setMessage(response.message);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 lg:max-w-3xl lg:py-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Faça parte da nossa comunidade</p>
        <h1 className="mt-2 text-3xl font-semibold">Criar cadastro</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          O cadastro entra no perfil Amigos. A conta só fica ativa depois que alguém da banda autorizar.
        </p>
        {message ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm">{message}</p>
            <Link href="/login" className="btn-primary inline-flex min-h-11 items-center">
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 lg:mt-6">
              <GoogleSignInButton text="continue_with" onCredential={(credential) => void onGoogleCredential(credential)} disabled={saving} />
            </div>
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)] lg:my-4" aria-hidden="true">
              <span className="h-px flex-1 bg-[var(--border)]" />
              ou
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            {notice && (
              <div className="mb-4 flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--card-secondary)] px-3 py-2 text-sm" role="status">
                {googlePicture ? <UserAvatar url={googlePicture} className="h-11 w-11 shrink-0" /> : null}
                <p className="m-0">{notice}</p>
              </div>
            )}
            <form className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3" onSubmit={onSubmit}>
              <label className={LABEL}>
                Nome
                <input
                  className={FIELD}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  type="text"
                  placeholder="Seu primeiro nome"
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className={LABEL}>
                Sobrenome
                <input
                  className={FIELD}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  type="text"
                  placeholder="Seu sobrenome"
                  autoComplete="family-name"
                  required
                />
              </label>
              <label className={`${LABEL} lg:col-span-2`}>
                E-mail
                <input
                  className={FIELD}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  inputMode="email"
                  placeholder="voce@exemplo.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </label>
              <label className={LABEL}>
                Telefone
                <input
                  className={FIELD}
                  value={phone}
                  onChange={(event) => setPhone(formatPhoneNumber(event.target.value))}
                  type="tel"
                  inputMode="tel"
                  placeholder="(00) 00000-0000"
                  autoComplete="tel"
                  required
                />
              </label>
              <label className={LABEL}>
                Data de nascimento
                <input
                  className={FIELD}
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  type="date"
                  placeholder="dd/mm/aaaa"
                  data-empty={birthDate ? 'false' : 'true'}
                  autoComplete="bday"
                  max={new Date().toISOString().slice(0, 10)}
                  required
                />
              </label>
              <label className={`${LABEL} lg:col-span-2`}>
                Nome de usuário
                <input
                  className={FIELD}
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/\s+/g, '.'))}
                  type="text"
                  placeholder="nome.sobrenome (opcional)"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <span className="text-xs font-normal text-[var(--muted)]">Em branco, geramos a partir do seu nome.</span>
              </label>
              <label className={LABEL}>
                Senha
                <input
                  className={FIELD}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Mínimo de 8 caracteres"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className={LABEL}>
                Confirmar senha
                <input
                  className={FIELD}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  placeholder="Repita a senha"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </label>
              {error && (
                <p className="text-sm text-[var(--destructive)] lg:col-span-2" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn-primary min-h-11 w-full lg:col-span-2" disabled={saving}>
                {saving ? 'Enviando…' : 'Enviar cadastro'}
              </button>
              <Link href="/login" className="inline-flex min-h-11 items-center justify-center text-sm lg:col-span-2">
                Já tenho conta
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
