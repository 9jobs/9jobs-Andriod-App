import { describe, expect, test } from "vitest";
import { calculateTrackerMetrics } from "./trackerMetrics";

describe("calculateTrackerMetrics", () => {
  test("returns safe zero values without records", () => {
    const metrics = calculateTrackerMetrics({ applications: [] });

    expect(metrics.currentFocus.message).toBe("0 total roles currently in active track");
    expect(metrics.applied).toBe(0);
    expect(metrics.successRate).toBe(0);
    expect(metrics.responseRate).toBe(0);
    expect(metrics.aiMatchScore).toBe(0);
    expect(metrics.atsScore).toBe(0);
  });

  test("deduplicates contacts and computes interview metrics", () => {
    const metrics = calculateTrackerMetrics({
      applications: [
        { id: 1, status: "applied", created_at: "2026-07-10T00:00:00.000Z", application_date: "2026-07-10T00:00:00.000Z" },
        { id: 2, status: "shortlisted", created_at: "2026-07-10T00:00:00.000Z", application_date: "2026-07-10T00:00:00.000Z" },
      ],
      interviews: [{ application_id: 2, status: "completed" }],
      recruiterContacts: [
        { id: 1, application_id: 1, email: "same@company.com", contact_date: "2026-07-10T00:00:00.000Z", response_status: "replied" },
        { id: 2, application_id: 1, email: "same@company.com", contact_date: "2026-07-10T01:00:00.000Z", response_status: "replied" },
      ],
      scores: [{ application_id: 2, ats_score: 91, ai_match_score: 84, calculated_at: "2026-07-10T02:00:00.000Z" }],
    });

    expect(metrics.recruiterContacted).toBe(1);
    expect(metrics.interviewCompleted).toBe(1);
    expect(metrics.contactsReached).toBe(1);
    expect(metrics.atsScore).toBe(91);
    expect(metrics.aiMatchScore).toBe(84);
  });
});
