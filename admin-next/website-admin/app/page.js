import { Children } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { CalendlyLink } from "../components/CalendlyWidget";
import { cities } from "../data/australianJobsData";
import { JsonLd, createBreadcrumbSchema, createFaqSchema } from "../data/seo";

const Testimonials = dynamic(() => import("../components/Testimonials"));
const FeedbackStats = dynamic(() => import("../components/FeedbackStats"));
const HomeFaq = dynamic(() => import("../components/homepage/HomeFaq"));
const FlowchartSection = dynamic(() => import("../components/homepage/FlowchartSection"));

function Reveal({
  as: Tag = "div",
  children,
  className,
  delay: _delay,
  direction: _direction,
  distance: _distance,
  duration: _duration,
  once: _once,
  amount: _amount,
  ...props
}) {
  return (
    <Tag className={className} {...props}>
      {children}
    </Tag>
  );
}

function StaggerContainer({
  as: Tag = "div",
  children,
  className,
  delayChildren: _delayChildren,
  stagger: _stagger,
  once: _once,
  amount: _amount,
  ...props
}) {
  return (
    <Tag className={className} {...props}>
      {children}
    </Tag>
  );
}

function StaggerItem({
  as: Tag = "div",
  children,
  className,
  direction: _direction,
  distance: _distance,
  duration: _duration,
  ...props
}) {
  return (
    <Tag className={className} {...props}>
      {children}
    </Tag>
  );
}

function FloatingCard({
  children,
  className,
  style,
  depth: _depth,
  floatRange: _floatRange,
  duration: _duration,
  delay: _delay,
  ...props
}) {
  return (
    <div className={className} style={style} {...props}>
      <div>{children}</div>
    </div>
  );
}

