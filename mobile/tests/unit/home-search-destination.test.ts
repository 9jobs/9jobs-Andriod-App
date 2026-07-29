import { resolveHomeSearchDestination } from "@/lib/navigation/home-search-destination";

describe("resolveHomeSearchDestination", () => {
  it.each([
    ["Applied", "Applied"],
    ["applications", "Applied"],
    ["Shortlisted", "Shortlisted"],
    ["sortlisted", "Shortlisted"],
    ["Interviewing", "Interviewing"],
    ["offers", "Offers"],
    ["saved jobs", "Saved"],
    ["applications today", "Applications Today"],
    ["recruiter contacted", "Recruiter Contacted"],
    ["interview completed", "Interview Completed"],
    ["hired", "Hired"],
    ["rejected", "Rejected"],
    ["follow-ups due", "Follow-ups Due"],
    ["cold emails sent", "Cold Emails Sent"],
    ["contacts reached", "Hiring Managers Contacted"],
  ])("opens the %s tracker result as %s", (query, filter) => {
    expect(resolveHomeSearchDestination(query)).toEqual({
      pathname: "/(app)/tracker-details",
      params: { filter },
    });
  });

  it.each([
    ["resume intelligence", "/(app)/resume"],
    ["outreach", "/(app)/outreach"],
    ["interview prep", "/(app)/interview"],
    ["success stories", "/(app)/stories"],
    ["pricing", "/(app)/pricing"],
    ["services", "/(app)/services"],
    ["job tracker", "/(app)/tracker"],
  ])("opens the %s service route", (query, pathname) => {
    expect(resolveHomeSearchDestination(query)).toEqual({ pathname });
  });

  it("keeps ordinary job and company searches on the existing search screen", () => {
    expect(resolveHomeSearchDestination("Automation Engineer")).toEqual({
      pathname: "/(app)/jobs/search",
      params: { query: "Automation Engineer" },
    });
  });
});
