import Link from "next/link";
import { ArrowRight, ChevronDown, CheckCircle2, MapPin, Briefcase, FileText, Truck, ShieldCheck } from "lucide-react";
import { CalendlyLink } from "../../../../components/CalendlyWidget";
import { JsonLd, createBreadcrumbSchema, createSeoMetadata, getRouteSeo } from "../../../../data/seo";

const routeSeo = getRouteSeo("/jobs/melbourne/warehouse");

export const metadata = createSeoMetadata(routeSeo);

const certifications = [
  ["Forklift Licence (LF)", "Highly sought-after ticket allowing operation of counterbalanced forklift trucks in Victoria.", ShieldCheck],
  ["Order Picker Licence (LO)", "Allows operation of load-shifting order picker trucks, common in large Melbourne distribution centers.", FileText],
  ["White Card induction", "Required if you are working in warehouses attached to active construction or civil sites.", Briefcase],
  ["RF Scanning experience", "Demonstrated capability in using radio frequency scanners to track inventory and manage pick lists.", Truck],
];

const faqs = [
  [
    "What are the major warehouse hubs in Melbourne?",
    "Melbourne's primary warehousing and logistics hubs are concentrated in the western suburbs (Truganina, Derrimut, Laverton, and Ravenhall) and the south-east (Dandenong, Keysborough, and Hallam), with growing clusters in the north (Somerton and Campbellfield). Having reliable transport to access these industrial zones is highly valued."
  ],
  [
    "What tickets increase my pay in warehouse roles?",
    "Holding a valid WorkSafe Victoria forklift licence (LF class) or order picker licence (LO class) significantly increases your earning potential. Certified operators typically earn $3 to $8 more per hour compared to basic warehousing assistants."
  ],
  [
    "How does 9Jobs help me find a warehouse job?",
    "We optimize your resume to highlight your pick rates, RF scanning experience, LF/LO licence details, and safety metrics. We ensure these key terms parse through applicant tracking systems used by large logistics firms (like DHL, Linfox, and Toll) and labor-hire agencies. We also automate daily applications to matching vacancies on your behalf."
  ],
  [
    "What is the average wage for a storeman in Victoria?",
    "Basic warehouse assistant and packer rates in Victoria range from $28 to $33 per hour. Licensed forklift operators and warehouse storemen earn between $32 to $42 per hour, with substantial night shift loadings and weekend overtime rates available."
  ]
];

