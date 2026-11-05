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
      source: "/study",
      destination: "/score_playground",
      permanent: false,
    });
    expect(LEGACY_ROUTE_REDIRECTS).toContainEqual({
      source: "/study/:id(\\d+)",
      destination: "/score_playground",
      permanent: false,
    });
  });

  it("doesNotCatchStaticStudyAssetsUsedByThePlaygroundUnroller", () => {
    const sources = LEGACY_ROUTE_REDIRECTS.map((rule) => rule.source);
    expect(sources.some((source) => source.includes(":path*"))).toBe(false);
    expect(sources).not.toContain("/study/:slug");
  });
});
