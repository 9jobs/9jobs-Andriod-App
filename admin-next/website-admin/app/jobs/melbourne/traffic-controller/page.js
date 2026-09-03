import Link from "next/link";
import { ArrowRight, ChevronDown, CheckCircle2, MapPin, Briefcase, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { CalendlyLink } from "../../../../components/CalendlyWidget";
import { JsonLd, createBreadcrumbSchema, createSeoMetadata, getRouteSeo } from "../../../../data/seo";

const routeSeo = getRouteSeo("/jobs/melbourne/traffic-controller");

export const metadata = createSeoMetadata(routeSeo);

const tickets = [
  ["White Card (CPCCWHS1001)", "Mandatory certification required to work on any construction or road site in Victoria.", ShieldCheck],
  ["Traffic Controller Ticket", "RIISS00054 (previously Blue Card) - Allows you to control traffic using a stop-slow bat.", FileText],
  ["Implement Traffic Management Plan", "RIISS00055 (previously Yellow Card) - Allows you to set up signs and devices on roads.", Briefcase],
  ["First Aid Certificate", "HLTAID011 - Highly preferred by major VIC labor-hire agencies and road companies.", ShieldCheck],
];

const faqs = [
  [
    "What tickets do I need to work as a traffic controller in Melbourne?",
    "To work as a traffic controller in Victoria, you must hold a valid construction induction card (White Card) and complete the VicRoads-approved training pathways: Control Traffic with a Stop-Slow Bat (RIISS00054 Traffic Controller Skill Set) and Implement Traffic Management Plans (RIISS00055 Traffic Management Implementer Skill Set). Training must be done through a Registered Training Organisation (RTO) in Victoria."
  ],
  [
    "What is the average hourly rate for traffic control in Melbourne?",
    "Entry-level traffic control rates in Melbourne typically start between $30 to $35 per hour. Under major infrastructure union agreements (EBAs) on Victorian government projects, rates can exceed $45 to $55 per hour, plus night shift loadings, travel allowances, meal allowances, and weekend overtime benefits."
  ],
  [
    "Do recruitment agencies hire traffic controllers directly?",
    "Yes. Most traffic control work in Melbourne is managed through specialized labor-hire and traffic management recruitment agencies (e.g. AWX, MC Labour, Hoban, Core Staff, and JV Recruitment). Having your resume optimized specifically to list your active tickets and vehicle access is key to getting registered quickly."
  ],
  [
    "Can 9Jobs help me secure a traffic controller job?",
    "Yes. We specialize in optimizing your resume to ensure your White Card, traffic tickets, and transport availability parse perfectly through labor-hire ATS filters. We also optimize your SEEK profile preferences to make you discoverable to agency recruiters and can apply for matching road roles on your behalf daily."
  ]
];

export default function TrafficControllerJobsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(([q, a]) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": a
      }
    }))
  };

  const jobSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": "Traffic Controller - Construction & Road Projects",
    "description": "We are seeking qualified Traffic Controllers for major infrastructure and road construction projects across Melbourne, VIC. High hourly rates, travel allowance, and overtime benefits apply. Must hold valid traffic control tickets and a White Card.",
    "datePosted": "2026-06-10",
    "validThrough": "2026-12-31",
    "employmentType": "CONTRACTOR",
    "hiringOrganization": {
      "@type": "Organization",
      "name": "9Jobs Sourcing Partner Network",
      "sameAs": "https://9jobs.co"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Footscray Road",
        "addressLocality": "Melbourne",
        "addressRegion": "VIC",
        "postalCode": "3000",
        "addressCountry": "AU"
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "AUD",
      "value": {
        "@type": "QuantitativeValue",
        "value": 38.50,
        "unitText": "HOUR"
      }
    }
  };
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Australian Jobs", path: "/jobs" },
    { name: "Melbourne Jobs", path: "/jobs/melbourne" },
    { name: "Traffic Controller Jobs Melbourne", path: "/jobs/melbourne/traffic-controller" },
  ]);
  const supportLinks = [
    {
      href: "/services/resume-writing",
      title: "Resume Writing",
      text: "List tickets, licences, PPE, availability, and site experience in an ATS-readable format.",
    },
    {
      href: "/services/linkedin-optimization",
      title: "LinkedIn Optimization",
      text: "Make your civil construction and labour-hire experience easier for recruiters to verify.",
    },
    {
      href: "/services/interview-coaching",
      title: "Interview Coaching",
      text: "Prepare for agency screens covering tickets, transport, availability, safety, and site readiness.",
    },
    {
      href: "/jobs/melbourne/warehouse",
      title: "Warehouse Jobs Melbourne",
      text: "Compare related Melbourne labour-hire roles across warehouse, logistics, and operations.",
    },
  ];

  return (
    <main className="site-main fj-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobSchema) }}
      />
      <JsonLd schema={breadcrumbSchema} />

      <section className="fj-page-hero">
        <div className="fj-container">
          <nav className="fj-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.88rem", color: "var(--fj-muted)", fontWeight: 600 }}>
            <Link href="/" style={{ color: "inherit" }}>Home</Link>
            <span>&gt;</span>
            <Link href="/jobs/melbourne" style={{ color: "inherit" }}>Melbourne Jobs</Link>
            <span>&gt;</span>
            <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>Traffic Controller</span>
          </nav>
          <span className="fj-announcement"><span>Melbourne Sourcing</span> Local Infrastructure Roles</span>
          <h1>Traffic Controller Jobs <span className="heading-mark">Melbourne</span></h1>
          <p>Get your tickets recognized, your CV ATS-aligned, and secure high-paying road and construction roles across Melbourne and regional Victoria.</p>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">View plans</Link>
            <CalendlyLink className="fj-button fj-button--dark">Optimize my tickets CV</CalendlyLink>
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container fj-split">
          <div className="fj-copy-block">
            <span className="fj-label">Active VIC Projects</span>
            <h2>Capitalise on Melbourne's massive infrastructure boom</h2>
            <p>
              Melbourne's civil construction sector is growing rapidly. Major state-backed projects—including the Suburban Rail Loop, West Gate Tunnel, and extensive level crossing removals—have created massive, ongoing demand for certified traffic control professionals.
            </p>
            <p>
              However, because labor-hire agencies receive hundreds of registrations daily, they use Applicant Tracking Systems (ATS) to filter applicants. If your resume does not explicitly list your accredited VicRoads training, white card numbers, driver's licence class, and vehicle ownership, you will be automatically archived. 9Jobs optimizes your CV to ensure you clear these filters and start receiving shift offers.
            </p>
          </div>
          <div className="fj-ai-card">
            <div className="fj-ai-search">
              <Briefcase size={22} />
              <span>VIC Traffic Control Requirements</span>
            </div>
            <div className="fj-ai-note">
              <span>VicRoads Ticket Verification</span>
              <strong>RIISS00054 & RIISS00055</strong>
              <p>Mandatory. Resume must list exact unit numbers to pass agency software screens.</p>
            </div>
            <div className="fj-ai-note">
              <span>Driver's Licence & Vehicle</span>
              <strong>Manual/Auto Car Class C</strong>
              <p>Essential. Most Melbourne sites require transport flexibility for early starts.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--muted">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Mandatory Qualifications</span>
            <h2>Certifications required for Melbourne site access</h2>
          </div>
          <div className="fj-card-grid fj-card-grid--four">
            {tickets.map(([title, text, Icon]) => (
              <article className="fj-feature-card" key={title}>
                <div className="fj-icon-chip"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container fj-split fj-split--reverse">
          <div className="fj-copy-block">
            <span className="fj-label">Sourcing Strategy</span>
            <h2>How to land high-paying EBA traffic roles</h2>
            <p>
              Not all traffic control jobs are paid the same. Standard residential site roles pay basic award rates, while commercial construction projects and government roadworks operate under Enterprise Bargaining Agreements (EBAs), offering significantly higher hourly wages, site allowances, travel pay, and overtime.
            </p>
            <p>
              To secure these premium positions, you need to target specialized civil labor-hire agencies in Victoria. 9Jobs helps you identify the leading labor companies, optimizes your SEEK profile with target keywords, and automates your applications daily to ensure you are among the first applicants when agencies need staff urgently.
            </p>
          </div>
          <div className="fj-role-card">
            <div style={{ padding: "24px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Victorian Industry Benchmarks</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Key requirements to highlight</p>
            </div>
            {[
              ["White Card registered", "Induction completed and card number listed on CV"],
              ["Accredited RTO tickets", "State-approved stop-slow certification details"],
              ["Full PPE checklist", "Steel caps, hi-vis, hard hat, safety glasses"],
              ["Flexible availability", "Night shift and weekend availability to boost pay"]
            ].map(([title, desc]) => (
              <div className="fj-task-row" key={title}>
                <CheckCircle2 size={18} />
                <span><strong>{title}</strong>: {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--muted">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Application support</span>
            <h2>Strengthen your Melbourne traffic control applications</h2>
            <p>Connect this role page with the services and related job pages that help recruiters find and trust your profile.</p>
          </div>
          <div className="fj-card-grid fj-card-grid--four">
            {supportLinks.map((link) => (
              <article className="fj-feature-card" key={link.href}>
                <h3>{link.title}</h3>
                <p>{link.text}</p>
                <Link href={link.href} className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                  Explore <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--muted" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Common questions about Melbourne traffic control</h2>
            <p>Answers to help you get certified and hired in Victoria.</p>
            <CalendlyLink className="fj-button fj-button--dark">
              Talk to us <ArrowRight size={17} />
            </CalendlyLink>
          </div>

          <div className="fj-faq-list">
            {faqs.map(([question, answer], index) => (
              <details className="fj-faq-item" key={question} open={index === 0}>
                <summary>
                  <span>{question}</span>
                  <ChevronDown size={20} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--tight">
        <div className="fj-container fj-final-cta">
          <span>Outsource Your Job Sourcing</span>
          <h2>Ready to secure traffic control shifts in Melbourne?</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
            <CalendlyLink className="fj-button fj-button--dark">Optimize my profile now</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}
