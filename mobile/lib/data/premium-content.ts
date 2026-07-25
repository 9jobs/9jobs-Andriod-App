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
    title: "Sydney",
    subtitle: "Finance, enterprise, technology, and commercial roles aligned to NSW recruiter expectations.",
    badge: "NSW",
    detail: "Top market",
    href: "/(app)/about-detail?type=city&id=sydney",
  },
  {
    title: "Melbourne",
    subtitle: "Tech, creative, operations, and corporate opportunities with localized resume targeting.",
    badge: "VIC",
    detail: "Major hub",
    href: "/(app)/about-detail?type=city&id=melbourne",
  },
  {
    title: "Brisbane",
    subtitle: "Growth across infrastructure, energy, healthcare, and technology hiring pipelines.",
    badge: "QLD",
    detail: "High growth",
    href: "/(app)/about-detail?type=city&id=brisbane",
  },
  {
    title: "Perth",
    subtitle: "Mining, engineering, resources, and logistics-focused opportunity targeting.",
    badge: "WA",
    detail: "Resources hub",
    href: "/(app)/about-detail?type=city&id=perth",
  },
  {
    title: "Adelaide",
    subtitle: "Healthcare, defence, administration, and government-adjacent roles in SA.",
    badge: "SA",
    detail: "Steady market",
    href: "/(app)/about-detail?type=city&id=adelaide",
  },
  {
    title: "Canberra",
    subtitle: "Federal government, ICT consulting, cyber security, and policy opportunities in ACT.",
    badge: "ACT",
    detail: "Gov & Cyber",
    href: "/(app)/about-detail?type=city&id=canberra",
  },
  {
    title: "Hobart",
    subtitle: "Renewable energy, tourism, environmental science, and public sector roles in TAS.",
    badge: "TAS",
    detail: "Emerging",
    href: "/(app)/about-detail?type=city&id=hobart",
  },
  {
    title: "Darwin",
    subtitle: "Defence, logistics, indigenous affairs, and regional infrastructure roles in NT.",
    badge: "NT",
    detail: "Regional hub",
    href: "/(app)/about-detail?type=city&id=darwin",
  },
  {
    title: "Gold Coast",
    subtitle: "Construction, health, IT startups, and hospitality opportunities in SEQ.",
    badge: "QLD",
    detail: "Coastal hub",
    href: "/(app)/about-detail?type=city&id=gold-coast",
  },
  {
    title: "Newcastle",
    subtitle: "Energy transition, heavy engineering, medical tech, and maritime sector roles.",
    badge: "NSW",
    detail: "Industrial hub",
    href: "/(app)/about-detail?type=city&id=newcastle",
  },
  {
    title: "Geelong",
    subtitle: "Regional Victoria targeting for operations, support, and logistics hiring demand.",
    badge: "VIC",
    detail: "Local market",
    href: "/(app)/about-detail?type=city&id=geelong",
  },
  {
    title: "Australia Wide",
    subtitle: "Remote, hybrid, and all-state coverage for candidates targeting nationwide roles.",
    badge: "AU",
    detail: "Nationwide",
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
    href: "/(app)/about-detail?type=why&id=proven-results",
  },
  {
    title: "Expert Team",
    subtitle: "Experienced professionals who care.",
    detail: "Resume writers, application specialists, and career support working together.",
    href: "/(app)/about-detail?type=why&id=expert-team",
  },
  {
    title: "Time-Saving",
    subtitle: "We handle the job search, you focus on prep.",
    detail: "Less admin work for you, more consistent action across your pipeline.",
    href: "/(app)/about-detail?type=why&id=time-saving",
  },
  {
    title: "Australia Focused",
    subtitle: "Specialized strategies for the AU job market.",
    detail: "Localized positioning for recruiters, platforms, and application expectations.",
    href: "/(app)/about-detail?type=why&id=australia-focused",
  },
];

