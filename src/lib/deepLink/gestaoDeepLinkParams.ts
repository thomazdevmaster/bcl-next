import type { CrudResource } from "@/core/auth/permissions";

/** Nome do query param de deep link por recurso de gestão. */
export function gestaoDeepLinkParam(
  resource: CrudResource,
): string | null {
  switch (resource) {
    case "users":
      return "conta";
    case "presentations":
      return "evento";
    case "songs":
      return "musica";
    default:
      return null;
  }
}
