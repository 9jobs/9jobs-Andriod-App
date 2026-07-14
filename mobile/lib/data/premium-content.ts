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
  },
  {
    title: "Sydney",
    subtitle: "Finance, enterprise, and product roles aligned to NSW recruiter expectations.",
    badge: "NSW",
    detail: "Top market",
  },
  {
    title: "Brisbane",
    subtitle: "Growth across infrastructure, tourism, and technology hiring pipelines.",
    badge: "QLD",
    detail: "Growing",
  },
  {
    title: "Perth",
    subtitle: "Mining, engineering, and logistics-focused opportunity targeting.",
    badge: "WA",
    detail: "Regional",
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