export const itRolesItems: PremiumListItem[] = [
  {
    title: "Software Developer",
    subtitle: "Full-stack, frontend, backend, & mobile engineering.",
    detail: "Technical positioning, GitHub, system design, and framework clarity for AU tech recruiters.",
    href: "/(app)/about-detail?type=role&id=software-developer",
  },
  {
    title: "Data Analyst",
    subtitle: "SQL, Python, PowerBI, & business intelligence.",
    detail: "Data story, analytical projects, dashboarding, and commercial insights positioning.",
    href: "/(app)/about-detail?type=role&id=data-analyst",
  },
  {
    title: "Cloud Engineer",
    subtitle: "AWS, Azure, DevOps, & infrastructure.",
    detail: "Cloud certifications, CI/CD pipelines, containerization, and enterprise architecture.",
    href: "/(app)/about-detail?type=role&id=cloud-engineer",
  },
  {
    title: "QA Tester",
    subtitle: "Automation, manual, Selenium, & API testing.",
    detail: "Testing frameworks, bug tracking, quality assurance methodologies, and test plan positioning.",
    href: "/(app)/about-detail?type=role&id=qa-tester",
  },
];

export const nonItRolesItems: PremiumListItem[] = [
  {
    title: "Sales Executive",
    subtitle: "B2B, account management, & business development.",
    detail: "Quota achievement, relationship building, CRM workflow, and revenue growth highlights.",
    href: "/(app)/about-detail?type=role&id=sales-executive",
  },
  {
    title: "HR Coordinator",
    subtitle: "Talent acquisition, onboarding, & workplace operations.",
    detail: "Employee lifecycle, HRIS management, compliance, and candidate experience alignment.",
    href: "/(app)/about-detail?type=role&id=hr-coordinator",
  },
  {
    title: "Finance Associate",
    subtitle: "Accounting, financial reporting, & reconciliation.",
    detail: "Xero, MYOB, financial reporting, payroll, and compliance positioning for AU firms.",
    href: "/(app)/about-detail?type=role&id=finance-associate",
  },
  {
    title: "Operations Manager",
    subtitle: "Process optimization, logistics, & team leadership.",
    detail: "Operational efficiency, vendor management, team coordination, and process improvement.",
    href: "/(app)/about-detail?type=role&id=operations-manager",
  },
];

