export type PricingPlan = {
  id: string;
  title: string;
  description: string;
  highlights?: string[];
  price: string;
  cadence: string;
  features: string[];
  accent: "light" | "dark";
  badge: string | null;
  secondaryCta: string | null;
};

export const weeklySupportPlans: PricingPlan[] = [
  {
    id: "trial", title: "Trial Plan", price: "AUD $49",
    cadence: "/ 2 days · One-time payment",
    description: "Experience our complete job application process with no commitment.",
    features: [
      "2-day guided job application trial",
      "Australian job search & application demo",
      "Resume review",
      "Cover letter support",
      "LinkedIn, SEEK, Indeed & Jora workflow overview",
      "Applications submitted on your behalf",
      "2-day support window",
    ],
    accent: "light", badge: null, secondaryCta: "Get a schedule",
  },
  {
    id: "standard", title: "Standard Plan", price: "AUD $149",
    cadence: "/ week · Recurring billing",
    description: "100+ Job Applications / Week",
    highlights: ["Just A$1.49 per application (before GST)"],
    features: [
      "100+ targeted job applications every week",
      "Professional resume creation & optimization",
      "Tailored cover letter creation",
      "LinkedIn optimization",
      "SEEK, Indeed & Jora profile optimization",
      "Applications submitted on your behalf",
      "Weekly progress tracking",
      "Dedicated job-search support",
    ],
    accent: "light", badge: null, secondaryCta: "Get a schedule",
  },
  {
    id: "premium", title: "Premium Plan", price: "AUD $1,499",
    cadence: "/ one-time payment · 2 months",
    description: "Everything managed for your job search",
    features: [
      "Everything in Standard",
      "Dedicated job-search manager",
      "Resume creation and updates",
      "Tailored cover letter creation",
      "LinkedIn, SEEK, Indeed & Jora optimization",
      "Priority application management",
      "Custom job targeting strategy",
      "Weekly progress updates and tracking",
      "1 interview free preparation session",
      "10 interview opportunities target",
    ],
    accent: "dark", badge: null, secondaryCta: "Get a schedule",
  },
];

export const optimizationPlans: PricingPlan[] = [
  {
    id: "resume-makeover", title: "Resume Makeover", price: "AUD $49", cadence: "/ one-time",
    description: "Professional resume redesign tailored for ATS systems to get you noticed.",
    features: [
      "Resume redesign (ATS-friendly)",
      "Optimized formatting & structure",
      "Grammar & wording improvements",
      "Industry-specific keyword optimization",
      "Achievement-focused content",
      "PDF delivery (ATS & Recruiter friendly)",
    ],
    accent: "dark", badge: null, secondaryCta: null,
  },
  {
    id: "resume-linkedin-seek", title: "Resume, LinkedIn & SEEK Optimisation", price: "AUD $89", cadence: "/ one-time",
    description: "Complete professional branding to boost your Resume, LinkedIn, and SEEK profile visibility.",
    features: [
      "Everything in Resume Makeover",
      "LinkedIn profile optimization",
      "SEEK profile optimization",
      "Headline & About section rewrite",
      "Experience & skills enhancement",
      "ATS & search keyword targeting",
      "Profile visibility improvements",
      "PDF delivery + profile guides",
    ],
    accent: "light", badge: null, secondaryCta: null,
  },
];
