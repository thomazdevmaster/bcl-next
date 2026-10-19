'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { MusicLoader } from '@/components/MusicLoader';
import { apiFetch } from '@/lib/api';
import { userFacingError } from '@/lib/userMessages';

export default function EsqueciSenhaPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await apiFetch<{ message?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ username: identifier.trim() }),
      });
      setMessage(
        response?.message?.trim() ||
          'Se o usuário estiver cadastrado e aprovado, a equipe libera uma senha nova no painel.',
      );
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Acesso interno</p>
        <h1 className="mt-2 text-3xl font-semibold">Esqueci a senha</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Informe usuário ou e-mail. Quem autoriza cadastros vê o pedido no painel, gera uma senha nova e te envia.
        </p>
        {message ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm">{message}</p>
            <Link href="/login" className="btn-primary inline-flex min-h-11 items-center">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1.5 text-sm">
              Usuário ou e-mail
              <input
                className="min-h-11"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </label>
            {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
            <button type="submit" className="btn-primary min-h-11" disabled={saving}>
              {saving ? <MusicLoader compact label="Enviando…" /> : 'Pedir nova senha'}
            </button>
            <Link href="/login" className="min-h-11 inline-flex items-center text-sm">
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
