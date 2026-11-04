import type { CrudResource } from "@/core/auth/permissions";
export { withAudit } from "@/domains/audit";

const UNIQUE_FIELDS: Partial<Record<CrudResource, string[]>> = {
  users: ["username"],
  people: ["email", "document.number"],
  media: ["slug"],
  patrimony: ["code"],
  instruments: ["name"],
};

export function uniqueFieldsForResource(resource: CrudResource): string[] {
  return UNIQUE_FIELDS[resource] ?? [];
}
