import { describe, expect, it } from "vitest";

import {
  collectSongGenres,
  filterGenreSuggestions,
} from "./genreSuggestions";

describe("sugestões de gênero", () => {
  it("junta os gêneros já usados e ignora vazio e repetido", () => {
    expect(
      collectSongGenres(
        [
          { genre: "MPB" },
          { genre: " mpb " },
          { genre: "Samba" },
          { genre: "" },
          { genre: null },
        ],
        ["Forró", "samba"],
      ),
    ).toEqual(["Forró", "MPB", "Samba"]);
  });

  it("filtra pelo que foi digitado e oferece o gênero novo no topo", () => {
    const genres = ["MPB", "Marcha", "Samba"];

    expect(filterGenreSuggestions(genres, "ma")).toEqual(["Marcha"]);
    expect(filterGenreSuggestions(genres, "Choro")).toEqual(["Choro"]);
    expect(filterGenreSuggestions(genres, "mpb")).toEqual(["MPB"]);
  });
});
