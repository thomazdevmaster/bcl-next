'use client';

import { useEffect, useRef, useState } from 'react';
import { getGoogleClientId, loadGoogleIdentity } from '@/lib/googleIdentity';
import { MusicLoader } from '@/components/MusicLoader';
import { failureMessage, userFacingError } from '@/lib/userMessages';

type Props = {
  /** Recebe o ID token do Google; quem usa decide se entra ou pré-preenche. */
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  disabled?: boolean;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.6-2 15.4-5.6l-7.5-5.8c-2 1.4-4.7 2.3-7.9 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * Quando há client id, renderiza o botão oficial do Google Identity Services
 * (ele cuida de pop-up/One Tap). Sem client id, mostra um botão com a mesma
 * cara que explica a indisponibilidade ao toque.
 */
export function GoogleSignInButton({ onCredential, text = 'continue_with', disabled }: Props) {
  const clientId = getGoogleClientId();
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || !host.current) return;
    let active = true;
    const parent = host.current;
    loadGoogleIdentity()
      .then((google) => {
        if (!active) return;
        google.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) callback.current(response.credential);
          },
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
        });
        parent.replaceChildren();
        google.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          logo_alignment: 'center',
          locale: 'pt-BR',
          width: Math.min(400, Math.max(200, Math.floor(parent.getBoundingClientRect().width))),
        });
        setReady(true);
      })
      .catch((caught: unknown) => {
        if (active) setNotice(userFacingError(caught));
      });
    return () => {
      active = false;
    };
  }, [clientId, text]);

  const label = text === 'signin_with' ? 'Entrar com Google' : text === 'signup_with' ? 'Cadastrar com Google' : 'Continuar com Google';

  return (
    <div className="flex flex-col gap-2">
      {clientId ? (
        <div className="relative min-h-11">
          <div ref={host} className={`flex min-h-11 w-full justify-center ${ready ? '' : 'invisible'}`} />
          {!ready && !notice && (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--input)] text-sm text-[var(--muted)]"
            >
              <MusicLoader compact label="Carregando Google…" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          aria-describedby={notice ? 'google-signin-notice' : undefined}
          onClick={() =>
            setNotice(failureMessage(undefined, 'Entrar com Google ainda não está disponível nesta instalação. Use usuário e senha.'))
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--input)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GoogleMark />
          {label}
        </button>
      )}
      {notice && (
        <p id="google-signin-notice" className="text-xs text-[var(--muted)]" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