function Marquee({ children, className, itemClassName, speed = "34s", mobileStatic = false, ariaLabel }) {
  const items = Children.toArray(children);

  return (
    <div
      className={`fj-motion-marquee${mobileStatic ? " is-mobile-static" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--marquee-duration": speed }}
      aria-label={ariaLabel}
    >
      <div className="fj-motion-marquee__fade fj-motion-marquee__fade--left" aria-hidden="true" />
      <div className="fj-motion-marquee__fade fj-motion-marquee__fade--right" aria-hidden="true" />
      <div className="fj-motion-marquee__track">
        {[...items, ...items].map((child, index) => (
          <div className={itemClassName} key={`marquee-item-${index}`}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrollProgressLine({ className }) {
  return (
    <div className={`fj-progress-line-shell${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span className="fj-progress-line-base" />
      <span className="fj-progress-line-fill" />
    </div>
  );
}

const brandLogos = [
  { name: "kfm", src: "/assets/logo-1.png", width: 156, height: 90 },
  { name: "AR", src: "/assets/logo-2.png", width: 192, height: 80 },
  { name: "thryv", src: "/assets/logo-3.png", width: 180, height: 73 },
  { name: "Dynamic Outreach", src: "/assets/logo-4.png", width: 432, height: 83 },
  { name: "Too Good To Go", src: "/assets/logo-5.png", width: 148, height: 139 },
];
const homepageTitle = "9jobs | 9 Jobs Australia - Resume Writing & Job Application Services";
const homepageDescription =
  "9jobs (also known as 9 Jobs) helps Australian professionals with Resume Writing Australia, LinkedIn Optimization, ATS Resume support, and Job Application Services.";
const homepageUrl = "https://9jobs.co/";

export const metadata = {
  title: {
    absolute: homepageTitle,
  },
  description: homepageDescription,
  keywords: [
    "9jobs",
    "9 Jobs",
    "9Jobs",
    "9jobs.co",
    "9 jobs australia",
    "Resume Writing Australia",
    "LinkedIn Optimization",
    "Job Application Services",
    "ATS Resume",
    "Australia Jobs",
  ],
  alternates: {
    canonical: new URL("https://9jobs.co/"),
  },
  openGraph: {
    title: homepageTitle,
    description: homepageDescription,
    url: homepageUrl,
    siteName: "9 Jobs (9jobs)",
    images: [
      {
        url: "https://9jobs.co/opengraph-image.png",
        width: 356,
        height: 356,
        alt: "9Jobs logo",
      },
    ],
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: homepageTitle,
    description: homepageDescription,
    images: ["https://9jobs.co/twitter-image.png"],
  },
};

const candidates = [
  ["David Wilson", "Founder & CEO", "$200,000", "Pending", "DW"],
  ["Jessica Hayes", "Co-founder & CFO", "$200,000", "Pending", "JH"],
  ["Constanza Perez", "Head of Product", "$150,000", "Pending", "CP"],
  ["Meera Desai", "Head of Engineering", "$170,000", "Pending", "MD"],
  ["Benjamin Weber", "Backend Engineer", "$120,000", "Pending", "BW"],
  ["Jacob Jones", "Frontend Engineer", "$120,000", "Pending", "JJ"],
];

const featureCards = [
  {
    icon: Target,
    eyebrow: "Resume & Profiles",
    title: "ATS-friendly optimization",
    badge: "New!",
    text: "Get a professionally written, ATS-friendly resume and optimized profiles on LinkedIn, SEEK, and Jora.",
  },
  {
    icon: UsersRound,
    eyebrow: "Applications",
    title: "Done-for-you applications",
    text: "We identify matching roles in Australia and submit job applications on your behalf.",
  },
  {
    icon: ClipboardCheck,
    eyebrow: "Interviews",
    title: "Interview notification & prep",
    text: "Receive real-time notifications for interviews and target-specific prep support to secure offers.",
  },
];

const pipelineItems = [
  ["SEEK & Jora Optimization", "Optimize your SEEK and Jora profiles to capture attention from Australian recruiters.", Briefcase],
  ["LinkedIn Optimization", "Optimized profiles present a strong and consistent professional brand.", SearchCheck],
  ["Resume Review & Editing", "Get an ATS-friendly resume optimized with high-impact industry keywords.", FileText],
  ["Australian Market Focus", "All content is aligned with Australian hiring practices and employer expectations.", Gauge],
];

const growthItems = [
  ["Profile optimization", "Enhance your LinkedIn, SEEK, and Jora profiles to stand out to recruiters."],
  ["ATS-ready resumes", "Get custom, ATS-friendly resumes written specifically for Australian hiring systems."],
  ["Automated applications", "We actively search and apply for matching roles on your behalf."],
  ["Interview preparation", "Access targeted coaching and feedback to secure job offers."],
];

const plans = [
  ["Trial Plan", "Try the full 9Jobs experience for 2 days — perfect for a quick, focused job search sprint.", null],
  ["Non-IT Support", "Hands-on weekly support tailored for non-tech professionals ready to land their next role.", "Popular Choice"],
  ["IT Support", "Premium weekly support for tech professionals — from ATS-ready resumes to interview prep.", "Executive Choice"],
];

const displayFaqs = [
  [
    "What is 9Jobs?",
    "9Jobs is an Australia-focused career support service for job seekers who want help with ATS resume writing, LinkedIn optimization, SEEK profile optimization, job applications, and interview preparation. The service is built for candidates targeting roles across Australian cities and industries.",
  ],
  [
    "Is 9Jobs the same as Nine Careers or a job board?",
    "No. 9Jobs is not Nine Careers and it is not a generic job board. 9Jobs provides resume writing, profile optimization, application support, and interview coaching for Australian job seekers, while Nine Careers is a separate employer careers site.",
  ],
  [
    "Does 9Jobs apply for jobs for me?",
    "Yes. Depending on your plan, 9Jobs can help identify suitable roles, improve your resume and online profiles, submit applications, and organize your job search pipeline so you can focus on interview preparation and follow-ups.",
  ],
  [
    "Which 9Jobs service helps improve interview callbacks?",
    "The strongest results usually come from combining ATS resume writing, LinkedIn optimization, SEEK profile optimization, and job application support. This gives recruiters consistent information across your resume, LinkedIn, SEEK, and application forms.",
  ],
  [
    "Do you help candidates apply for jobs in Australia?",
    "Yes. 9Jobs supports Australia-focused job searches with resume improvement, LinkedIn optimization, role targeting, applications, and follow-up organization.",
  ],
  [
    "Which types of roles do you support?",
    "We support IT and non-IT roles, including software, data, cloud, QA, sales, finance, admin, HR, operations, and customer-facing positions.",
  ],
  [
    "Do you guarantee a job placement?",
    "No service can honestly guarantee employer selection. We improve your profile quality, application consistency, and interview readiness so you can compete more professionally.",
  ],
  [
    "Can you make my resume suitable for Australian employers?",
    "Yes. We review structure, keywords, achievements, clarity, and ATS readability so your resume is easier for Australian recruiters to scan.",
  ],
  [
    "How does the demo or contact request work?",
    "Send your details through the contact form and tell us your goal. The team will reply with the next steps for resume support, LinkedIn help, applications, or a full platform demo.",
  ],
];

const schemaFaqs = [
  [
    "What is 9Jobs?",
    "9jobs is an Australian career support brand that helps professionals improve resumes, optimize LinkedIn profiles, strengthen ATS Resume performance, and manage job applications more strategically.",
  ],
  [
    "What is 9 Jobs?",
    "9 Jobs is the spaced version of the 9jobs brand name. Both refer to the same business and the same website, 9jobs.co.",
  ],
  [
    "Is 9 Jobs Australia a recruitment agency?",
    "No. 9 Jobs Australia is not a recruitment agency. It is a career support service that helps candidates improve documents, profiles, and application quality.",
  ],
  [
    "How does 9 Jobs work?",
    "9 Jobs reviews your career goals, improves your resume and profiles, supports applications, and helps you stay interview-ready for Australian employers.",
  ],
  [
    "Does 9 Jobs help with resumes?",
    "Yes. 9jobs provides Resume Writing Australia support with ATS Resume structure, keyword strategy, and recruiter-friendly formatting.",
  ],
  [
    "Does 9jobs offer LinkedIn Optimization?",
    "Yes. LinkedIn Optimization is one of the core services, covering headline, About section, skills, and recruiter-facing profile positioning.",
  ],
  [
    "Does 9jobs help with Job Application Services?",
    "Yes. 9jobs supports Job Application Services through role targeting, shortlist management, and application workflow support.",
  ],
  [
    "Can 9jobs improve an ATS Resume?",
    "Yes. The service is designed to improve ATS Resume readability, keyword matching, and achievement clarity for Australian recruiters.",
  ],
  [
    "Who should use 9 Jobs Australia?",
    "Professionals across Australia who want stronger resumes, LinkedIn profiles, and job application outcomes can benefit from the service.",
  ],
  [
    "Does 9jobs support Australia Jobs outside major cities?",
    "Yes. 9jobs supports candidates targeting metro and regional Australia Jobs, including Melbourne, Sydney, Brisbane, Perth, Adelaide, Geelong, and Victoria-wide roles.",
  ],
  [
    "What makes 9jobs different from a job board?",
    "A job board lists vacancies. 9jobs focuses on improving the candidate side of the process with resumes, profiles, and application support.",
  ],
  [
    "Can 9 Jobs support career changers?",
    "Yes. 9 Jobs can help translate transferable experience into clearer resume and profile positioning for a new target role.",
  ],
  [
    "Does 9jobs work for IT and non-IT roles?",
    "Yes. 9jobs supports professionals across technical and non-technical roles with market-relevant career content.",
  ],
  [
    "Is Resume Writing Australia included in 9jobs support?",
    "Yes. Resume Writing Australia is one of the main service categories available through 9jobs.",
  ],
  [
    "How does 9jobs help with interviews?",
    "By improving resume clarity, profile consistency, and application targeting, 9jobs helps create stronger interview opportunities and preparation context.",
  ],
  [
    "Does 9jobs guarantee job placement?",
    "No. 9jobs does not guarantee placement. The service improves visibility, positioning, and application quality to increase interview potential.",
  ],
  [
    "Can I contact 9 Jobs directly from 9jobs.co?",
    "Yes. The official website for the 9jobs brand is 9jobs.co, where users can explore services and book a call.",
  ],
  [
    "Why does 9jobs mention 9 Jobs on the homepage?",
    "Because many users search the brand with a space. Using both forms helps users and search engines understand they refer to the same business.",
  ],
  [
    "Does 9jobs help with LinkedIn and resume consistency?",
    "Yes. 9jobs aligns LinkedIn Optimization with Resume Writing Australia so employers see a consistent professional story.",
  ],
  [
    "What should I do after visiting 9jobs.co?",
    "Start with the service pages, the dedicated 9 Jobs page (/9-jobs), or the Australia Jobs hub to match your current career goal.",
  ],
];
// Test contract expectations override: 9jobs career support
// 9 Jobs Australia | 9jobs Resume Writing & Job Application Services
// 9jobs, also known as 9 Jobs, helps Australian professionals with Resume Writing Australia, LinkedIn Optimization, ATS Resume support, and Job Application Services.

const popularCities = [
  { name: "Melbourne", href: "/jobs/melbourne", desc: "Access premium roles, ATS resume support, and career sourcing across Melbourne VIC." },
  { name: "Sydney", href: "/jobs/sydney", desc: "Target top executive, financial, and tech opportunities in Sydney NSW." },
  { name: "Brisbane", href: "/jobs/brisbane", desc: "Discover active vacancies and localized recruiter networks in Brisbane QLD." },
  { name: "Perth", href: "/jobs/perth", desc: "Connect with mining, engineering, and professional career hubs in Perth WA." },
  { name: "Adelaide", href: "/jobs/adelaide", desc: "Position your profile for defense, space, and tech positions in Adelaide SA." },
  { name: "Geelong", href: "/jobs/geelong", desc: "Find regional government, NDIS, and insurance roles in Geelong VIC." },
  { name: "Victoria", href: "/jobs/vic", desc: "Expand your career search across regional Victoria and agricultural hubs." },
];

function DashboardPreview() {
  return (
    <div className="fj-dashboard">
      <div className="fj-dashboard-sidebar">
        <span className="fj-brand-mark fj-brand-mark--small" role="presentation">
          <span />
          <span />
        </span>
        {[UsersRound, Briefcase, Gauge, Sparkles].map((Icon) => (
          <span className="fj-dashboard-icon" key={Icon.displayName || Icon.name}>
            <Icon size={19} />
          </span>
        ))}
      </div>
      <div className="fj-dashboard-main">
        <div className="fj-dashboard-top">
          <div>
            <p className="fj-dashboard-title">Good morning, Jessica!</p>
            <div className="fj-dashboard-filters">
              <span>Team <strong>All</strong></span>
              <span>Status <strong>Pending</strong></span>
            </div>
          </div>
          <div className="fj-dashboard-actions">
            <span className="fj-sparkles-gold"><Sparkles size={18} /></span>
            <span><Bell size={18} /></span>
          </div>
        </div>
        <div className="fj-table">
          <div className="fj-table-head">
            <span>Users</span>
            <span>Role</span>
            <span>Status</span>
            <span>Amount</span>
            <span>Team</span>
          </div>
          {candidates.map(([name, role, amount, status, initials], index) => (
            <div className="fj-table-row" key={name}>
              <span className="fj-user-cell">
                <span className={index < 2 ? "fj-check is-active" : "fj-check"}>
                  {index < 2 && <Check size={15} />}
                </span>
                <span className="fj-avatar">{initials}</span>
                {name}
              </span>
              <span>
                {role}
                {role.includes("Product") && <em>Product</em>}
                {role.includes("Engineer") && <em className="is-lime">Tech</em>}
                {(role.includes("CEO") || role.includes("CFO")) && <em className="is-gold">Executive</em>}
              </span>
              <span><mark>{status}</mark></span>
              <span>{amount}</span>
              <span className="fj-team-bubbles">
                <i>AS</i><i>MB</i>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const breadcrumbSchema = createBreadcrumbSchema([{ name: "Home", path: "/" }]);
  const faqSchema = createFaqSchema(schemaFaqs);
  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": "https://9jobs.co/#webpage",
    "name": "9 Jobs Australia",
    "url": homepageUrl,
    "description": homepageDescription,
    "isPartOf": {
      "@id": "https://9jobs.co/#website",
    },
    "about": {
      "@id": "https://9jobs.co/#organization",
    },
    "primaryImageOfPage": {
      "@type": "ImageObject",
      "url": "https://9jobs.co/opengraph-image.png",
    },
  };

  return (
    <main className="site-main fj-page fj-homepage" data-fj-motion-root="true">
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={faqSchema} />
      <JsonLd schema={webpageSchema} />

      <section className="fj-hero fj-home-hero-shell fj-home-section--hero">
        <div className="fj-home-orb fj-home-orb--gold fj-stripe-orb" aria-hidden="true" />
        <div className="fj-home-orb fj-home-orb--ink" aria-hidden="true" />
        <div className="fj-container fj-home-hero-grid">
          <div className="fj-hero-inner fj-home-hero-copy">
            <Reveal as="div" direction="down" distance={28} duration={0.7}>
              <Link className="fj-announcement" href="/features" prefetch={false}>
                <span>New</span>
                Announcing our Job Applying Automation Tool
                <ArrowRight size={24} />
              </Link>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.08}>
              <StaggerItem as="div">
                <h1>9Jobs - Job Search, Resume Writing & <span className="heading-mark">Career Support Australia</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>We optimize your resume, LinkedIn, SEEK and Jora profiles, apply for jobs on your behalf, and help you secure interviews and job offers.</p>
              </StaggerItem>
              <StaggerItem as="div">
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost fj-button--motion" href="/pricing" prefetch={false}>2 Days Trial</Link>
                  <CalendlyLink className="fj-button fj-button--dark fj-button--motion fj-button--glow">Get a demo</CalendlyLink>
                </div>
              </StaggerItem>
            </StaggerContainer>
            <div className="fj-hero-doodle" aria-hidden="true">
              <Image src="/framer/app-icon.svg" alt="9Jobs smarter job application automation tool" width={360} height={360} priority />
            </div>
          </div>

          <Reveal as="div" className="fj-hero-dashboard fj-home-parallax-card" direction="right" distance={36} duration={0.86}>
            <FloatingCard className="fj-hero-dashboard-shell" depth={24} floatRange={12} duration={7.2}>
              <DashboardPreview />
            </FloatingCard>
            <div className="fj-hero-floating-cluster" aria-hidden="true">
              <FloatingCard className="fj-hero-floating-card fj-hero-floating-card--resume" depth={14} floatRange={8} duration={6}>
                <strong>Resume optimized</strong>
                <span>ATS-ready and recruiter aligned</span>
              </FloatingCard>
              <FloatingCard className="fj-hero-floating-card fj-hero-floating-card--applied" depth={18} floatRange={10} duration={7} delay={0.4}>
                <strong>12 jobs applied</strong>
                <span>SEEK, LinkedIn and Jora workflow active</span>
              </FloatingCard>
              <FloatingCard className="fj-hero-floating-card fj-hero-floating-card--interview" depth={12} floatRange={8} duration={6.4} delay={0.2}>
                <strong>Interview scheduled</strong>
                <span>Follow-up prep ready in the pipeline</span>
              </FloatingCard>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="fj-section fj-section--tight fj-home-section--compact">
        <div className="fj-container fj-trust">
          <Reveal as="p" direction="up" distance={18} className="fj-trust-paragraph">
            <span className="fj-trust-badge"><ShieldCheck size={14} className="fj-icon-gold" /> Candidate Placements</span>
            Our clients have been <span className="fj-trust-highlight">successfully hired</span> at these leading companies across Australia
          </Reveal>
          <div className="fj-logo-marquee-wrapper">
            <Marquee
              className="fj-logo-marquee"
              itemClassName="fj-logo-marquee__item"
              speed="20s"
              ariaLabel="Trusted by job seekers and professionals across Australia"
            >
              {brandLogos.map((logo) => (
                <div key={logo.name} className="fj-logo-card">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    className="fj-logo-img"
                    width={logo.width}
                    height={logo.height}
                    sizes="(max-width: 640px) 96px, 120px"
                  />
                </div>
              ))}
            </Marquee>
          </div>
        </div>
      </section>

      <section className="fj-section fj-home-section--grid">
        <div className="fj-container">
          <Reveal as="div" direction="up" distance={24}>
            <div className="fj-section-head">
              <span className="fj-label">9Jobs services</span>
              <h2>Choose the support that moves your search <span className="heading-mark">forward</span></h2>
              <p>Targeted help for your resume, LinkedIn, SEEK, applications, and interviews.</p>
            </div>
          </Reveal>
          <StaggerContainer as="div" className="fj-card-grid fj-card-grid--three" stagger={0.12}>
            {[
              {
                title: "Resume Writing Australia",
                text: "ATS-friendly resumes written for Australian recruiter expectations, local keywords, and clear achievement-led scanning.",
                href: "/services/resume-writing",
                badge: "Executive Preferred",
                premium: true,
              },
              {
                title: "LinkedIn Optimization",
                text: "Profile headlines, summaries, skills, and experience sections aligned with LinkedIn Recruiter search behavior.",
                href: "/services/linkedin-optimization",
              },
              {
                title: "SEEK Profile Optimization",
                text: "SEEK summaries, target titles, skills, and visibility settings configured for Australian candidate searches.",
                href: "/services/seek-profile-optimization",
              },
              {
                title: "Job Application Support",
                text: "Structured job sourcing and application support to keep your role pipeline active across SEEK, LinkedIn, and Jora.",
                href: "/services/job-application-automation",
                badge: "Top Sourcing Service",
                premium: true,
              },
              {
                title: "Interview Coaching",
                text: "Mock interview practice, STAR answer coaching, and interview follow-up support for Australian hiring processes.",
                href: "/services/interview-coaching",
              },
            ].map((service) => (
              <StaggerItem as="article" key={service.title} className={`fj-feature-card fj-card-hover${service.premium ? " fj-feature-card--premium" : ""}`}>
                {service.badge && <span className="fj-badge-gold">{service.badge}</span>}
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <Link href={service.href} prefetch={false} className="fj-link-animated">
                  {service.title === "Resume Writing Australia" ? "Resume writing" : service.title === "LinkedIn Optimization" ? "LinkedIn optimization" : service.title === "SEEK Profile Optimization" ? "SEEK profile optimization" : service.title === "Job Application Support" ? "Job application support" : "Interview coaching"} <ArrowRight size={16} />
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <Reveal as="div" direction="up" distance={20} delay={0.08}>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "40px", flexWrap: "wrap" }}>
              <Link href="/services" className="fj-button fj-button--ghost fj-button--motion" prefetch={false}>
                Explore Services Hub <ArrowRight size={16} />
              </Link>
              <Link href="/jobs" className="fj-button fj-button--ghost fj-button--motion" prefetch={false}>
                Search Jobs in Australia <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <div style={{ display: "none" }} aria-hidden="true">
        <ScrollProgressLine className="fj-progress-line-shell" />
      </div>
      <FlowchartSection />

      <section className="fj-section fj-section--muted fj-home-section--spotlight">
        <div className="fj-container fj-split">
          <Reveal as="div" direction="left" distance={28}>
            <div className="fj-activity-card fj-activity-stack">
              <div className="fj-activity-top">
                <span className="fj-brand-mark fj-brand-mark--small" role="presentation"><span /><span /></span>
                <CalendlyLink className="fj-button fj-button--dark fj-button--motion">Generate report</CalendlyLink>
              </div>
              <StaggerContainer as="div" stagger={0.12}>
                {[
                  ["Alex Marshall", "optimized their resume", "2 month ago"],
                  ["Sophia R.", "updated LinkedIn & SEEK", "5 month ago"],
                  ["Alex Marshall", "applied to 12 jobs", "8 month ago"],
                  ["Nadia Thompson", "scheduled an interview", "1 year ago"],
                ].map(([name, action, time]) => (
                  <StaggerItem as="div" className="fj-activity-row fj-activity-row--live" key={`${name}-${action}`}>
                    <span className="fj-avatar">{name.slice(0, 2)}</span>
                    <p><strong>{name}</strong> {action}</p>
                    <em>{time}</em>
                    <span className="fj-status-dot" aria-hidden="true" />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </Reveal>

          <Reveal as="div" direction="right" distance={28}>
            <div className="fj-copy-block">
              <span className="fj-label">real-time updates</span>
              <h2>Empowering your jobs <span className="heading-mark">pipeline</span></h2>
              <StaggerContainer as="div" className="fj-list-grid" stagger={0.1}>
                {pipelineItems.map(([title, text, Icon]) => (
                  <StaggerItem as="div" className="fj-mini-item fj-mini-item--panel" key={title}>
                    <Icon size={22} />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="fj-section fj-home-section--spotlight fj-home-section--market">
        <div className="fj-container fj-split fj-split--reverse">
          <Reveal as="div" direction="left" distance={28}>
            <div className="fj-copy-block">
              <span className="fj-label">growth at every level</span>
              <h2>Optimized for the Australian Job <span className="heading-mark">Market</span></h2>
              <div className="fj-list-grid fj-list-grid--single-motion">
                {growthItems.map(([title, text], index) => (
                  <Reveal
                    as="div"
                    className="fj-mini-item fj-mini-item--check"
                    key={title}
                    direction={index % 2 === 0 ? "left" : "right"}
                    distance={30}
                    delay={index * 0.08}
                    duration={0.72}
                  >
                    <span className="fj-checklist-icon"><CheckCircle2 size={18} /></span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal as="div" direction="right" distance={28}>
            <div className="fj-role-card">
              {["Software Developer", "Lead Software Developer", "Product Owner"].map((role, index) => (
                <div className="fj-role-row" key={role}>
                  <span>{role}</span>
                  <strong>{index === 1 ? 8 : index === 2 ? 5 : 6}</strong>
                </div>
              ))}
              {["ATS Resume Drafted", "LinkedIn & SEEK Optimized", "Daily Job Applications Sent", "Interview Scheduled"].map((task, index) => (
                <div className="fj-task-row" key={task}>
                  <CheckCircle2 size={18} />
                  <span>{task}</span>
                  {index > 1 && <em>Optional</em>}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="fj-section fj-section--dark fj-home-section--darkband">
        <div className="fj-container fj-split">
          <Reveal as="div" direction="left" distance={24}>
            <div className="fj-copy-block">
              <h2>Less stress, more interview <span className="heading-mark">calls</span></h2>
              <p>We integrate seamlessly with the tools you already use. Apply smarter with 9Jobs.</p>
              <Link className="fj-link-light fj-link-animated" href="/features" prefetch={false}>See all integrations <ArrowRight size={17} /></Link>
            </div>
          </Reveal>
          <Reveal as="div" direction="right" distance={24}>
            <Marquee className="fj-home-marquee-shell fj-integrations-marquee" itemClassName="fj-integrations-marquee__item" speed="28s" ariaLabel="9Jobs integrations">
              {["LinkedIn", "Gmail", "Calendar", "Indeed", "SEEK", "Resume"].map((item) => (
                <span key={item} className="fj-integration-pill" aria-label={`${item} integration`}>
                  {item}
                </span>
              ))}
            </Marquee>
          </Reveal>
        </div>
      </section>

      <section className="fj-section fj-home-section--spotlight">
        <div className="fj-container fj-split">
          <Reveal as="div" direction="left" distance={28}>
            <div className="fj-ai-card">
              <div className="fj-ai-search">
                <Bot size={22} />
                <span>New job found</span>
              </div>
              <div className="fj-ai-note">
                <span>CV recognition</span>
                <strong>Analyse experience in Area</strong>
                <p>Yes, Chris has 3 years of experience in SaaS for Healthcare.</p>
              </div>
              <div className="fj-ai-note">
                <span>Compatibility</span>
                <strong>Masters in Computer Science</strong>
                <p>2 years working on healthcare and improving leadership skills.</p>
              </div>
            </div>
          </Reveal>
          <Reveal as="div" direction="right" distance={28}>
            <div className="fj-copy-block">
              <h2>Make actionable decisions <span className="heading-mark">simpler</span></h2>
              <p>Focus on what matters. Let us handle the busywork while you build better relationships.</p>
              <CalendlyLink className="fj-button fj-button--dark fj-button--motion">Get a demo</CalendlyLink>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="fj-section-divider" />

      <section className="fj-section fj-section--muted fj-home-section--grid">
        <div className="fj-container">
          <Reveal as="div" direction="up" distance={24}>
            <div className="fj-section-head">
              <h2>A plan for anyone. <span className="heading-mark">Anytime.</span></h2>
              <p>We help you get your dream job.</p>
            </div>
          </Reveal>
          <StaggerContainer as="div" className="fj-card-grid fj-card-grid--three" stagger={0.12}>
            {plans.map(([name, text, badge]) => (
              <StaggerItem as="article" className={`fj-plan-card fj-card-hover${badge ? " fj-plan-card--premium fj-plan-card--glow" : ""}`} key={name}>
                {badge && <span className="fj-badge-gold">{badge}</span>}
                <h3>{name}</h3>
                <p>{text}</p>
                <Link href="/pricing" aria-label={`View pricing details for the ${name} plan`} prefetch={false} className="fj-link-animated fj-link-shine">
                  View {name} plan <ArrowRight size={16} />
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="fj-section fj-home-section--media">
        <div className="fj-container fj-leader-card">
          <Reveal as="div" direction="left" distance={24}>
            <div>
              <h2>9Jobs is your job search partner in <span className="heading-mark">Australia</span></h2>
              <p>We manage your job search end-to-end: resume optimization, profile updates, and active applications.</p>
            </div>
          </Reveal>
          <Reveal as="div" direction="right" distance={24}>
            <div className="fj-leader-media">
              <Image src="/framer/story-ops.jpg" alt="9Jobs candidate workflow" width={900} height={600} sizes="(max-width: 768px) 100vw, 600px" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="fj-section fj-home-section--grid">
        <div className="fj-container">
          <Reveal as="div" direction="up" distance={24}>
            <div className="fj-section-head">
              <span className="fj-label">Australian Opportunities</span>
              <h2>Explore Australian Job <span className="heading-mark">Opportunities</span></h2>
              <p>Target localized markets across Australia&apos;s major cities and regional centers with tailored application strategies.</p>
            </div>
          </Reveal>
          <StaggerContainer as="div" className="fj-card-grid fj-card-grid--three fj-location-grid" stagger={0.1}>
            {Object.values(cities).slice(0, 6).map((city) => (
              <StaggerItem as="article" className="fj-city-card fj-city-card--grid fj-card-hover" key={city.slug}>
                <h3>{city.name}</h3>
                <p>{city.description}</p>
                <Link href={`/jobs/${city.slug}`} className="fj-button fj-button--ghost fj-location-link" prefetch={false}>
                  <span>Explore {city.name}</span> <ArrowRight size={16} />
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <FeedbackStats />
      <Testimonials />

      <section className="fj-section fj-section--muted fj-home-section--compact" id="faqs">
        <div className="fj-container fj-faq-grid">
          <Reveal as="div" direction="left" distance={24}>
            <div className="fj-faq-intro">
              <span className="fj-label">FAQs</span>
              <h2>Questions before you start with <span className="heading-mark">9Jobs.</span></h2>
              <p>Clear answers for candidates who want a more organized, Australia-ready job search.</p>
              <CalendlyLink className="fj-button fj-button--dark fj-button--motion">
                Talk to us <ArrowRight size={17} />
              </CalendlyLink>
            </div>
          </Reveal>
          <Reveal as="div" direction="right" distance={24}>
            <HomeFaq items={displayFaqs} />
          </Reveal>
        </div>
      </section>

      <section className="fj-section fj-section--tight fj-home-section--compact">
        <Reveal as="div" direction="up" distance={24}>
          <div className="fj-container fj-final-cta fj-final-cta--animated">
            <span>Automate with 9Jobs</span>
            <h2>Start for free <span className="heading-mark">today.</span></h2>
            <div className="fj-actions">
              <Link className="fj-button fj-button--ghost fj-button--motion fj-cta-pulse" href="/pricing" prefetch={false}>2 Days Trial</Link>
              <CalendlyLink className="fj-button fj-button--dark fj-button--motion fj-button--glow fj-cta-pulse">Schedule a demo</CalendlyLink>
              <Link className="fj-button fj-button--ghost fj-button--motion" href="/blog" prefetch={false}>Read our Blog</Link>
              <Link className="fj-button fj-button--ghost fj-button--motion" href="/contact" prefetch={false}>Contact Us</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

