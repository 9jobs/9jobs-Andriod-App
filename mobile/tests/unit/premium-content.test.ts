import {
  getPremiumScreenContent,
  getQuickActionRoutes,
  getTrackerSummary,
} from "@/lib/data/premium-content";
import { demoJobs } from "@/lib/data/demo-jobs";

describe("premium content", () => {
  test("contains content for every figma-style secondary screen route", () => {
    expect(
      [
        "resume",
        "outreach",
        "interview",
        "pricing",
        "stories",
        "notifications",
        "settings",
        "about",
        "contact",
      ].map((key) => getPremiumScreenContent(key)?.key),
    ).toEqual([
      "resume",
      "outreach",
      "interview",
      "pricing",
      "stories",
      "notifications",
      "settings",
      "about",
      "contact",
    ]);
  });

  test("returns configured secondary screen content by route key", () => {
    const screen = getPremiumScreenContent("resume");

    expect(screen?.title).toBe("Resume Writing Australia");
    expect(screen?.primaryCta?.href).toBe("/(app)/pricing");
  });

  test("returns null for unknown screen keys", () => {
    expect(getPremiumScreenContent("does-not-exist")).toBeNull();
  });

  test("exposes quick action routes used by the home screen", () => {
    expect(getQuickActionRoutes().map((item) => item.href)).toEqual([
      "/(app)/resume",
      "/(app)/outreach",
      "/(app)/interview",
      "/(app)/services",
    ]);
  });

  test("summarizes tracker metrics from jobs", () => {
    expect(getTrackerSummary(demoJobs)).toEqual({
      applied: 2,
      interviewing: 1,
      offers: 1,
      saved: 3,
    });
  });
});
