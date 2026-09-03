import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, SearchCheck, Briefcase } from "lucide-react";
import { CalendlyLink } from "../../components/CalendlyWidget";
import {
  JsonLd,
  createBreadcrumbSchema,
  createFaqSchema,
  createSeoMetadata,
  getRouteSeo,
} from "../../data/seo";

const routeSeo = getRouteSeo("/9-jobs");

export const metadata = createSeoMetadata(routeSeo);

const landingTitle = "9 Jobs Australia | Resume Writing & Job Application Services";
const landingKeywords = [
  "9 jobs australia",
  "9 jobs resume writing",
  "9 jobs career support",
  "9 jobs linkedin optimization",
];

const faqs = [
  [
    "What is 9 Jobs?",
    "9 Jobs is the alternate brand phrasing for 9jobs. Both names refer to the same Australian career support service for resumes, LinkedIn optimization, ATS resume upgrades, and job application services.",
  ],
  [
    "Does 9 Jobs Australia provide resume writing?",
    "Yes. 9 Jobs Australia offers Resume Writing Australia support focused on ATS resume structure, recruiter clarity, and stronger interview conversion.",
  ],
  [
    "Can 9 Jobs help with LinkedIn optimization?",
    "Yes. 9jobs improves headlines, About sections, skills, experience summaries, and keyword alignment for stronger LinkedIn recruiter visibility.",
  ],
  [
    "Is 9 Jobs a recruitment agency?",
    "No. 9 Jobs is a career support and job application services brand, not a traditional recruitment agency. The focus is on improving candidate positioning and application quality.",
  ],
];

const supportCards = [
  {
    title: "9 Jobs resume writing",
    text: "Structured ATS Resume writing tailored for Australian employers, recruiters, and hiring managers.",
    href: "/services/resume-writing",
    icon: FileText,
  },
  {
    title: "9 Jobs LinkedIn optimization",
    text: "Keyword-led profile updates that help your experience appear stronger in recruiter searches.",
    href: "/services/linkedin-optimization",
    icon: SearchCheck,
  },
  {
    title: "9 Jobs career support",
    text: "End-to-end Job Application Services, shortlist support, and interview preparation for Australia Jobs.",
    href: "/services/job-application-automation",
    icon: Briefcase,
  },
];

export default function NineJobsLandingPage() {
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "9 Jobs", path: "/9-jobs" },
  ]);

  const faqSchema = createFaqSchema(faqs);

  return (
    <main className="site-main fj-page">
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={faqSchema} />

      <section className="fj-page-hero">
        <div className="fj-container">
          <span className="fj-announcement"><span>Brand page</span> 9jobs and 9 Jobs are the same service</span>
          <h1>{landingTitle}</h1>
          <p>
            9jobs, also searched as 9 Jobs, helps professionals across Australia with Resume Writing Australia,
            LinkedIn Optimization, ATS Resume improvements, and Job Application Services.
          </p>
          <p>
            These target phrases guide this page: {landingKeywords.join(" | ")}.
          </p>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/services">Explore services</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a strategy call</CalendlyLink>
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Brand clarity</span>
            <h2>Why Google should connect 9 Jobs, 9jobs, and 9jobs.co</h2>
            <p>
              9jobs is the core brand, 9 Jobs is the spaced keyword variation, and 9jobs.co is the official website.
              This page makes that relationship explicit for users and search engines looking for Australia Jobs support.
            </p>
          </div>
          <div className="fj-card-grid fj-card-grid--three">
            {supportCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="fj-feature-card" key={card.title}>
                  <div className="fj-icon-chip"><Icon size={22} /></div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                  <Link href={card.href} className="fj-button fj-button--ghost">
                    Explore {card.title} <ArrowRight size={14} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--muted">
        <div className="fj-container fj-split">
          <div className="fj-copy-block">
            <span className="fj-label">Australia jobs support</span>
            <h2>Built for interviews, not just impressions</h2>
            <p>
              If you searched for 9 jobs australia, 9 jobs resume writing, or 9 jobs linkedin optimization,
              this is the same 9jobs brand that helps improve documents, profiles, and application quality.
            </p>
            <div className="fj-chip-list">
              <span><CheckCircle2 size={15} /> ATS Resume strategy</span>
              <span><CheckCircle2 size={15} /> Resume Writing Australia</span>
              <span><CheckCircle2 size={15} /> LinkedIn Optimization</span>
              <span><CheckCircle2 size={15} /> Job Application Services</span>
            </div>
          </div>
          <div className="fj-copy-block">
            <span className="fj-label">Internal paths</span>
            <h2>Continue into the core service pages</h2>
            <p>
              Use the links below to move deeper into the 9jobs service ecosystem and help reinforce the brand
              relationship between 9 Jobs and the main site.
            </p>
            <p>
              <Link href="/services/resume-writing">9 Jobs Resume Service</Link>,{" "}
              <Link href="/jobs">9jobs Australia</Link>,{" "}
              <Link href="/about">9 Jobs Career Support</Link>, and{" "}
              <Link href="/">9 Jobs</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="fj-section" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Questions about the 9 Jobs brand</h2>
            <p>Clear answers for users who discover 9jobs through the 9 Jobs variation.</p>
          </div>
          <div className="fj-faq-list">
            {faqs.map(([question, answer], index) => (
              <details className="fj-faq-item" key={question} open={index === 0}>
                <summary>
                  <span>{question}</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
