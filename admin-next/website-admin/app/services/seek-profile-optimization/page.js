import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, CheckCircle2, ChevronDown, FileText, Search, UserCheck, ShieldCheck, Sparkles, Target, Star } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";
import { Reveal, StaggerContainer, StaggerItem, HoverCard, PageTransition, FloatingCard } from "../../../components/homepage/HomeMotion";

const HomeFaq = dynamic(() => import("../../../components/homepage/HomeFaq"));
const ServiceRelatedGuides = dynamic(() => import("../../../components/RelatedSeoLinks").then((mod) => mod.ServiceRelatedGuides));

const routeSeo = getRouteSeo("/services/seek-profile-optimization");

export const metadata = createSeoMetadata(routeSeo);

const services = [
  ["SEEK Profile Rewrite", "Craft a compelling, localized personal summary and fill key experience areas using local keywords.", FileText],
  ["Search Status Setup", "Configure your privacy and search status to 'Active' so recruiters find you instantly.", Target],
  ["Keyword Integration", "Incorporate target industry, tool, and role keywords that recruiters use to filter SEEK candidates.", Search],
  ["Alert & Preferences Tuning", "Set up correct alerts, salary targets, and location tags matching your career objectives.", UserCheck],
];

const checklist = [
  ["SEEK Profile Summary", "We write a professional summary tailored to pass SEEK's internal matching algorithms."],
  ["Active Sourcing Setup", "We guide you on setting up visibility settings so recruiters can contact you directly."],
  ["Resume Alignment", "We ensure the resume uploaded to your SEEK profile matches your search filters and keywords."],
  ["Alert Preferences", "Tuning notifications, salary expectations, and job alert filters to capture the best roles."],
];

const faqs = [
  [
    "Why is SEEK important for finding a job in Australia?",
    "SEEK is the absolute leader in the Australian job market. Almost all companies, recruitment firms, and HR departments use SEEK to post jobs and search for candidates. Having an optimized SEEK profile is just as critical as having a good resume or LinkedIn profile because it allows recruiters to find you in their search queries."
  ],
  [
    "What is the difference between a SEEK profile and a resume?",
    "Your resume is a document you upload and send when applying. Your SEEK profile is a digital profile index that lives on the platform. Recruiter search tools scan your SEEK profile text and skills tags to filter candidates. If your profile is empty or lacks keywords, you will not show up in searches, even if your uploaded resume is perfect."
  ],
  [
    "How does the SEEK optimization service work?",
    "We review your current profile, uploaded resume, and target roles in Australia. We then provide a document containing optimized copy for your SEEK summary, experience, skills, and settings. We also guide you on setting up search preferences and alert parameters."
  ],
  [
    "Should my SEEK profile be set to 'Standard' or 'Limited' privacy?",
    "We recommend setting your profile to 'Standard' (fully visible to recruiters) when actively looking for work. This allows registered employers and recruitment agencies to search for you, read your summary, view your uploaded resume, and contact you directly. We help you configure these settings safely."
  ],
  [
    "Can you help me set up SEEK job alerts?",
    "Yes. We advise you on the best salary ranges, job classifications, and keywords to set up for your daily alerts to ensure you receive relevant, high-impact opportunities directly in your inbox."
  ]
];

