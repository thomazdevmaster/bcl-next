const ID = /^[\w-]{11}$/;

/** Identificador de um link do YouTube, ou null se não for um endereço aceito. */
export function youtubeVideoId(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    return ID.test(id) ? id : null;
  }
  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'music.youtube.com') {
    return null;
  }
  const fromQuery = url.searchParams.get('v') ?? '';
  if (ID.test(fromQuery)) return fromQuery;
  const parts = url.pathname.split('/').filter(Boolean);
  const marker = parts[0];
  const id = parts[1] ?? '';
  if ((marker === 'embed' || marker === 'shorts' || marker === 'live' || marker === 'v') && ID.test(id)) {
    return id;
  }
  return null;
}

export function youtubeWatchUrl(value: string): string | null {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function youtubeEmbedUrl(value: string): string | null {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1` : null;
}
