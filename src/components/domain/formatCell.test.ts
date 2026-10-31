import { describe, expect, it } from "vitest";

import { formatCell } from "./formatCell";

describe("formatCell", () => {
  it("formats common column values", () => {
    expect(
      formatCell(
        { active: true },
        { path: "active", label: "Ativo", format: "boolean" },
        null,
        null,
      ),
    ).toBe("Sim");
    expect(
      formatCell(
        { songs: [1, 2] },
        { path: "songs", label: "Músicas", format: "count" },
        null,
        null,
      ),
    ).toBe("2");
    expect(
      formatCell(
        { amount: 20 },
        { path: "amount", label: "Valor", format: "currency" },
        null,
        null,
      ),
    ).toContain("20,00");
    expect(
      formatCell(
        { status: "skipped" },
        { path: "status", label: "Áudio", format: "status" },
        null,
        null,
      ),
    ).toBe("Sem áudio");
  });

  it("formats linked people, score availability, roles, and visibility", () => {
    expect(
      formatCell(
        { personId: "p1" },
        { path: "personId", label: "Pessoa" },
        null,
        [{ value: "p1", label: "Ana" }],
      ),
    ).toBe("Ana");
    expect(
      formatCell(
        { scores: [{ url: "/score.xml" }] },
        { path: "hasScore", label: "Partitura" },
        null,
        null,
      ),
    ).toBe("Sim");
    expect(
      formatCell(
        { roles: ["admin"] },
        { path: "roles", label: "Perfis", format: "roles" },
        [{ value: "admin", label: "Admin" }],
        null,
      ),
    ).toBe("Admin");
    expect(
      formatCell(
        { visibility: "private", visibleToStudents: true },
        { path: "visibility", label: "Visibilidade" },
        null,
        null,
      ),
    ).toBe("Privada · alunos");
    expect(
      formatCell(
        { visibility: "public" },
        { path: "visibility", label: "Visibilidade" },
        null,
        null,
      ),
    ).toBe("Pública");
  });

  it("formats dates and handles empty or invalid cell values", () => {
    const date = new Date("2025-03-04T12:30:00.000Z");
    expect(
      formatCell(
        { day: date.toISOString() },
        { path: "day", label: "Data", format: "date" },
        null,
        null,
      ),
    ).toBe(date.toLocaleDateString("pt-BR"));
    expect(
      formatCell(
        { startsAt: date.toISOString() },
        { path: "startsAt", label: "Início", format: "datetime" },
        null,
        null,
      ),
    ).toBe(date.toLocaleString("pt-BR"));
    expect(
      formatCell(
        { day: "invalid" },
        { path: "day", label: "Data", format: "date" },
        null,
        null,
      ),
    ).toBe("—");
    expect(
      formatCell({ title: "" }, { path: "title", label: "Título" }, null, null),
    ).toBe("—");
    expect(
      formatCell(
        { createdBy: "" },
        { path: "createdBy", label: "Criado por" },
        null,
        null,
      ),
    ).toBe("system");
  });
});
