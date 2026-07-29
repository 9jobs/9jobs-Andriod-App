type HomeSearchDestination = {
  pathname: string;
  params?: Record<string, string>;
};

const trackerAliases: Array<{ filter: string; aliases: string[] }> = [
  { filter: "Applications Today", aliases: ["applications today", "applied today", "today applications"] },
  { filter: "Recruiter Contacted", aliases: ["recruiter contacted", "recruiters contacted"] },
  { filter: "Shortlisted", aliases: ["shortlisted", "shortlist", "sortlisted", "sortlist"] },
  { filter: "Interview Completed", aliases: ["interview completed", "interviews completed", "interview done"] },
  { filter: "Follow-ups Due", aliases: ["follow ups due", "follow up due", "followups due"] },
  { filter: "Cold Emails Sent", aliases: ["cold emails sent", "cold email sent"] },
  {
    filter: "Hiring Managers Contacted",
    aliases: ["hiring managers contacted", "contacts reached", "contact reached"],
  },
  { filter: "Interviewing", aliases: ["interviewing", "upcoming interviews", "interviews"] },
  { filter: "Offers", aliases: ["offer", "offers", "offers received"] },
  { filter: "Saved", aliases: ["saved", "saved jobs", "bookmarked", "bookmarks"] },
  { filter: "Hired", aliases: ["hired"] },
  { filter: "Rejected", aliases: ["rejected"] },
  {
    filter: "Applied",
    aliases: ["applied", "application", "applications", "applied jobs", "all applications"],
  },
];

const serviceAliases: Array<{ pathname: string; aliases: string[] }> = [
  {
    pathname: "/(app)/resume",
    aliases: ["resume", "resume ai", "resume intelligence", "resume score"],
  },
  {
    pathname: "/(app)/outreach",
    aliases: ["outreach", "hiring manager outreach", "recruiter outreach"],
  },
  {
    pathname: "/(app)/interview",
    aliases: ["interview prep", "interview preparation", "mock interview"],
  },
  {
    pathname: "/(app)/stories",
    aliases: ["success stories", "stories"],
  },
  {
    pathname: "/(app)/pricing",
    aliases: ["pricing", "pricing plans", "plans"],
  },
  {
    pathname: "/(app)/services",
    aliases: ["services", "all services"],
  },
  {
    pathname: "/(app)/tracker",
    aliases: ["tracker", "job tracker", "job application service"],
  },
];

function normalizeSearchTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export function resolveHomeSearchDestination(query: string): HomeSearchDestination {
  const normalizedQuery = normalizeSearchTerm(query);

  const trackerMatch = trackerAliases.find(({ aliases }) => aliases.includes(normalizedQuery));
  if (trackerMatch) {
    return {
      pathname: "/(app)/tracker-details",
      params: { filter: trackerMatch.filter },
    };
  }

  const serviceMatch = serviceAliases.find(({ aliases }) => aliases.includes(normalizedQuery));
  if (serviceMatch) {
    return { pathname: serviceMatch.pathname };
  }

  return {
    pathname: "/(app)/jobs/search",
    params: normalizedQuery ? { query: query.trim() } : undefined,
  };
}
