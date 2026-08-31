import { describe, expect, it } from "vitest";
import { REPORT_CATEGORIES, REPORT_STATUSES, isAuthorityRole } from "./report";

describe("DrainForge shared report contracts", () => {
  it("keeps the supported report categories and lifecycle explicit", () => {
    expect(REPORT_CATEGORIES).toContain("blocked_drain");
    expect(REPORT_STATUSES).toContain("received");
    expect(REPORT_STATUSES).toContain("resolved");
  });

  it("recognizes authority roles without granting resident access", () => {
    expect(isAuthorityRole("authority")).toBe(true);
    expect(isAuthorityRole("super_admin")).toBe(true);
    expect(isAuthorityRole("resident")).toBe(false);
  });
});
