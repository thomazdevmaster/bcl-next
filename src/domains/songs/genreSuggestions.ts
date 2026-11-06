/** Chave estável para comparar gêneros sem caixa nem acento. */
export function genreSuggestionKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/** Gêneros já usados nas músicas, mais os digitados nesta sessão, sem repetir. */
export function collectSongGenres(
  songs: ReadonlyArray<{ genre?: unknown }>,
  extras: readonly string[] = [],
): string[] {
  const seen = new Map<string, string>();
  for (const source of [
    ...songs.map((song) => song.genre),
    ...extras,
  ]) {
    if (typeof source !== "string") continue;
    const text = source.trim();
    const key = genreSuggestionKey(text);
    if (!key || seen.has(key)) continue;
    seen.set(key, text);
  }
  return [...seen.values()].sort((left, right) =>
    left.localeCompare(right, "pt-BR"),
  );
}

/**
 * Um texto que não aparece em nenhum gênero já usado entra sozinho na lista,
 * para poder ser escolhido e passar a constar nas próximas sugestões.
 */
export function filterGenreSuggestions(
  genres: readonly string[],
  query: string,
): string[] {
  const text = query.trim();
  const key = genreSuggestionKey(text);
  const matches = key
    ? genres.filter((genre) => genreSuggestionKey(genre).includes(key))
    : [...genres];
  if (!key || matches.length > 0) return matches;
  return [text];
}
