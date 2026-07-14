import {
  buildMessageThread,
  buildPricingScreenContent,
  buildTrackerSummaryFromApplications,
  buildUserHomeMetrics,
  mapJobsWithUserState,
} from "@/lib/data/live-sync";

describe("live sync helpers", () => {
  test("maps jobs with saved and application state from rows", () => {
    const jobs = mapJobsWithUserState(
      [
        {
          id: "job-1",
          title: "Frontend Engineer",
          company: "Stripe",
          location: "Remote",
          salary: "$165k",
          posted_at: "Just now",
          match_score: 98,
          tags: ["React", "Remote"],
          description: "Build premium UI",
          category_id: 1,
        },
        {
          id: "job-2",
          title: "Product Designer",
          company: "Figma",
          location: "SF",
          salary: "$145k",
          posted_at: "1 day ago",
          match_score: 94,
          tags: ["Design"],
          description: "Design systems",
          category_id: 2,
        },
      ],
      [
        { id: 7, job_id: "job-1", status: "interview_scheduled", created_at: "2026-07-10T10:00:00.000Z" },
      ],
      [{ job_id: "job-2" }],
      {
        1: "Career Growth",
        2: "AI Resume",
      },
    );

    expect(jobs[0]).toEqual(
      expect.objectContaining({
        id: "job-1",
        isApplied: true,
        status: "interviewing",
      }),
    );
    expect(jobs[1]).toEqual(
      expect.objectContaining({
        id: "job-2",
        isSaved: true,
        status: "draft",
      }),
    );
  });

  test("builds home metrics with australian timezone-safe today count", () => {
    const metrics = buildUserHomeMetrics(
      [
        { id: 1, status: "applied", application_date: "2026-07-10T23:30:00.000Z", created_at: "2026-07-10T23:30:00.000Z" },
        { id: 2, status: "interview_scheduled", application_date: "2026-07-09T05:30:00.000Z", created_at: "2026-07-09T05:30:00.000Z" },
        { id: 3, status: "offer_received", application_date: "2026-07-08T05:30:00.000Z", created_at: "2026-07-08T05:30:00.000Z" },
      ],
      97,
      "2026-07-11T01:00:00.000Z",
      "Australia/Melbourne",
    );

    expect(metrics).toEqual({
      totalApplications: 3,
      todayApplied: 1,
      interviewing: 1,
      offers: 1,
      resumeScore: 97,
    });
  });

  test("builds tracker summary from real tracker records without undefined values", () => {
    const summary = buildTrackerSummaryFromApplications(
      [
        { id: 1, status: "saved", is_saved: true, created_at: "2026-07-10T05:30:00.000Z" },
        { id: 2, status: "applied", application_date: "2026-07-10T05:30:00.000Z", created_at: "2026-07-10T05:30:00.000Z", recruiter_email: "recruiter@company.com" },
        { id: 3, status: "under_review", application_date: "2026-07-10T08:30:00.000Z", created_at: "2026-07-10T08:30:00.000Z" },
        { id: 4, status: "shortlisted", application_date: "2026-07-10T09:30:00.000Z", created_at: "2026-07-10T09:30:00.000Z" },
        { id: 5, status: "offer_received", offer_received_at: "2026-07-10T10:30:00.000Z", application_date: "2026-07-10T10:30:00.000Z", created_at: "2026-07-10T10:30:00.000Z" },
        { id: 6, status: "hired", hired_at: "2026-07-10T11:30:00.000Z", application_date: "2026-07-10T11:30:00.000Z", created_at: "2026-07-10T11:30:00.000Z", is_active: false },
        { id: 7, status: "rejected", application_date: "2026-07-09T11:30:00.000Z", created_at: "2026-07-09T11:30:00.000Z", is_active: false },
      ],
      1,
      88,
      "2026-07-10T12:00:00.000Z",
      {
        timezone: "Australia/Melbourne",
        interviews: [
          { application_id: 4, interview_date: "2026-07-11T10:00:00.000Z", status: "scheduled" },
          { application_id: 6, interview_date: "2026-07-09T10:00:00.000Z", status: "completed" },
        ],
        followUps: [
          { due_date: "2026-07-10T00:00:00.000Z", status: "due", completed_at: null },
        ],
        recruiterContacts: [
          { id: 1, application_id: 2, email: "recruiter@company.com", contact_date: "2026-07-10T01:00:00.000Z", response_status: "replied" },
          { id: 2, application_id: 2, email: "recruiter@company.com", contact_date: "2026-07-10T02:00:00.000Z", response_status: "replied" },
        ],
        coldEmails: [
          { sent_at: "2026-07-10T03:00:00.000Z", delivery_status: "sent" },
          { sent_at: "2026-07-10T04:00:00.000Z", delivery_status: "failed" },
        ],
        scores: [
          { application_id: 2, ai_match_score: 81, ats_score: 88, calculated_at: "2026-07-10T02:00:00.000Z" },
          { application_id: 4, ai_match_score: 89, ats_score: 90, calculated_at: "2026-07-10T03:00:00.000Z" },
        ],
      },
    );

    expect(summary.currentFocus.message).toBe("5 total roles currently in active track");
    expect(summary.applied).toBe(6);
    expect(summary.saved).toBe(1);
    expect(summary.underReview).toBe(1);
    expect(summary.recruiterContacted).toBe(1);
    expect(summary.shortlisted).toBe(1);
    expect(summary.interviewCompleted).toBe(1);
    expect(summary.offers).toBe(1);
    expect(summary.hired).toBe(1);
    expect(summary.rejected).toBe(1);
    expect(summary.followupsDue).toBe(1);
    expect(summary.coldEmailsSent).toBe(1);
    expect(summary.hiringManagersContacted).toBe(1);
    expect(summary.aiMatchScore).toBe(85);
    expect(summary.atsResumeScore).toBe(90);
  });

  test("returns zero-safe rates when there are no submitted applications", () => {
    const summary = buildTrackerSummaryFromApplications([], 0, 0, "2026-07-10T12:00:00.000Z");

    expect(summary.currentFocus.message).toBe("0 total roles currently in active track");
    expect(summary.successRate).toBe(0);
    expect(summary.responseRate).toBe(0);
    expect(summary.aiMatchScore).toBe(0);
    expect(summary.atsResumeScore).toBe(0);
  });

  test("builds pricing content from live plans and active subscription", () => {
    const content = buildPricingScreenContent(
      [
        { id: "free", name: "Free Starter", price: "$0/month", features: ["Basic job search"] },
        { id: "pro", name: "Pro Candidate", price: "$999/month", features: ["AI resume intelligence"] },
      ],
      "pro",
    );

    expect(content.sections[0]?.items).toEqual([
      expect.objectContaining({ title: "Free Starter", badge: "Plan", detail: "$0/month" }),
      expect.objectContaining({ title: "Pro Candidate", badge: "Active", detail: "$999/month" }),
    ]);
  });

  test("builds a single admin thread summary from live messages", () => {
    const thread = buildMessageThread(
      [
        {
          id: 3,
          conversation_id: "preview-user-9jobs",
          sender_id: "admin",
          sender_role: "admin",
          recipient_id: "preview-user-9jobs",
          content: "Your resume score has been updated.",
          status: "seen",
          created_at: "2026-07-10T11:58:00.000Z",
        },

      ],
      "Test User",
    );

    expect(thread).toEqual(
      expect.objectContaining({
        id: "admin-thread",
        name: "9Jobs Admin",
        snippet: "Your resume score has been updated.",
      }),
    );
  });
});
