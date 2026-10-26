/** Slug válido em `/study/[id]` — rejeita JSON/Saxon acidental na barra de endereço. */
export function parseStudyRouteSongId(
  slugPart: string | undefined | null,
): string | null {
  if (!slugPart) return null;
  const id = decodeURIComponent(slugPart).trim();
  if (!id || id.length > 128) return null;
  if (id.startsWith('{') || id.startsWith('[')) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}