export type AboutDetailContent = {
  id: string;
  type: "service" | "city" | "why" | "role";
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
    id: "canberra",
    type: "city",
    title: "Canberra",
    kicker: "CITY DETAIL",
    subtitle: "ACT market support for Federal Government, ICT consulting, cyber security, and policy roles.",
    overview: "Canberra hiring values clearance readiness, public sector framing, and structured professional experience across government agencies and prime consulting partners.",
    points: [
      "Resume structure is optimized for APS criteria and government contractor frameworks.",
      "Clearance status and consulting capability are prominently positioned.",
      "Targeted submissions for Canberra-based IT, policy, and administration hiring.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "hobart",
    type: "city",
    title: "Hobart",
    kicker: "CITY DETAIL",
    subtitle: "TAS coverage for renewable energy, tourism, environmental science, and public sector positions.",
    overview: "Hobart offers growing opportunities in green energy, state government, and niche industries where clear local relevance yields strong results.",
    points: [
      "Tailored messaging for Tasmanian renewable energy and public sector hiring.",
      "Applications positioned to emphasize long-term commitment and role fit.",
      "Structured resume alignment for local government and private industry.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "darwin",
    type: "city",
    title: "Darwin",
    kicker: "CITY DETAIL",
    subtitle: "NT support for defence, logistics, mining support, and regional infrastructure projects.",
    overview: "Darwin roles reward operational readiness, adaptability, and experience in northern and regional Australian project delivery.",
    points: [
      "Positioning tailored for defence logistics and regional operations.",
      "Resume alignment for infrastructure and community service roles.",
      "Direct targeting for Northern Territory career opportunities.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "gold-coast",
    type: "city",
    title: "Gold Coast",
    kicker: "CITY DETAIL",
    subtitle: "SEQ support for construction, healthcare, tech startups, and hospitality management.",
    overview: "The Gold Coast economy is expanding rapidly into health, technology, and commercial services alongside its traditional construction and tourism sectors.",
    points: [
      "Submissions targeted for fast-growing SEQ health and commercial teams.",
      "Resume positioning for tech startups and digital service roles.",
      "Flexible messaging for local and remote-hybrid opportunities.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "newcastle",
    type: "city",
    title: "Newcastle",
    kicker: "CITY DETAIL",
    subtitle: "Hunter region coverage for energy transition, heavy engineering, health, and maritime sectors.",
    overview: "Newcastle is a major industrial and health hub with strong demand for engineering, clean energy, and healthcare professionals.",
    points: [
      "Industry-aligned resumes for energy, manufacturing, and health networks.",
      "Applications focused on Hunter Region commercial and engineering growth.",
      "Targeted positioning for recruiters in regional NSW.",
    ],
    ctaLabel: "Open Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "proven-results",
    type: "why",
    title: "Proven Results",
    kicker: "WHY CHOOSE 9JOBS",
    subtitle: "Helping job seekers across Australia land interviews faster.",
    overview: "9Jobs combines structured resume refinement, LinkedIn positioning, and active application targeting so candidates get real results instead of sending applications into a void.",
    points: [
      "Resume and profile content optimized for ATS screening and local recruiter expectations.",
      "Targeted daily job submissions to relevant roles across major hiring platforms.",
      "Clear tracking and follow-up management to keep pipeline momentum high.",
    ],
    ctaLabel: "View Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "expert-team",
    type: "why",
    title: "Expert Team",
    kicker: "WHY CHOOSE 9JOBS",
    subtitle: "Experienced professionals who understand Australian recruitment.",
    overview: "Our team of resume writers, application specialists, and career advisors work together to elevate your market presence and present your skills with maximum impact.",
    points: [
      "Dedicated specialists reviewing candidate opportunities daily.",
      "Deep understanding of Australian recruiter expectations across IT and non-IT sectors.",
      "Continuous support throughout your job search journey.",
    ],
    ctaLabel: "Contact Support",
    ctaHref: "/(app)/chat/admin",
  },
  {
    id: "time-saving",
    type: "why",
    title: "Time-Saving",
    kicker: "WHY CHOOSE 9JOBS",
    subtitle: "We handle the job search admin while you focus on interview prep.",
    overview: "Searching for jobs and filling out repetitive application forms takes hours every day. 9Jobs automates and manages your application pipeline so you save time.",
    points: [
      "We apply to relevant roles on your behalf based on your target criteria.",
      "Organized application tracking so you never miss an update or follow-up.",
      "Focus your energy on interview preparation and skill development.",
    ],
    ctaLabel: "Open Tracker",
    ctaHref: "/(app)/tracker",
  },
  {
    id: "australia-focused",
    type: "why",
    title: "Australia Focused",
    kicker: "WHY CHOOSE 9JOBS",
    subtitle: "Specialized strategies tailored for the Australian job market.",
    overview: "Australian recruiters expect specific resume structures, key selection criteria responses, and concise professional summaries. We align your profile to local expectations.",
    points: [
      "Resume, LinkedIn, SEEK, and Jora profile optimization built for Australia.",
      "Targeting across Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra, Hobart, Darwin, and Australia Wide.",
      "Localized communication strategies for candidate outreach.",
    ],
    ctaLabel: "Explore Cities",
    ctaHref: "/(app)/services",
  },
  {
    id: "software-developer",
    type: "role",
    title: "Software Developer",
    kicker: "ROLE COVERAGE",
    subtitle: "Technical clarity for Full-Stack, Frontend, Backend, and Mobile Engineers.",
    overview: "We structure your resume and LinkedIn profile to highlight framework expertise, system architecture, problem-solving skills, and measurable project impact for AU tech recruiters.",
    points: [
      "Technical skills grouped by language, framework, database, and cloud tools.",
      "Project descriptions rewritten to emphasize architectural impact and problem-solving.",
      "GitHub, portfolio, and code sample links seamlessly integrated.",
    ],
    ctaLabel: "Explore Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "data-analyst",
    type: "role",
    title: "Data Analyst",
    kicker: "ROLE COVERAGE",
    subtitle: "Translating data insights, SQL, Python, and PowerBI expertise into commercial value.",
    overview: "We help data professionals present their analytical skills, reporting capabilities, and business intelligence projects in a way that catches recruiter attention.",
    points: [
      "Highlighting key tools: SQL, Python, R, Tableau, PowerBI, and Excel.",
      "Framing analytical projects around business outcomes and decision support.",
      "Clear positioning for junior, mid-level, and senior data roles.",
    ],
    ctaLabel: "Explore Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "cloud-engineer",
    type: "role",
    title: "Cloud Engineer",
    kicker: "ROLE COVERAGE",
    subtitle: "AWS, Azure, DevOps, and Infrastructure engineering positioning.",
    overview: "We align your cloud certifications, CI/CD pipeline experience, and infrastructure-as-code skills to high-demand enterprise tech roles.",
    points: [
      "Prominent placement of AWS, Azure, GCP, and Kubernetes certifications.",
      "Clear summary of DevOps, automation, security, and migration project experience.",
      "Targeted applications to leading Australian enterprise and cloud consultancies.",
    ],
    ctaLabel: "Explore Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "qa-tester",
    type: "role",
    title: "QA Tester",
    kicker: "ROLE COVERAGE",
    subtitle: "Automation and manual testing expertise formatted for quality assurance teams.",
    overview: "We showcase your test framework experience, bug reporting efficiency, and quality assurance methodologies for software teams.",
    points: [
      "Clear distinction between automation (Selenium, Cypress, Playwright) and manual testing.",
      "API testing (Postman, REST) and bug tracking (Jira, TestRail) tools highlighted.",
      "Agile/Scrum team experience emphasized for recruiter review.",
    ],
    ctaLabel: "Explore Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "sales-executive",
    type: "role",
    title: "Sales Executive",
    kicker: "ROLE COVERAGE",
    subtitle: "B2B sales, revenue growth, and account management positioning.",
    overview: "We translate your sales achievements, quota attainments, and pipeline management metrics into compelling highlights for hiring managers.",
    points: [
      "Quantifiable sales results (% quota target, revenue generated, deal sizes).",
      "B2B deal lifecycle, client retention, and CRM workflow (Salesforce, HubSpot) experience.",
      "Clear value proposition tailored for corporate and commercial sales roles.",
    ],
    ctaLabel: "Explore Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "hr-coordinator",
    type: "role",
    title: "HR Coordinator",
    kicker: "ROLE COVERAGE",
    subtitle: "Talent acquisition, onboarding, and HR operations expertise.",
    overview: "We format your employee lifecycle experience, HRIS proficiency, and compliance knowledge to present a well-rounded HR profile.",
    points: [
      "HRIS platforms (Workday, BambooHR, Employment Hero) prominently listed.",
      "Recruitment, onboarding, policy administration, and employee engagement experience.",
      "Strong alignment with Australian workplace regulations and standards.",
    ],
    ctaLabel: "Explore Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "finance-associate",
    type: "role",
    title: "Finance Associate",
    kicker: "ROLE COVERAGE",
    subtitle: "Accounting, financial reporting, and payroll positioning.",
    overview: "We structure your financial reporting, reconciliation, and accounting software experience for Australian business and finance teams.",
    points: [
      "Proficiency in Xero, MYOB, SAP, and advanced Excel modeling highlighted.",
      "Accounts payable/receivable, BAS preparation, and reconciliation experience.",
      "CPA/CA progress or qualifications clearly emphasized.",
    ],
    ctaLabel: "Explore Services",
    ctaHref: "/(app)/services",
  },
  {
    id: "operations-manager",
    type: "role",
    title: "Operations Manager",
    kicker: "ROLE COVERAGE",
    subtitle: "Process optimization, vendor management, and operational leadership.",
    overview: "We position your operational leadership, cost-saving initiatives, and team management accomplishments for senior commercial roles.",
    points: [
      "Measurable process improvements, efficiency gains, and cost reductions.",
      "Cross-functional team leadership, vendor management, and SLA delivery.",
      "Strategic operations planning tailored for Australian growth businesses.",
    ],
    ctaLabel: "Explore Services",
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
