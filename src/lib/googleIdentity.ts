import { failureMessage } from '@/lib/userMessages';

/**
 * Google Identity Services (botão "Entrar com Google").
 *
 * Configuração: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no front e `GOOGLE_CLIENT_ID` na
 * API (o mesmo client id). Sem o client id o botão explica que o recurso não
 * está disponível em vez de falhar em silêncio.
 */

export type GoogleCredentialResponse = { credential?: string };

type GoogleButtonOptions = {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<GoogleAccountsId> | null = null;

export function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
}

export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity só carrega no navegador.'));
  }
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement('script');
    const done = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error(failureMessage(undefined, 'O Google não carregou o login.')));
    };
    script.addEventListener('load', done, { once: true });
    script.addEventListener(
      'error',
      () => {
        scriptPromise = null;
        reject(new Error(failureMessage(undefined, 'Sem conexão com o Google. Tente de novo.')));
      },
      { once: true },
    );
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export type GoogleProfile = {
  email?: string;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
};

/** Lê o perfil do ID token só para pré-preencher formulário. A verificação é feita pela API. */
export function readGoogleProfile(credential: string): GoogleProfile {
  try {
    const [, payload] = credential.split('.');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const text = (key: string) => (typeof claims[key] === 'string' ? (claims[key] as string) : undefined);
    return {
      email: text('email'),
      givenName: text('given_name'),
      familyName: text('family_name'),
      name: text('name'),
      picture: text('picture'),
    };
  } catch {
    return {};
  }
}
