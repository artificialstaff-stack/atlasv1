import { describe, expect, it } from "vitest";
import { getAtlasJourneyRoutes, listAtlasSurfaces } from "@/lib/jarvis";

describe("jarvis surface registry", () => {
  it("keeps critical store/support/request surfaces under contract", () => {
    const surfaces = listAtlasSurfaces();
    const ids = new Set(surfaces.map((surface) => surface.id));

    expect(ids.has("customer-store")).toBe(true);
    expect(ids.has("customer-support")).toBe(true);
    expect(ids.has("customer-requests-page")).toBe(true);
    expect(ids.has("customer-requests-modal")).toBe(true);
  });

  it("exposes route journeys without modal-only anchors", () => {
    const journeys = getAtlasJourneyRoutes();

    expect(journeys).toContain("/panel/store");
    expect(journeys).toContain("/panel/support");
    expect(journeys).not.toContain("/panel/requests#modal");
  });
});
