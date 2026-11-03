import { buildTrackerSummaryFromApplications } from "@/lib/data/live-sync";

test("explicit source outreach counts without invented timestamps, responses or interview milestones", () => {
  const summary=buildTrackerSummaryFromApplications([],0,0,"2026-11-02T00:00:00Z",{
    coldEmails:[{source:"duplicate-sheet",source_sent_confirmed:true,sent_at:null,delivery_status:"sent"},{sent_at:null,delivery_status:"sent"}],
    recruiterContacts:[{source:"duplicate-sheet",source_outreach_confirmed:true,recruiter_name:"Actual Contact",contact_date:null,response_status:null},
      {source:"duplicate-sheet",source_outreach_confirmed:true,recruiter_name:"Actual Contact"},
      {source:"duplicate-sheet",source_outreach_confirmed:false,recruiter_name:"Added only"}],
  });
  expect(summary.coldEmailsSent).toBe(1);
  expect(summary.hiringManagersContacted).toBe(1);
  expect(summary.interviewing).toBe(0);
  expect(summary.offers).toBe(0);
  expect(summary.responseRate).toBe(0);
});
