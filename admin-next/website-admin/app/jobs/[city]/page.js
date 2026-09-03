import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronDown, CheckCircle2, MapPin, Briefcase } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { cities, pagesConfig } from "../../../data/australianJobsData";
import { getContentForPage } from "../../../data/contentGenerator";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";

export async function generateStaticParams() {
  return Object.keys(cities).map(city => ({
    city: city
  }));
}

export async function generateMetadata({ params }) {
  const { city } = await params;
  const config = pagesConfig.find(p => p.city === city && p.slug === null);
  if (!config) return {};
  const routeSeo = getRouteSeo(`/jobs/${city}`);

  return createSeoMetadata(routeSeo || {
    title: config.title,
    description: config.metaDescription,
    path: `/jobs/${city}`,
  });
}

export default async function CityPage({ params }) {
  const { city } = await params;
  const pageData = getContentForPage(city, null);
  if (!pageData) {
    notFound();
  }
  const melbourneJobPages = city === "melbourne" ? [
    {
      href: "/jobs/melbourne/traffic-controller",
      title: "Traffic Controller Jobs Melbourne",
      text: "Road and infrastructure roles with ticket-ready resume and SEEK profile support.",
    },
    {
      href: "/jobs/melbourne/warehouse",
      title: "Warehouse Jobs Melbourne",
      text: "Warehouse, logistics, pick-pack, forklift, and operations roles across Melbourne.",
    },
  ] : [];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": pageData.faqs.map(([q, a]) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": a
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": pageData.breadcrumbs.map((b, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": b.name,
      "item": `https://9jobs.co${b.url === "/" ? "" : b.url}`
    }))
  };

  return (
    <main className="site-main fj-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Hero Section */}
      <section className="fj-page-hero">
        <div className="fj-container">
          <nav className="fj-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.88rem", color: "var(--fj-muted)", fontWeight: 600 }}>
            <Link href="/" style={{ color: "inherit" }}>Home</Link>
            <span>&gt;</span>
            <span>Australian Jobs</span>
            <span>&gt;</span>
            <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>{pageData.cityMeta.name}</span>
          </nav>
          <span className="fj-announcement">
            <span>Australian Jobs</span> {pageData.cityMeta.name} Jobs
          </span>
          <h1>{pageData.h1}</h1>
          <p>{pageData.cityMeta.description}</p>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">View plans</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a call</CalendlyLink>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="fj-section">
        <div className="fj-container fj-split">
          <div className="fj-copy-block">
            <span className="fj-label">Market Sourcing Overview</span>
            <h2>Sourcing local jobs in <span className="heading-mark">{pageData.cityMeta.name}</span></h2>
            <p>{pageData.introduction}</p>
            <p>{pageData.extraMarketAnalysis}</p>
          </div>
          <div className="fj-ai-card">
            <div className="fj-ai-search">
              <Briefcase size={22} />
              <span>{pageData.cityMeta.name} Local Industries</span>
            </div>
            {pageData.cityMeta.industries.map((ind, idx) => (
              <div className="fj-ai-note" key={idx}>
                <span>Sector Opportunity</span>
                <strong>{ind}</strong>
                <p>{pageData.cityMeta.industryDescriptions?.[idx] || "High demand for ATS-optimized CV profiles and SEEK targeting."}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strategy Section */}
      <section className="fj-section fj-section--muted">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Search Strategy</span>
            <h2>How to accelerate your search in <span className="heading-mark">{pageData.cityMeta.name}</span></h2>
          </div>
          <div style={{ maxWidth: "800px", margin: "0 auto", lineHeight: "1.8", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p>{pageData.strategyGuide}</p>
            <p>{pageData.atsSection}</p>
          </div>
        </div>
      </section>

      {/* Suburbs Section */}
      <section className="fj-section">
        <div className="fj-container fj-split fj-split--reverse">
          <div className="fj-copy-block">
            <span className="fj-label">Suburbs We Serve</span>
            <h2>Hyper-local assistance in <span className="heading-mark">{pageData.cityMeta.name}</span></h2>
            <p>{pageData.suburbsSection}</p>
          </div>
          <div className="fj-role-card">
            <div style={{ padding: "24px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Active Coverage Areas</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Regional job market mapping</p>
            </div>
            {pageData.cityMeta.suburbs.map((suburb) => (
              <div className="fj-task-row" key={suburb}>
                <MapPin size={18} color="var(--ink)" />
                <span><strong>{suburb}</strong> - Active 9Jobs applicant tracking</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internal Links/Services */}
      <section className="fj-section fj-section--muted">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Core Writing & Optimization Services</span>
            <h2>Maximize your interview callbacks in <span className="heading-mark">Australia</span></h2>
          </div>
          <div className="fj-card-grid fj-card-grid--five">
            <article className="fj-feature-card">
              <div className="fj-icon-chip"><CheckCircle2 size={22} /></div>
              <h3>Resume Writing</h3>
              <p>Get a localized, single-column CV built to pass Australian Applicant Tracking Systems.</p>
              <Link href="/services/resume-writing" className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                Explore resume writing <ArrowRight size={14} />
              </Link>
            </article>

            <article className="fj-feature-card">
              <div className="fj-icon-chip"><CheckCircle2 size={22} /></div>
              <h3>LinkedIn Optimization</h3>
              <p>Boost your profile settings and keyword alignment to trigger calls from local recruiters.</p>
              <Link href="/services/linkedin-optimization" className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                Explore LinkedIn optimization <ArrowRight size={14} />
              </Link>
            </article>

            <article className="fj-feature-card">
              <div className="fj-icon-chip"><CheckCircle2 size={22} /></div>
              <h3>SEEK Profile Optimization</h3>
              <p>Configure your SEEK preferences and search visibility to match Australian agency searches.</p>
              <Link href="/services/seek-profile-optimization" className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                Explore SEEK optimization <ArrowRight size={14} />
              </Link>
            </article>

            <article className="fj-feature-card">
              <div className="fj-icon-chip"><CheckCircle2 size={22} /></div>
              <h3>Job Application Services</h3>
              <p>Outsource the job search workflow. We apply to matching roles daily on your behalf.</p>
              <Link href="/services/job-application-automation" className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                Explore application automation <ArrowRight size={14} />
              </Link>
            </article>

            <article className="fj-feature-card">
              <div className="fj-icon-chip"><CheckCircle2 size={22} /></div>
              <h3>Interview Support</h3>
              <p>Prepare for Australian structured behavioral queries with tailored mock prep sessions.</p>
              <Link href="/services/interview-coaching" className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                Explore interview coaching <ArrowRight size={14} />
              </Link>
            </article>
          </div>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "40px", flexWrap: "wrap" }}>
            <Link href="/services" className="fj-button fj-button--ghost">
              Explore Services Hub <ArrowRight size={16} />
            </Link>
            <Link href="/" className="fj-button fj-button--ghost">
              Back to Homepage <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Cross-linking other cities */}
      <section className="fj-section">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Related Locations</span>
            <h2>Explore opportunities in <span className="heading-mark">other regions</span></h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center" }}>
            {pageData.otherCities.map(c => (
              <Link key={c.href} href={c.href} className="fj-button fj-button--ghost" style={{ minWidth: "220px", textAlign: "center" }}>
                {c.name} <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {melbourneJobPages.length > 0 && (
        <section className="fj-section fj-section--muted">
          <div className="fj-container">
            <div className="fj-section-head">
              <span className="fj-label">Popular Melbourne job pages</span>
              <h2>Explore high-intent job searches in <span className="heading-mark">Melbourne</span></h2>
              <p>These targeted pages connect Melbourne job seekers to role-specific resume, SEEK, and application support.</p>
            </div>
            <div className="fj-card-grid fj-card-grid--two">
              {melbourneJobPages.map((page) => (
                <article className="fj-feature-card" key={page.href}>
                  <h3>{page.title}</h3>
                  <p>{page.text}</p>
                  <Link href={page.href} className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                    View page <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs Section */}
      <section className="fj-section fj-section--muted" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Common questions about <span className="heading-mark">{pageData.cityMeta.name}</span> hiring</h2>
            <p>Answers to help you navigate local recruiter preferences and application systems.</p>
            <CalendlyLink className="fj-button fj-button--dark">
              Talk to us <ArrowRight size={17} />
            </CalendlyLink>
          </div>

          <div className="fj-faq-list">
            {pageData.faqs.map(([question, answer], index) => (
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
          <span>Outsource Your Job Sourcing</span>
          <h2>Accelerate your job search in {pageData.cityMeta.name} today</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a consulting call</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}
