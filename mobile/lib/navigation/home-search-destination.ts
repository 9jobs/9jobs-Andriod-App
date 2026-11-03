type HomeSearchDestination = {
  pathname: string;
  params?: Record<string, string>;
};

const trackerAliases: Array<{ filter: string; aliases: string[] }> = [
  { filter: "Applications Today", aliases: ["applications today", "applied today", "today applications"] },
  { filter: "Recruiter Contacted", aliases: ["recruiter contacted", "recruiters contacted", "recruiter", "recuirter contacted", "recruiter contacts"] },
  { filter: "Shortlisted", aliases: ["shortlisted", "shortlist", "sortlisted", "sortlist"] },
  { filter: "Interview Completed", aliases: ["interview completed", "interviews completed", "interview done"] },
  { filter: "Follow-ups Due", aliases: ["follow ups due", "follow up due", "followups due"] },
  { filter: "Cold Emails Sent", aliases: ["cold emails sent", "cold email sent", "email", "emails", "sent email"] },
  {
    filter: "Hiring Managers Contacted",
    aliases: ["hiring managers contacted", "contacts reached", "contact reached"],
  },
  { filter: "Interviewing", aliases: ["interviewing", "upcoming interviews", "interviews"] },
  { filter: "Offers", aliases: ["offer", "offers", "offers received"] },
  { filter: "Saved", aliases: ["saved", "saved jobs", "bookmarked", "bookmarks"] },
  { filter: "Hired", aliases: ["hired", "hired jobs", "hiring", "accepted jobs"] },
  { filter: "Rejected", aliases: ["rejected", "rejected jobs", "rejections"] },
  {
    filter: "Applied",
    aliases: ["applied", "application", "applications", "applied job", "applied jobs", "all applications", "job applications"],
  },
];

const serviceAliases: Array<{ pathname: string; aliases: string[] }> = [
  {
    pathname: "/(app)/resume",
    aliases: ["resume", "resume ai", "resume intelligence", "resume score"],
  },
  {
    pathname: "/(app)/outreach",
    aliases: ["outreach", "hiring manager outreach", "recruiter outreach", "email", "emails", "email outreach"],
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
    aliases: ["pricing", "pricing plans", "plans", "price", "subscription", "payment", "cost"],
  },
  {
    pathname: "/(app)/services",
    aliases: ["services", "all services"],
  },
  {
    pathname: "/(app)/tracker",
    aliases: ["tracker", "job tracker", "job application service"],
  },
  { pathname: "/(app)/profile", aliases: ["profile", "my profile", "personal information"] },
  { pathname: "/(app)/messages", aliases: ["chat", "messages", "admin", "support chat"] },
  { pathname: "/(app)/settings", aliases: ["settings", "preferences", "password", "security"] },
  { pathname: "/(app)/notifications", aliases: ["notifications", "alerts"] },
  { pathname: "/(app)/about", aliases: ["about", "about us", "aboutus", "company information"] },
  { pathname: "/(app)/contact", aliases: ["contact", "contact us", "help", "support"] },
];

type SearchIcon = "tracker" | "resume" | "mail" | "mic" | "story" | "spark" | "grid" | "profile" | "settings" | "bell" | "info";
export type AppSearchResult = { id: string; label: string; detail: string; icon: SearchIcon; destination: HomeSearchDestination };
const serviceInfo: Record<string, { label: string; icon: SearchIcon }> = {
  resume: { label: "Resume AI", icon: "resume" }, outreach: { label: "Hiring Manager Outreach", icon: "mail" },
  interview: { label: "Interview Prep", icon: "mic" }, stories: { label: "Success Stories", icon: "story" },
  pricing: { label: "Pricing & Plans", icon: "spark" }, services: { label: "Services", icon: "grid" },
  tracker: { label: "Job Tracker", icon: "tracker" }, profile: { label: "Profile", icon: "profile" },
  messages: { label: "Chat", icon: "mail" }, settings: { label: "Settings", icon: "settings" },
  notifications: { label: "Notifications", icon: "bell" }, about: { label: "About Us", icon: "info" },
  contact: { label: "Contact Us", icon: "mail" },
};

const sectionIndex = [
  ...trackerAliases.map(({ filter, aliases }) => ({
    id: `tracker:${filter}`, label: filter === "Applied" ? "Applied Jobs / Applications" : filter,
    detail: "Job Tracker", icon: "tracker" as SearchIcon, aliases,
    destination: { pathname: "/(app)/tracker-details", params: { filter } } as HomeSearchDestination,
  })),
  ...serviceAliases.map(({ pathname, aliases }) => ({
    id: pathname, ...serviceInfo[pathname.split("/").pop()!], detail: "App section", aliases,
    destination: { pathname } as HomeSearchDestination,
  })),
];

export function searchAppSections(query: string): AppSearchResult[] {
  const normalized = normalizeSearchTerm(query);
  if (!normalized) return [];
  const words = normalized.split(" ").filter(word => !["search", "find", "show", "my", "all"].includes(word));
  if (!words.length) return [];
  return sectionIndex.map(section => {
    const candidates = [...section.aliases, section.label].map(normalizeSearchTerm);
    const score = candidates.includes(normalized) ? 100 : Math.max(0, ...candidates.map(candidate => {
      const tokens = candidate.split(" ");
      return words.every(word => tokens.some(token => token.startsWith(word) || (word.length > 3 && word === `${token}s`))) ? 50 : 0;
    }));
    return { section, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ section: { aliases: _aliases, ...result } }) => result);
}

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
