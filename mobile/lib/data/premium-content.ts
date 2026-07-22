import type { Job } from "@/types/jobs";

export type PremiumListItem = {
  title: string;
  subtitle: string;
  badge?: string;
  detail?: string;
  href?: string;
};

export type PremiumScreenContent = {
  key: string;
  title: string;
  subtitle: string;
  kicker: string;
  primaryCta?: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  highlights: string[];
  sections: Array<{
    title: string;
    body?: string;
    items?: PremiumListItem[];
  }>;
};

export const australiaMarkets: PremiumListItem[] = [
  {
    title: "Melbourne",
    subtitle: "Tech, operations, and commercial opportunities with localized resume targeting.",
    badge: "VIC",
    detail: "Explore",
    href: "/(app)/about-detail?type=city&id=melbourne",
  },
  {
    title: "Sydney",
    subtitle: "Finance, enterprise, and product roles aligned to NSW recruiter expectations.",
    badge: "NSW",
    detail: "Top market",
    href: "/(app)/about-detail?type=city&id=sydney",
  },
  {
    title: "Brisbane",
    subtitle: "Growth across infrastructure, tourism, and technology hiring pipelines.",
    badge: "QLD",
    detail: "Growing",
    href: "/(app)/about-detail?type=city&id=brisbane",
  },
  {
    title: "Perth",
    subtitle: "Mining, engineering, and logistics-focused opportunity targeting.",
    badge: "WA",
    detail: "Regional",
    href: "/(app)/about-detail?type=city&id=perth",
  },
  {
    title: "Adelaide",
    subtitle: "Health care, administration, and government-friendly applications for SA roles.",
    badge: "SA",
    detail: "Steady market",
    href: "/(app)/about-detail?type=city&id=adelaide",
  },
  {
    title: "Geelong",
    subtitle: "Regional Victoria targeting for operations, support, and logistics hiring demand.",
    badge: "VIC",
    detail: "Local opportunities",
    href: "/(app)/about-detail?type=city&id=geelong",
  },
  {
    title: "Australia Wide",
    subtitle: "Remote and all-major-city coverage for candidates targeting flexible opportunities.",
    badge: "AU",
    detail: "Remote friendly",
    href: "/(app)/about-detail?type=city&id=australia-wide",
  },
];

export const aboutServicePillars: PremiumListItem[] = [
  {
    title: "ATS Resume Writing",
    subtitle: "Get ATS-friendly resumes that pass ATS screening systems.",
    detail: "Resume strategy, keyword alignment, and recruiter-ready formatting.",
    href: "/(app)/about-detail?type=service&id=ats-resume-writing",
  },
  {
    title: "LinkedIn Optimization",
    subtitle: "Boost your profile and attract the right recruiters faster.",
    detail: "Headline, about section, keywords, and positioning for stronger discoverability.",
    href: "/(app)/about-detail?type=service&id=linkedin-optimization",
  },
  {
    title: "Job Applications",
    subtitle: "We apply to 20+ relevant jobs daily on your behalf.",
    detail: "Targeted sourcing, tailored submissions, and daily pipeline momentum.",
    href: "/(app)/about-detail?type=service&id=job-applications",
  },
  {
    title: "Interview Support",
    subtitle: "Prepare with coaching, mock interviews, and expert tips.",
    detail: "Practice, answer refinement, and confidence building for AU hiring rounds.",
    href: "/(app)/about-detail?type=service&id=interview-support",
  },
  {
    title: "Weekly Tracking",
    subtitle: "Track applications, responses, and interview updates.",
    detail: "Clean reporting across submissions, recruiter replies, and next-step planning.",
    href: "/(app)/about-detail?type=service&id=weekly-tracking",
  },
];

export const aboutWhyChooseItems: PremiumListItem[] = [
  {
    title: "Proven Results",
    subtitle: "Helping job seekers land interviews faster.",
    detail: "Structured resume, profile, and application support focused on measurable outcomes.",
  },
  {
    title: "Expert Team",
    subtitle: "Experienced professionals who care.",
    detail: "Resume writers, application specialists, and career support working together.",
  },
  {
    title: "Time-Saving",
    subtitle: "We handle the job search, you focus on prep.",
    detail: "Less admin work for you, more consistent action across your pipeline.",
  },
  {
    title: "Australia Focused",
    subtitle: "Specialized strategies for the AU job market.",
    detail: "Localized positioning for recruiters, platforms, and application expectations.",
  },
];