export default function WarehouseJobsPage() {
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
    "title": "Warehouse Storeman / Forklift Operator",
    "description": "We are seeking experienced Warehouse Storemen and Forklift Operators for busy distribution centers in Melbourne's western and south-eastern suburbs. Requires LF/LO licence, RF scanning experience, and a strong focus on warehouse safety.",
    "datePosted": "2026-06-10",
    "validThrough": "2026-12-31",
    "employmentType": "FULL_TIME",
    "hiringOrganization": {
      "@type": "Organization",
      "name": "9Jobs Sourcing Partner Network",
      "sameAs": "https://9jobs.co"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Boundary Road",
        "addressLocality": "Truganina",
        "addressRegion": "VIC",
        "postalCode": "3029",
        "addressCountry": "AU"
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "AUD",
      "value": {
        "@type": "QuantitativeValue",
        "value": 34.50,
        "unitText": "HOUR"
      }
    }
  };
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Australian Jobs", path: "/jobs" },
    { name: "Melbourne Jobs", path: "/jobs/melbourne" },
    { name: "Warehouse Jobs Melbourne", path: "/jobs/melbourne/warehouse" },
  ]);
  const supportLinks = [
    {
      href: "/services/resume-writing",
      title: "Resume Writing",
      text: "Showcase LF/LO licences, pick rates, RF scanning, safety records, and warehouse systems clearly.",
    },
    {
      href: "/services/linkedin-optimization",
      title: "LinkedIn Optimization",
      text: "Align your profile with logistics, warehouse, forklift, and supply chain recruiter searches.",
    },
    {
      href: "/services/interview-coaching",
      title: "Interview Coaching",
      text: "Prepare for screens about availability, transport, safety, systems, and shift preferences.",
    },
    {
      href: "/jobs/melbourne/traffic-controller",
      title: "Traffic Controller Jobs Melbourne",
      text: "Explore related Melbourne labour-hire roles in civil construction and infrastructure.",
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
            <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>Warehouse & Logistics</span>
          </nav>
          <span className="fj-announcement"><span>Melbourne Sourcing</span> Industrial & Supply Chain Roles</span>
          <h1>Warehouse Jobs <span className="heading-mark">Melbourne</span></h1>
          <p>Optimize your supply chain resume, showcase your forklift tickets, and get applied to top logistics vacancies in Melbourne daily.</p>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">View plans</Link>
            <CalendlyLink className="fj-button fj-button--dark">Optimize my resume</CalendlyLink>
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container fj-split">
          <div className="fj-copy-block">
            <span className="fj-label">Supply Chain Demand</span>
            <h2>Get matched to Melbourne's leading logistics networks</h2>
            <p>
              As Australia's freight and logistics capital, Melbourne hosts massive distribution centers feeding national supply chains. E-commerce expansion has triggered record demand for storemen, voice pickers, and licensed forklift operators.
            </p>
            <p>
              However, large employers utilize automatic parsing systems to screen applicants based on metrics like pick speed, license types, and safety records. 9Jobs restructures your CV to ensure your warehouse skills parse perfectly, increasing your call-back rate from top labor agencies and direct employers.
            </p>
          </div>
          <div className="fj-ai-card">
            <div className="fj-ai-search">
              <Truck size={22} />
              <span>Logistics Sourcing Filter Check</span>
            </div>
            <div className="fj-ai-note">
              <span>Licence Verification</span>
              <strong>Forklift (LF) / Order Picker (LO)</strong>
              <p>Checked. Resumes listing valid WorkSafe tickets trigger immediate recruitment calls.</p>
            </div>
            <div className="fj-ai-note">
              <span>Operational Metrics</span>
              <strong>KPIs, pick rates, safety records</strong>
              <p>Pass. Achievements formatted with numerical values (e.g. 98% pick accuracy).</p>
            </div>
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--muted">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Sought-After Skills</span>
            <h2>Key tickets and capabilities in Victoria</h2>
          </div>
          <div className="fj-card-grid fj-card-grid--four">
            {certifications.map(([title, text, Icon]) => (
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
            <span className="fj-label">Search Optimisation</span>
            <h2>How to make your SEEK profile visible to logistics recruiters</h2>
            <p>
              Recruiters looking for warehouse staff use SEEK candidate database filters to quickly contact candidates nearby. If your SEEK settings do not have your travel radius, vehicle rights, and specific licensing listed, you remain invisible.
            </p>
            <p>
              9Jobs optimizes your SEEK profile settings to match these queries. We help you target specific distribution companies, set correct salary expectations, and automate daily applications so you capture new shifts as soon as they are posted.
            </p>
          </div>
          <div className="fj-role-card">
            <div style={{ padding: "24px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Supply Chain Benchmarks</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Key competencies to highlight</p>
            </div>
            {[
              ["Accredited LF/LO tickets", "WorkSafe Victoria card numbers listed clearly"],
              ["Inventory systems", "Experience with SAP, WMS, or Manhattan software"],
              ["Physical capability", "Ability to lift up to 20kg and work standing shifts"],
              ["E-commerce fulfillment", "Experience with high-volume pick-and-pack metrics"]
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
            <h2>Strengthen your Melbourne warehouse applications</h2>
            <p>Connect this role page with services and related local job pages that improve recruiter discovery.</p>
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
            <h2>Common questions about Melbourne warehouse jobs</h2>
            <p>Answers to help you get hired in the Victorian supply chain.</p>
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
          <span>Outsource Your Job Search</span>
          <h2>Ready to land warehouse shifts in Melbourne?</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
            <CalendlyLink className="fj-button fj-button--dark">Optimize my profile now</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}
