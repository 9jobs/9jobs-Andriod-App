import { normalizeTrackerSummary, trackerSummaryDefaults } from "@/lib/data/tracker-summary";

describe("normalizeTrackerSummary", () => {
  test("maps admin tracker metric aliases to the mobile tracker shape", () => {
    const summary = normalizeTrackerSummary({
      applied: 3,
      interviewing: 1,
      offers: 1,
      saved: 1,
      followUpsDue: 4,
      atsScore: 92,
      contactsReached: 7,
    });

    expect(summary.applied).toBe(3);
    expect(summary.interviewing).toBe(1);
    expect(summary.offers).toBe(1);
    expect(summary.saved).toBe(1);
    expect(summary.followupsDue).toBe(4);
    expect(summary.atsResumeScore).toBe(92);
    expect(summary.hiringManagersContacted).toBe(7);
  });

  test("falls back to safe defaults when tracker summary is missing", () => {
    expect(normalizeTrackerSummary(undefined)).toEqual(trackerSummaryDefaults);
  });
});