export type AboutDetailContent = {
  id: string;
  type: "service" | "city";
  title: string;
  kicker: string;
  subtitle: string;
  overview: string;
  points: string[];
  ctaLabel: string;
  ctaHref: string;
};

const aboutDetailEntries: AboutDetailContent[] = [
  {
    id: "ats-resume-writing",
    type: "service",
    title: "ATS Resume Writing",
    kicker: "SERVICE DETAIL",
    subtitle: "A resume built to pass automated screening and still read strongly for Australian recruiters.",
    overview: "We strengthen structure, keywords, measurable achievements, and role fit so your resume clears ATS filters and feels sharper to hiring teams.",
    points: [
      "Resume sections are rebuilt for cleaner ATS parsing and recruiter scanning.",
      "Role keywords are aligned to the target market and job family.",
      "Bullet points are rewritten around outcomes, impact, and relevance.",
    ],
    ctaLabel: "Open Resume Service",
    ctaHref: "/(app)/resume",
  },
  {
    id: "linkedin-optimization",
    type: "service",
    title: "LinkedIn Optimization",
    kicker: "SERVICE DETAIL",
    subtitle: "A stronger LinkedIn presence designed to improve recruiter visibility and credibility.",
    overview: "We refine your headline, summary, experience, and search-facing keywords so your profile better supports your resume and attracts the right attention.",
    points: [
      "Headline and summary positioning are matched to your target roles.",
      "Experience entries are upgraded for clarity, impact, and discoverability.",
      "Platform keywords are improved for local search relevance.",
    ],
    ctaLabel: "Open Outreach Tools",
    ctaHref: "/(app)/outreach",
  },
  {
    id: "job-applications",
    type: "service",
    title: "Job Applications",
    kicker: "SERVICE DETAIL",
    subtitle: "Hands-on application support that keeps your job-search pipeline active every day.",
    overview: "We source suitable roles, manage submissions, and keep your application flow moving so your search stays consistent instead of stopping after a few attempts.",
    points: [
      "Relevant openings are shortlisted from the platforms you are targeting.",
      "Applications are submitted in a structured, trackable workflow.",
      "Daily activity helps build stronger momentum across the week.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "interview-support",
    type: "service",
    title: "Interview Support",
    kicker: "SERVICE DETAIL",
    subtitle: "Coaching and practice that helps you answer with more confidence and structure.",
    overview: "We help you prepare for common interview formats, sharpen your examples, and walk in with clearer stories for behavioral and role-specific questions.",
    points: [
      "Mock questions help you rehearse concise and relevant responses.",
      "Answer structure is improved through practice and feedback.",
      "Follow-up preparation keeps momentum strong after the interview.",
    ],
    ctaLabel: "Open Interview Prep",
    ctaHref: "/(app)/interview",
  },
  {
    id: "weekly-tracking",
    type: "service",
    title: "Weekly Tracking",
    kicker: "SERVICE DETAIL",
    subtitle: "Clear weekly visibility into applications, responses, and next actions.",
    overview: "We keep your progress organized so you can quickly understand what has been applied, where responses are coming from, and what needs follow-up next.",
    points: [
      "Applications and updates are captured in one simple workflow.",
      "Response tracking reduces missed follow-ups and duplicated effort.",
      "Weekly visibility makes decision-making easier and faster.",
    ],
    ctaLabel: "Open Tracker",
    ctaHref: "/(app)/tracker",
  },
  {
    id: "melbourne",
    type: "city",
    title: "Melbourne",
    kicker: "CITY DETAIL",
    subtitle: "VIC market coverage focused on tech, operations, and commercial roles.",
    overview: "Melbourne hiring often rewards tailored positioning, a clear value story, and polished resume presentation across professional, operational, and growth teams.",
    points: [
      "Targeting is adjusted for local recruiter expectations and role language.",
      "Applications are positioned around relevant city-based demand.",
      "Resume alignment helps support both corporate and scaling-company roles.",
    ],
    ctaLabel: "Explore Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "sydney",
    type: "city",
    title: "Sydney",
    kicker: "CITY DETAIL",
    subtitle: "NSW role targeting for finance, enterprise, product, and high-competition hiring tracks.",
    overview: "Sydney applications benefit from sharper positioning and strong market fit because the competition is often faster-moving and more expectation-heavy across white-collar roles.",
    points: [
      "Applications are tuned for enterprise and recruiter-led search patterns.",
      "Profile strength matters more when multiple strong candidates are competing.",
      "Role fit and career story need to be communicated quickly and clearly.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "brisbane",
    type: "city",
    title: "Brisbane",
    kicker: "CITY DETAIL",
    subtitle: "QLD support across infrastructure, tourism, and technology hiring pipelines.",
    overview: "Brisbane offers a broad mix of practical, service, and growth-sector opportunities where clean positioning and consistent activity can create strong momentum.",
    points: [
      "Targeting is balanced across stable industries and expanding teams.",
      "Resume messaging is matched to practical role requirements and outcomes.",
      "Application consistency helps unlock faster pipeline movement.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "perth",
    type: "city",
    title: "Perth",
    kicker: "CITY DETAIL",
    subtitle: "WA coverage for mining, engineering, logistics, and regional opportunity pathways.",
    overview: "Perth roles often reward clear technical relevance, operational credibility, and direct communication around experience, safety, and role readiness.",
    points: [
      "Applications are tuned for industry-specific experience and job expectations.",
      "Practical fit and role readiness are emphasized in the positioning.",
      "Regional and logistics-heavy opportunities are supported with targeted messaging.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "adelaide",
    type: "city",
    title: "Adelaide",
    kicker: "CITY DETAIL",
    subtitle: "SA support for health care, administration, public-sector, and steady-growth hiring lanes.",
    overview: "Adelaide opportunities often value clarity, trust, and well-structured experience, especially for support, public-facing, and stable-sector roles.",
    points: [
      "Resume and profile alignment focus on reliability and relevance.",
      "Applications are shaped for sectors with process-driven expectations.",
      "Support extends across both private and government-adjacent opportunities.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "geelong",
    type: "city",
    title: "Geelong",
    kicker: "CITY DETAIL",
    subtitle: "Regional VIC support for logistics, support, operations, and local opportunity clusters.",
    overview: "Geelong applications benefit from practical relevance, local-fit messaging, and a clear explanation of how your experience transfers into regional demand.",
    points: [
      "Local-fit positioning improves visibility for regional opportunities.",
      "Operations and support experience are highlighted more directly.",
      "Applications are shaped for smaller-market competition and accessibility.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "australia-wide",
    type: "city",
    title: "Australia Wide",
    kicker: "CITY DETAIL",
    subtitle: "National support for remote, hybrid, and all-major-city opportunities across Australia.",
    overview: "For candidates applying broadly, we help create a consistent story that travels well across cities while still staying relevant to different market needs.",
    points: [
      "Applications are managed across multiple cities without losing consistency.",
      "Remote and hybrid opportunities are included where relevant.",
      "Your resume and profile are positioned to stay flexible across broader search targets.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
];

export const processSteps: PremiumListItem[] = [
  {
    title: "Onboarding",
    subtitle: "Share your career goals, experience, and role targets so the workflow starts in the right lane.",
    badge: "01",
  },
  {
    title: "Resume optimization",
    subtitle: "ATS-ready resume, LinkedIn, SEEK, and Jora alignment built for Australian hiring systems.",
    badge: "02",
  },
  {
    title: "Daily job applications",
    subtitle: "Targeted matched roles are sourced and submitted to keep your pipeline active every day.",
    badge: "03",
  },
  {
    title: "Tracking and updates",
    subtitle: "Excel tracking, screenshots, and WhatsApp-style updates keep the entire search transparent.",
    badge: "04",
  },
];

export const testimonialHighlights: PremiumListItem[] = [
  {
    title: "Nafisa",
    subtitle: "Professional, responsive, and truly supportive through the whole process.",
    badge: "Verified",
    detail: "Client",
  },
  {
    title: "Lachlan",
    subtitle: "Job application automation saved time and led to three interview calls in two weeks.",
    badge: "Verified",
    detail: "Client",
  },
  {
    title: "Sarah",
    subtitle: "Resume was overhauled for Australian ATS standards and responses improved quickly.",
    badge: "Verified",
    detail: "Client",
  },
  {
    title: "Oliver",
    subtitle: "LinkedIn and SEEK optimization made the profile feel far more recruiter-ready.",
    badge: "Verified",
    detail: "Client",
  },
];

export const pricingPlans: PremiumListItem[] = [
  {
    title: "1 Day Trial",
    subtitle: "A low-friction way to experience the workflow and see how 9Jobs handles job search operations.",
    badge: "Start here",
  },
  {
    title: "Startups",
    subtitle: "Resume and profile polishing plus a lighter-touch application support flow.",
    badge: "Plan",
  },
  {
    title: "Mid-size",
    subtitle: "Balanced support with stronger application volume, profile optimization, and tracking.",
    badge: "Popular",
  },
  {
    title: "Enterprise",
    subtitle: "Premium application management, recruiter outreach support, and interview momentum tools.",
    badge: "Executive",
  },
];

export const quickActions = [
  {
    label: "Resume AI",
    icon: "resume" as const,
    href: "/(app)/resume",
  },
  {
    label: "Outreach",
    icon: "mail" as const,
    href: "/(app)/outreach",
  },
  {
    label: "Interview",
    icon: "mic" as const,
    href: "/(app)/interview",
  },
  {
    label: "Services",
    icon: "grid" as const,
    href: "/(app)/services",
  },
];

export const homeMetrics = [
  { label: "Applications", value: "24", delta: "+3" },
  { label: "Interviews", value: "7", delta: "+2" },
  { label: "Offers", value: "2", delta: "+1" },
  { label: "Resume Score", value: "97", delta: "+4" },
];

export const serviceCards = [
  {
    title: "Resume Rewrite",
    subtitle: "ATS-safe structure and quantified bullet upgrades",
    badge: "Fastest win",
    href: "/(app)/resume",
  },
  {
    title: "Recruiter Outreach",
    subtitle: "Sequenced messages tuned by role, market, and seniority",
    badge: "High response",
    href: "/(app)/outreach",
  },
  {
    title: "Interview Prep",
    subtitle: "Role-specific prompts with confidence loops and notes",
    badge: "Most booked",
    href: "/(app)/interview",
  },
  {
    title: "Premium Pro",
    subtitle: "Unlock stories, alerts, and priority support in one plan",
    badge: "Upgrade",
    href: "/(app)/pricing",
  },
];

export const notificationsFeed: PremiumListItem[] = [
  {
    title: "Nadia Thompson scheduled an interview",
    subtitle: "Interview scheduling is ready and follow-up prep has moved into the live queue.",
    badge: "New",
    detail: "5 min ago",
    href: "/(app)/interview",
  },
  {
    title: "Alex Marshall optimized a resume",
    subtitle: "ATS readability and recruiter alignment were updated across the active draft.",
    badge: "AI",
    detail: "1h ago",
    href: "/(app)/resume",
  },
  {
    title: "Sophia R. updated LinkedIn and SEEK",
    subtitle: "Profile visibility changes are live and discoverability has been refreshed.",
    badge: "Signal",
    detail: "3h ago",
    href: "/(app)/outreach",
  },
];

export const storiesFeed: PremiumListItem[] = [
  {
    title: "Nafisa",
    subtitle: "Professional, responsive, and truly supportive through the whole process.",
    badge: "Verified Client",
  },
  {
    title: "Lachlan",
    subtitle: "Automation saved hours every week and led to three interview calls in two weeks.",
    badge: "Automation win",
  },
  {
    title: "Amelia",
    subtitle: "Interview coaching built confidence for tough questions and helped secure a role.",
    badge: "Interview prep",
  },
];

export const messageThreads: PremiumListItem[] = [
  {
    title: "Premium Support",
    subtitle: "Your resume review is ready. Open the updated version here.",
    badge: "Support",
    detail: "Now",
    href: "/(app)/resume",
  },
  {
    title: "Applications Team",
    subtitle: "12 jobs were sent across SEEK, LinkedIn, and Jora. Tracking sheet updated.",
    badge: "Ops",
    detail: "12m",
    href: "/(app)/tracker",
  },
  {
    title: "Interview Mentor",
    subtitle: "Let's tighten your STAR answer before the next Australian hiring panel.",
    badge: "Mentor",
    detail: "2h",
    href: "/(app)/interview",
  },
];

export const profileLinks: PremiumListItem[] = [
  {
    title: "Settings",
    subtitle: "Alerts, biometrics, and personal preferences",
    href: "/(app)/settings",
  },
  {
    title: "About 9Jobs",
    subtitle: "What the premium workflow is designed to improve",
    href: "/(app)/about",
  },
  {
    title: "Contact",
    subtitle: "Get in touch for support, reviews, and custom help",
    href: "/(app)/contact",
  },
  {
    title: "All screens",
    subtitle: "Open every page layout directly while testing",
    href: "/(app)/screens",
  },
];

const premiumScreens: Record<string, PremiumScreenContent> = {
  resume: {
    key: "resume",
    title: "Resume Writing Australia",
    subtitle: "ATS-friendly resumes written for Australian recruiter expectations and local keyword matching.",
    kicker: "RESUME OPTIMIZATION",
    primaryCta: { label: "View pricing options", href: "/(app)/pricing" },
    secondaryCta: { label: "Open tracker", href: "/(app)/tracker" },
    highlights: ["ATS-ready", "Local keywords", "Recruiter aligned"],
    sections: [
      {
        title: "Top improvements",
        items: [
          {
            title: "Australian recruiter formatting",
            subtitle: "Achievement-led bullet structure with cleaner scanning for local hiring teams.",
            badge: "Priority",
          },
          {
            title: "ATS keyword alignment",
            subtitle: "Role-specific terms are mapped against SEEK, LinkedIn, Jora, and Indeed searches.",
            badge: "AI",
          },
        ],
      },
      {
        title: "Next action",
        body: "Use the optimized resume as the base asset for profile updates and daily application support.",
      },
    ],
  },
  outreach: {
    key: "outreach",
    title: "Job Application Support",
    subtitle: "Structured job sourcing and application support to keep your role pipeline active across Australia.",
    kicker: "APPLICATION SUPPORT",
    primaryCta: { label: "View services", href: "/(app)/services" },
    secondaryCta: { label: "Check alerts", href: "/(app)/notifications" },
    highlights: ["20+ jobs daily", "Excel tracking", "Daily updates"],
    sections: [
      {
        title: "Workflow support",
        items: [
          {
            title: "Targeted sourcing",
            subtitle: "Matched roles are identified across SEEK, LinkedIn, and Jora.",
            badge: "Active",
          },
          {
            title: "Daily progress reporting",
            subtitle: "Status, screenshots, and role history stay transparent from day one.",
            badge: "Tracked",
          },
        ],
      },
    ],
  },
  interview: {
    key: "interview",
    title: "Interview Coaching",
    subtitle: "Mock interview practice, STAR answer coaching, and follow-up support for Australian hiring processes.",
    kicker: "INTERVIEW MOMENTUM",
    primaryCta: { label: "Start mock round", href: "/(app)/messages" },
    secondaryCta: { label: "Open stories", href: "/(app)/stories" },
    highlights: ["Mock rounds", "STAR coaching", "Follow-up prep"],
    sections: [
      {
        title: "Upcoming focus",
        items: [
          {
            title: "Behavioral answer rehearsal",
            subtitle: "Prepare concise stories for leadership, conflict, ambiguity, and ownership.",
            badge: "Next session",
          },
          {
            title: "Australian panel confidence",
            subtitle: "Tough questions are practiced in a format closer to local interview expectations.",
            badge: "Coaching",
          },
        ],
      },
    ],
  },
  pricing: {
    key: "pricing",
    title: "A plan for anyone, anytime",
    subtitle: "Choose the level of support that matches your job-search stage and urgency.",
    kicker: "UPGRADE",
    primaryCta: { label: "Start Pro plan", href: "/(app)/contact" },
    secondaryCta: { label: "Talk to support", href: "/(app)/contact" },
    highlights: ["1 Day Trial", "Mid-size", "Enterprise"],
    sections: [
      {
        title: "Plan options",
        items: pricingPlans,
      },
    ],
  },
  stories: {
    key: "stories",
    title: "Success Stories",
    subtitle: "Read what real candidates said after using 9Jobs support across resumes, applications, and interviews.",
    kicker: "SUCCESS STORIES",
    primaryCta: { label: "See interview prep", href: "/(app)/interview" },
    highlights: ["Verified clients", "Real outcomes", "Australian market"],
    sections: [
      {
        title: "Client highlights",
        items: storiesFeed,
      },
      {
        title: "More feedback",
        items: testimonialHighlights,
      },
    ],
  },
  notifications: {
    key: "notifications",
    title: "Notifications",
    subtitle: "Every important signal from resume edits, profile optimization, applications, and interviews in one feed.",
    kicker: "ALERT CENTER",
    primaryCta: { label: "Open messages", href: "/(app)/messages" },
    highlights: ["Resume updates", "Interview alerts", "Profile changes"],
    sections: [
      {
        title: "Recent activity",
        items: notificationsFeed,
      },
    ],
  },
  settings: {
    key: "settings",
    title: "Settings",
    subtitle: "Tune alerts, security, and support preferences for a cleaner 9Jobs workflow.",
    kicker: "PREFERENCES",
    primaryCta: { label: "Contact support", href: "/(app)/contact" },
    highlights: ["Alerts", "Biometrics", "Account"],
    sections: [
      {
        title: "What you can control",
        items: [
          {
            title: "Notifications",
            subtitle: "Choose which signals deserve instant attention.",
          },
          {
            title: "Security",
            subtitle: "Enable biometric unlock and control session behavior.",
          },
        ],
      },
    ],
  },
  about: {
    key: "about",
    title: "About 9Jobs",
    subtitle: "A job-search partner built around resume optimization, profile upgrades, and active application support in Australia.",
    kicker: "PRODUCT STORY",
    primaryCta: { label: "View services", href: "/(app)/services" },
    highlights: ["Resume", "Applications", "Australian market"],
    sections: [
      {
        title: "Why it exists",
        body: "9Jobs manages the highest-friction parts of job search work: resume optimization, profile updates, application activity, and interview preparation.",
      },
      {
        title: "How the process works",
        items: processSteps,
      },
      {
        title: "Australian job markets",
        items: australiaMarkets,
      },
    ],
  },
  contact: {
    key: "contact",
    title: "Contact",
    subtitle: "Reach support, request a review, or book a demo for the full 9Jobs workflow.",
    kicker: "GET SUPPORT",
    primaryCta: { label: "Open messages", href: "/(app)/messages" },
    highlights: ["Get a demo", "Resume reviews", "Account help"],
    sections: [
      {
        title: "Fastest ways to reach us",
        items: [
          {
            title: "Premium support chat",
            subtitle: "Best for urgent workflow issues, application updates, and next-step guidance.",
            badge: "Fastest",
          },
          {
            title: "Get a demo",
            subtitle: "Book a walkthrough of the resume, application, and interview support workflow.",
            badge: "Demo",
          },
          {
            title: "Resume review request",
            subtitle: "Send your target role and latest CV for deeper feedback tailored to Australia.",
            badge: "Review",
          },
        ],
      },
    ],
  },
};

export function getPremiumScreenContent(key: string) {
  return premiumScreens[key] ?? null;
}

export function getAboutDetailContent(type: string, id: string) {
  return aboutDetailEntries.find((entry) => entry.type === type && entry.id === id) ?? null;
}

export function getQuickActionRoutes() {
  return quickActions;
}

export function getTrackerSummary(jobs: Job[]) {
  return {
    applied: jobs.filter((job) => job.isApplied).length,
    interviewing: jobs.filter((job) => job.status === "interviewing").length,
    offers: jobs.filter((job) => job.status === "offer").length,
    saved: jobs.filter((job) => job.isSaved).length,
  };
}
