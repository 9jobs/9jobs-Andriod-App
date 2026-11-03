import { describe, expect, test } from "vitest";
import { calculateTrackerMetrics } from "./trackerMetrics";

describe("calculateTrackerMetrics", () => {
  test("counts explicit Sheet outreach without fabricating dates or interview milestones",()=>{
    const metrics=calculateTrackerMetrics({
      applications:Array.from({length:66},(_,i)=>({id:-i-1,status:"applied",created_at:"2026-09-14",application_date:"2026-09-14"})),
      coldEmails:Array.from({length:10},()=>({source:"duplicate-sheet",source_sent_confirmed:true,sent_at:null,delivery_status:"sent"})),
      recruiterContacts:[...Array.from({length:10},(_,i)=>({source:"duplicate-sheet",source_outreach_confirmed:true,recruiter_name:`Contact ${i}`,contact_date:null,response_status:null})),{source:"duplicate-sheet",source_outreach_confirmed:false,recruiter_name:"Added only",contact_date:null}],
    });
    expect(metrics.totalApplications).toBe(66);expect(metrics.applied).toBe(66);
    expect(metrics.coldEmailsSent).toBe(10);expect(metrics.contactsReached).toBe(10);
    expect(metrics.interviewing).toBe(0);expect(metrics.offers).toBe(0);expect(metrics.responseRate).toBe(0);
  });
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

  test("preserves milestone counts from activity history after later status updates", () => {
    const metrics = calculateTrackerMetrics({
      applications: [
        {
          id: 11,
          status: "shortlisted",
          current_stage: "shortlisted",
          created_at: "2026-08-31T09:00:00.000Z",
          application_date: "2026-08-31T09:00:00.000Z",
          is_active: true,
        },
      ],
      activityLogs: [
        {
          application_id: 11,
          old_value: { status: "rejected" },
          new_value: { status: "recruiter_contacted" },
        },
        {
          application_id: 11,
          old_value: { status: "recruiter_contacted" },
          new_value: { status: "shortlisted" },
        },
      ],
    });

    expect(metrics.recruiterContacted).toBe(1);
    expect(metrics.shortlisted).toBe(1);
    expect(metrics.rejected).toBe(1);
  });
});
