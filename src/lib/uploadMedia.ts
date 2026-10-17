import { getAccessToken } from '@/core/auth/accessToken';
import { getApiUrl } from '@/config/environment';
import { failureMessage } from '@/lib/userMessages';

export async function uploadMediaFile(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const token = getAccessToken();
  const response = await fetch(`${getApiUrl()}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !payload?.url) {
    throw new Error(failureMessage(undefined, payload?.error || 'Não foi possível enviar o arquivo.'));
  }
  return payload.url;
}
