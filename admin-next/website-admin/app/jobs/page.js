import Link from "next/link";
import { ArrowRight, ChevronDown, CheckCircle2, MapPin, Briefcase, FileText, SearchCheck, UserCheck, MessageCircle } from "lucide-react";
import { CalendlyLink } from "../../components/CalendlyWidget";
import { cities } from "../../data/australianJobsData";
import { createSeoMetadata, getRouteSeo } from "../../data/seo";

const routeSeo = getRouteSeo("/jobs");

export const metadata = createSeoMetadata(routeSeo);

const faqs = [
  [
    "How does the 9Jobs location targeting work?",
    "We tailor your resume, LinkedIn, and SEEK profiles with hyper-local keywords, suburbs, and industry terms specific to your target Australian city (e.g., Sydney, Melbourne, Brisbane). This ensures you rank higher when local recruiters search databases."
  ],
  [
    "Do you support regional job seekers in Australia?",
    "Yes. In addition to capital cities, we support regional hubs like Geelong, regional Victoria, and other locations with tailored regional job search and profile optimization strategy."
  ],
  [
    "Can you apply to jobs for me in my target city?",
    "Yes. Our Job Application Support plan includes daily role identification and submissions on your behalf, configured exactly for your desired local regions and sectors."
  ],
  [
    "Why is local city targeting important for Australian resumes?",
    "Recruiters in Australia filter candidates heavily by location. Having an Australian address (or target city) and a local phone number prevents automated ATS screens from discarding your application as an international inquiry."
  ]
];

function jsonLd(schema) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

export default function JobsHubPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://9jobs.co/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Australian Jobs",
        "item": "https://9jobs.co/jobs"
      }
    ]
  };

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

  const services = [
    { href: "/services/resume-writing", name: "Resume Writing Services", desc: "ATS-optimized professional resumes for Australian hiring standards.", icon: FileText },
    { href: "/services/linkedin-optimization", name: "LinkedIn Optimization", desc: "Unlock LinkedIn Recruiter search views with keyword-aligned profiles.", icon: SearchCheck },
    { href: "/services/seek-profile-optimization", name: "SEEK Profile Optimization", desc: "Configure SEEK visibility and preferences for local agency searches.", icon: UserCheck },
    { href: "/services/job-application-automation", name: "Job Sourcing & Applications", desc: "Daily job sourcing and done-for-you applications to match you with active roles.", icon: Briefcase },
    { href: "/services/interview-coaching", name: "Interview Coaching Support", desc: "STAR format coaching and mock interview prep for Australian companies.", icon: MessageCircle }
  ];

  return (
    <main className="site-main fj-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
      />

      {/* Hero Section */}
      <section className="fj-page-hero">
        <div className="fj-container">
          <nav className="fj-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.88rem", color: "var(--fj-muted)", fontWeight: 600 }}>
            <Link href="/" style={{ color: "inherit" }} prefetch={false}>Home</Link>
            <span>&gt;</span>
            <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>Australian Jobs</span>
          </nav>
          <span className="fj-announcement"><span>Job Sourcing</span> Active Hubs across Australia</span>
          <h1>Find Jobs & Accelerate Your Career in <span className="heading-mark">Australia</span></h1>
          <p>Direct access to regional hiring markets, recruiter networks, and local application support across major Australian cities.</p>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing" prefetch={false}>View plans</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a consulting call</CalendlyLink>
          </div>
        </div>
      </section>

      {/* City Hubs List */}
      <section className="fj-section">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Regional Hubs</span>
            <h2>Explore Opportunities in Major Cities</h2>
            <p>Select your target city to learn about local industry demand, suburbs served, and tailored search strategies.</p>
          </div>

          <div className="fj-card-grid fj-card-grid--three" style={{ marginTop: "40px" }}>
            {Object.values(cities).map((city) => (
              <article className="fj-feature-card" key={city.slug} style={{ display: "flex", flexDirection: "column", minHeight: "240px" }}>
                <div className="fj-icon-chip" style={{ background: "var(--fj-soft-2)", color: "var(--fj-ink)", padding: "10px", width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={22} />
                </div>
                <h3 style={{ marginTop: "16px" }}>{city.name} Jobs</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--fj-muted)", margin: "10px 0 20px", flexGrow: 1 }}>{city.description}</p>
                <Link href={`/jobs/${city.slug}`} className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "44px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }} prefetch={false}>
                  Explore {city.name} <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Services Cross-Linking */}
      <section className="fj-section fj-section--muted">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Support Services</span>
            <h2>Optimize Your Search for the Australian Market</h2>
            <p>Ensure your profiles and CV are fully aligned with recruiter expectations before you start applying.</p>
          </div>

          <div className="fj-card-grid fj-card-grid--three" style={{ marginTop: "40px" }}>
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article className="fj-feature-card" key={service.href} style={{ display: "flex", flexDirection: "column", minHeight: "220px" }}>
                  <div className="fj-icon-chip"><Icon size={22} /></div>
                  <h3>{service.name}</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--fj-muted)", margin: "10px 0 20px" }}>{service.desc}</p>
                  <Link href={service.href} className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }} prefetch={false}>
                    Explore {service.name} <ArrowRight size={14} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="fj-section" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Hiring practices in <span className="heading-mark">Australia</span></h2>
            <p>Understand how locations, databases, and local recruiters affect candidate selection.</p>
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

      {/* Final CTA */}
      <section className="fj-section fj-section--tight">
        <div className="fj-container fj-final-cta">
          <span>Outsource Your Sourcing</span>
          <h2>Accelerate your job search across Australia today</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing" prefetch={false}>View Plans</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a free strategy call</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}