export default function SeekOptimizationPage() {
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

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "SEEK Profile Optimization Services",
    "provider": {
      "@type": "LocalBusiness",
      "name": "9Jobs",
      "url": "https://9jobs.co",
      "logo": "https://9jobs.co/9jobs-logo.png",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Melbourne",
        "addressRegion": "VIC",
        "addressCountry": "AU"
      }
    },
    "areaServed": {
      "@type": "Country",
      "name": "Australia"
    },
    "description": "Professional SEEK profile optimization services to increase visibility to recruitment agencies in Australia.",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "AUD",
      "lowPrice": "99",
      "highPrice": "199",
      "offerCount": "1"
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://9jobs.co"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Services",
        "item": "https://9jobs.co/services"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "SEEK Profile Optimization",
        "item": "https://9jobs.co/services/seek-profile-optimization"
      }
    ]
  };

  return (
    <PageTransition>
      <main className="site-main fj-page" data-fj-motion-root="true">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        <section className="fj-page-hero">
          <div className="fj-container">
            <Reveal direction="down" duration={0.6}>
              <nav className="fj-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.88rem", color: "var(--fj-muted)", fontWeight: 600 }}>
                <Link href="/" style={{ color: "inherit" }}>Home</Link>
                <span>&gt;</span>
                <span>Services</span>
                <span>&gt;</span>
                <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>SEEK Profile Optimization</span>
              </nav>
            </Reveal>
            <Reveal direction="down" duration={0.6} delay={0.06}>
              <span className="fj-announcement"><span>Services</span> SEEK Profile Optimization</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.12}>
              <StaggerItem as="div">
                <h1>Get Recruiter Inquiries with an Optimized <span className="heading-mark">SEEK Profile</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>We optimize your SEEK profile summary, experience tags, and search settings to help you stand out to Australian employers and recruitment agencies.</p>
              </StaggerItem>
              <StaggerItem as="div">
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">View plans</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book an audit</CalendlyLink>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container fj-split">
            <Reveal direction="left" distance={30}>
              <div className="fj-copy-block">
                <span className="fj-label">Optimize for Australia's Largest Job Site</span>
                <h2>Why an optimized SEEK profile is essential for your job <span className="heading-mark">search</span></h2>
                <p>
                  In Australia, SEEK handles the majority of online recruitment activity. When companies have open roles, their talent sourcing teams do not just wait for applications to roll in. They actively search the SEEK candidate database using search queries based on role title, location, salary parameters, and key skill terms.
                </p>
                <p>
                  If your SEEK profile lacks a structured summary, has missing experiences, or is set to incorrect privacy modes, you miss out on a massive stream of potential recruiter outreach. 9Jobs specializes in configuring SEEK profiles to pass filtering checks, rank high in searches, and clearly communicate your value to hiring teams.
                </p>
              </div>
            </Reveal>
            <Reveal direction="right" distance={30} style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <FloatingCard depth={24} floatRange={12} duration={7.2}>
                  <div className="fj-ai-card">
                    <div className="fj-ai-search">
                      <Search size={22} />
                      <span>SEEK Sourcing Scan Simulation</span>
                    </div>
                    <div className="fj-ai-note">
                      <span>Profile Completeness</span>
                      <strong>Summary, roles, and skills tags check</strong>
                      <p>Excellent. Fully optimized profile data structure matching database indexing requirements.</p>
                    </div>
                    <div className="fj-ai-note">
                      <span>Recruiter Visibility Status</span>
                      <strong>Privacy and alerts configuration</strong>
                      <p>Pass. Sourcing state configured to 'Visible' with appropriate relocation notes.</p>
                    </div>
                  </div>
                </FloatingCard>
                <div className="fj-hero-floating-cluster" style={{ pointerEvents: 'none' }}>
                  <FloatingCard className="fj-hero-floating-card" depth={14} floatRange={8} duration={6} style={{ position: 'absolute', top: '-20px', left: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Profile visibility: Standard</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>Visible to registered recruiters</span>
                  </FloatingCard>
                  <FloatingCard className="fj-hero-floating-card" depth={18} floatRange={10} duration={7} delay={0.4} style={{ position: 'absolute', bottom: '-20px', right: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Matching compatibility: 96%</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>Resume parse verified</span>
                  </FloatingCard>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="fj-section fj-section--muted">
          <div className="fj-container">
            <Reveal direction="up" distance={20}>
              <div className="fj-section-head">
                <span className="fj-label">Service Deliverables</span>
                <h2>Complete profile configuration for maximum <span className="heading-mark">reach</span></h2>
              </div>
            </Reveal>
            <StaggerContainer as="div" className="fj-card-grid fj-card-grid--four" stagger={0.1}>
              {services.map(([title, text, Icon]) => (
                <StaggerItem as="div" key={title}>
                  <HoverCard className="fj-feature-card" style={{ height: "100%" }}>
                    <div className="fj-icon-chip"><Icon size={22} /></div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container fj-split fj-split--reverse">
            <Reveal direction="right" distance={30}>
              <div className="fj-copy-block">
                <span className="fj-label">Our Process</span>
                <h2>Our systematic approach to building a recruiter-ready SEEK <span className="heading-mark">presence</span></h2>
                <StaggerContainer as="div" className="fj-list-grid" stagger={0.1}>
                  {checklist.map(([title, text]) => (
                    <StaggerItem as="div" className="fj-mini-item" key={title}>
                      <CheckCircle2 size={22} />
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </Reveal>
            <Reveal direction="left" distance={30}>
              <FloatingCard depth={18} floatRange={8} duration={6}>
                <div className="fj-role-card">
                  <div style={{ padding: "24px", borderBottom: "1px solid var(--line)" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>SEEK Database Milestones</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Tracking profile health metrics</p>
                  </div>
                  {[
                    ["Profile Status", "Set to Active / Visible to recruiters"],
                    ["Summary Length", "Optimized 150-200 word bio containing local terms"],
                    ["Job History Match", "Experience entries aligned with target resume"],
                    ["Alert Preferences", "Daily notifications aligned with salary and location filters"]
                  ].map(([title, desc]) => (
                    <div className="fj-task-row" key={title}>
                      <CheckCircle2 size={18} />
                      <span><strong>{title}</strong>: {desc}</span>
                    </div>
                  ))}
                </div>
              </FloatingCard>
            </Reveal>
          </div>
        </section>

        <section className="fj-section fj-section--muted">
          <div className="fj-container">
            <Reveal direction="up" distance={20}>
              <div className="fj-section-head">
                <span className="fj-label">Detailed Insights</span>
                <h2>Best practices for optimization on SEEK <span className="heading-mark">revealed</span></h2>
              </div>
            </Reveal>
            <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.8", color: "var(--muted)" }}>
              <p>
                To get the most value out of SEEK, candidates must treat their profile as a dynamic landing page. The SEEK search algorithm index fields in a specific hierarchy: your current job title, your skills checklist, your profile summary, and your past roles. Leaving these fields blank or copying-pasting generic resumes limits your reach.
              </p>
              <p>
                The profile summary is particularly critical. This is a 150 to 200 word summary that recruiters see first in search results. It must state your core expertise, key achievements, years of experience, and location availability. If you are relocating or holding a visa with working rights, this summary is the perfect place to communicate that information to preemptively bypass location-based filtering.
              </p>
              <p>
                Another common mistake is setting incorrect location and salary preferences. Recruiters filter database searches strictly based on salary bounds. If your profile lists a target salary range that does not match local benchmarks or target role values, you will be excluded from recruiter dashboards. We review local salary indicators to configure these ranges correctly.
              </p>
              <p>
                Finally, we ensure that your uploaded resume matches the text on your digital profile. SEEK provides automated matching scores to recruiters by scanning the difference between your profile fields and your uploaded document. A close match ensures a high compatibility score, boosting your visibility.
              </p>
            </div>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-leader-card">
                <div>
                  <h2>Gain complete coverage of the local market <span className="heading-mark">now</span></h2>
                  <p>Combine your optimized SEEK profile with a professional <Link href="/services/resume-writing">Resume Review</Link> and <Link href="/services/linkedin-optimization">LinkedIn Profile Optimization</Link> to maximize calls.</p>
                </div>
                <div className="fj-leader-media">
                  <Sparkles size={120} color="var(--lime)" style={{ margin: "auto" }} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <ServiceRelatedGuides topic="seek" />

        <section className="fj-section fj-section--muted" id="faqs">
          <div className="fj-container fj-faq-grid">
            <Reveal direction="left" distance={30}>
              <div className="fj-faq-intro">
                <span className="fj-label">FAQs</span>
                <h2>Questions about SEEK profile optimization in <span className="heading-mark">Australia</span></h2>
                <p>Answers to help you get discovered on the leading job platform.</p>
                <CalendlyLink className="fj-button fj-button--dark">
                  Talk to us <ArrowRight size={17} />
                </CalendlyLink>
              </div>
            </Reveal>

            <Reveal direction="right" distance={30} delay={0.06}>
              <HomeFaq items={faqs} />
            </Reveal>
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-final-cta">
                <span>Get Discovered</span>
                <h2>Ready to optimize your SEEK presence?</h2>
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book a SEEK profile review</CalendlyLink>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

