import { describe, expect, it } from "vitest";

import { LEGACY_ROUTE_REDIRECTS } from "./legacyRouteRedirects";

describe("legacy route redirects", () => {
  it("redirectsTheOldManagementRouteToAgendaBeforeRendering", () => {
    expect(LEGACY_ROUTE_REDIRECTS).toContainEqual({
      source: "/gestao/apresentacoes",
      destination: "/gestao/agenda",
      permanent: false,
    });
  });

  it("redirectsTheOldStudyRouteToTheScorePlaygroundBeforeRendering", () => {
    expect(LEGACY_ROUTE_REDIRECTS).toContainEqual({
      source: "/study/:path*",
      destination: "/score_playground",
      permanent: false,
    });
  });
});
