import { roleLabels } from "@/core/auth/roles";
import type { CrudColumn, CrudOption } from "@/domains/crudConfig";
import { getValue } from "@/domains/crudConfig";

interface PersonChoice extends CrudOption {
  hasUser?: boolean;
}

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  available: "Disponível",
  in_use: "Em uso",
  maintenance: "Manutenção",
  retired: "Baixado",
  draft: "Rascunho",
  scheduled: "Agendada",
  done: "Realizada",
  cancelled: "Cancelada",
  published: "Publicado",
  public: "Pública",
  private: "Privada",
  none: "—",
  processing: "Processando",
  ready: "Pronta",
  failed: "Falhou",
  skipped: "Sem áudio",
};

export function songHasScore(row: Record<string, unknown>): boolean {
  return (
    Array.isArray(row.scores) &&
    row.scores.some((score) => {
      if (!score || typeof score !== "object") return false;
      const url = (score as { url?: unknown }).url;
      return typeof url === "string" && url.length > 0;
    })
  );
}

function formatVisibility(
  row: Record<string, unknown>,
  value: unknown,
): string {
  if (value === "public") return "Pública";
  const who = [
    row.visibleToStudents ? "alunos" : "",
    row.visibleToMusicians ? "músicos" : "",
  ].filter(Boolean);
  return who.length ? `Privada · ${who.join(" e ")}` : "Privada";
}

function formatStatus(value: unknown): string {
  return statusLabels[String(value)] ?? String(value ?? "—");
}

function formatCurrency(value: unknown): string {
  return typeof value === "number"
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value)
    : "—";
}

function formatTemporal(value: unknown, format: CrudColumn["format"]): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return format === "date"
    ? date.toLocaleDateString("pt-BR")
    : date.toLocaleString("pt-BR");
}

function formatRoles(value: unknown, choices: CrudOption[] | null): string {
  if (!Array.isArray(value)) return "—";
  return value
    .map(
      (role) =>
        choices?.find((option) => option.value === String(role))?.label ??
        roleLabels([String(role)]),
    )
    .join(", ");
}

function formatPerson(value: unknown, choices: PersonChoice[] | null): string {
  return (
    choices?.find((option) => option.value === String(value))?.label ??
    "Vinculada"
  );
}

const valueFormatters: Record<string, (value: unknown) => string> = {
  boolean: (value) => (value ? "Sim" : "Não"),
  count: (value) => String(Array.isArray(value) ? value.length : 0),
  currency: formatCurrency,
  date: (value) => formatTemporal(value, "date"),
  datetime: (value) => formatTemporal(value, "datetime"),
};

function formatValue(value: unknown, format: CrudColumn["format"]): string {
  return (
    valueFormatters[format ?? ""]?.(value) ??
    (value == null || value === "" ? "—" : String(value))
  );
}

function specialPathValue(
  row: Record<string, unknown>,
  path: string,
  value: unknown,
): string | undefined {
  if (path === "hasScore") return songHasScore(row) ? "Sim" : "Não";
  if (path === "createdBy")
    return value == null || value === "" ? "system" : String(value);
  if (path === "visibility") return formatVisibility(row, value);
  return undefined;
}

export function formatCell(
  row: Record<string, unknown>,
  column: CrudColumn,
  roleChoices: CrudOption[] | null,
  personChoices: PersonChoice[] | null,
): string {
  const value = getValue(row, column.path);
  const specialValue = specialPathValue(row, column.path, value);
  if (specialValue !== undefined) return specialValue;
  if (column.format === "status") return formatStatus(value);
  if (column.format === "roles") return formatRoles(value, roleChoices);
  if (
    ["personId", "assignedPersonId", "guardianId"].includes(column.path) &&
    value
  )
    return formatPerson(value, personChoices);
  return formatValue(value, column.format);
}
