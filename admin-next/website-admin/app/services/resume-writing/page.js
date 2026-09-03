import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Search, UserCheck, ShieldCheck, Sparkles, Target } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { ServiceRelatedGuides } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";
import { Reveal, StaggerContainer, StaggerItem, HoverCard, PageTransition, FloatingCard } from "../../../components/homepage/HomeMotion";
import HomeFaq from "../../../components/homepage/HomeFaq";

const routeSeo = getRouteSeo("/services/resume-writing");

export const metadata = createSeoMetadata(routeSeo);

const services = [
  ["ATS Compliance", "Optimized structure, fonts, and keywords to pass major Applicant Tracking Systems used by Australian employers.", FileText],
  ["Australian Style Format", "Correct layout, chronological structure, length (2-3 pages max), and local language preferences.", Target],
  ["Accomplishment Focused", "We frame your experience around measurable outcomes, metrics, and business value rather than just daily tasks.", UserCheck],
  ["Keyword Targeting", "Inclusion of high-impact industry keywords based on job descriptions in your specific target sector.", Search],
];

const checklist = [
  ["Visually Clean Layout", "We use modern, minimal designs that focus on readability rather than complex graphics that block ATS systems."],
  ["ATS Scanner Friendly", "We write text from scratch ensuring compatibility with scanners like Workday, Taleo, and SuccessFactors."],
  ["Australia-aligned Terms", "Translation of terminology into local expectations (e.g. visa states, superannuation info where needed)."],
  ["Achievement Highlighting", "We rewrite boring description lines into powerful success actions using strong verb structures."],
];

const faqs = [
  [
    "Why do I need a specific resume format for Australia?",
    "Australian recruiters and hiring managers expect resumes to follow specific conventions: a length of 2 to 3 pages, reverse-chronological order, a concise professional summary, and key achievements clearly highlighted with metrics. In addition, almost all mid-to-large companies in Australia use Applicant Tracking Systems (ATS) to filter resumes before human eyes see them. A general global resume might fail these local systems due to formatting errors or lack of localized keywords."
  ],
  [
    "What is an ATS-friendly resume?",
    "An ATS-friendly resume is designed to be easily read and parsed by applicant tracking software. It avoids elements like text boxes, graphics, charts, headers, footers, or non-standard fonts that can scramble the data during scanning. It also incorporates relevant, targeted keywords matching the specific job advertisement to ensure your profile ranks highly in search results when recruiters filter candidates."
  ],
  [
    "How long does the resume writing process take?",
    "Once we receive your current resume and gather information about your target roles in Australia, our writing team drafts a complete ATS-optimized resume. The first draft is typically delivered within 3 to 5 business days. We then work with you through a review process to incorporate feedback, finalize the wording, and get it ready for active job applications."
  ],
  [
    "Do you write resumes for technical IT and non-technical roles?",
    "Yes. Our writing team has extensive experience across both sectors. For IT professionals (Developers, Data Analysts, Cloud Engineers), we emphasize technical stacks, systems, and methodologies. For non-IT professionals (Sales, Operations, HR, Finance), we focus on business values, leadership, process improvement, and local client service experience."
  ],
  [
    "Do you provide cover letters alongside the resume?",
    "Yes. Alongside resume writing, we offer tailored cover letter templates and customized cover letters matching your applications to ensure a cohesive, professional narrative across your entire profile."
  ]
];

export default function ResumeServicesPage() {
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
    "serviceType": "Resume Writing Services",
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
    "description": "ATS-optimized professional resume writing services tailored to Australian recruitment and hiring practices.",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "AUD",
      "lowPrice": "99",
      "highPrice": "499",
      "offerCount": "3"
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
        "name": "Resume Writing",
        "item": "https://9jobs.co/services/resume-writing"
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
                <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>Resume Writing</span>
              </nav>
            </Reveal>
            <Reveal direction="down" duration={0.6} delay={0.06}>
              <span className="fj-announcement"><span>Services</span> Resume Writing Services Australia</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.12}>
              <StaggerItem as="div">
                <h1>Get an ATS-Optimized Resume Built for <span className="heading-mark">Australia</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>We rewrite and format your resume to pass applicant tracking systems, highlight your key professional outcomes, and capture attention from Australian recruiters.</p>
              </StaggerItem>
              <StaggerItem as="div">
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">View plans</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book a call</CalendlyLink>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container fj-split">
            <Reveal direction="left" distance={30}>
              <div className="fj-copy-block">
                <span className="fj-label">Why Your Resume Matters</span>
                <h2>Why a generic resume fails in the Australian job <span className="heading-mark">market</span></h2>
                <p>
                  Applying for jobs in Australia is a highly competitive process. Every advertised position on platforms like SEEK or Jora receives dozens or even hundreds of applications. To manage this volume, recruiters rely on digital scanners (Applicant Tracking Systems) to automatically filter out up to 75% of candidates before a human recruiter even views a file.
                </p>
                <p>
                  A resume that has too much graphics, uses multi-column tables, or fails to list localized keywords gets automatically scrambled or classified as irrelevant. 9Jobs understands how local hiring workflows operate. We rewrite your resume to clear the digital hurdles, focus on localized requirements, and present your profile in a format Australian employers expect.
                </p>
              </div>
            </Reveal>
            <Reveal direction="right" distance={30} style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <FloatingCard depth={24} floatRange={12} duration={7.2}>
                  <div className="fj-ai-card">
                    <div className="fj-ai-search">
                      <FileText size={22} />
                      <span>ATS Quality Score Check</span>
                    </div>
                    <div className="fj-ai-note">
                      <span>Formatting scan</span>
                      <strong>Tables, charts, columns check</strong>
                      <p>Pass. Standard single-column layout clean parsing.</p>
                    </div>
                    <div className="fj-ai-note">
                      <span>Keyword Density</span>
                      <strong>Australian English & Super terms</strong>
                      <p>Pass. Target industry keywords integrated at 4.2% density.</p>
                    </div>
                  </div>
                </FloatingCard>
                <div className="fj-hero-floating-cluster" style={{ pointerEvents: 'none' }}>
                  <FloatingCard className="fj-hero-floating-card" depth={14} floatRange={8} duration={6} style={{ position: 'absolute', top: '-20px', left: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>ATS score improved</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>From 45% to 92%</span>
                  </FloatingCard>
                  <FloatingCard className="fj-hero-floating-card" depth={18} floatRange={10} duration={7} delay={0.4} style={{ position: 'absolute', bottom: '-20px', right: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Keywords matched</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>ATS audit pass</span>
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
                <span className="fj-label">Our Features</span>
                <h2>Tailored details for professional <span className="heading-mark">impact</span></h2>
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
                <h2>How we craft your professional story <span className="heading-mark">step-by-step</span></h2>
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
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Resume Revision Cycle</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Tracking document milestones</p>
                  </div>
                  {[
                    ["Professional Summary", "Parsed summary for local alignment"],
                    ["Job Description Match", "Integrated targeted local keywords"],
                    ["Achievement Format", "Updated tasks to metrics-focused achievements"]
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
                <h2>Crucial resume writing practices for <span className="heading-mark">Australia</span></h2>
              </div>
            </Reveal>
            <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.8", color: "var(--muted)" }}>
              <p>
                When applying for roles in Sydney, Melbourne, Brisbane, or other Australian cities, writing a resume is not just about translating your work history into bullet points. It requires matching the local employer expectations. In Australia, hiring teams expect to see a clear list of target skills, a concise professional summary that states your eligibility/visa status clearly, a summary of your career milestones, and a clear education history.
              </p>
              <p>
                One of the biggest mistakes international applicants make is using a CV format that is too long or contains details like date of birth, marital status, or a profile photo. In Australia, due to anti-discrimination laws, recruiters actively dislike seeing personal details or photos on a resume. A standard, highly-focused document of 2 to 3 pages is the golden standard.
              </p>
              <p>
                Another critical element is the format of your accomplishments. Writing descriptions like &quot;Responsible for managing client database&quot; is not enough. You must show the value: &quot;Managed a SQL database of 10,000 client profiles, implementing security updates that reduced access latency by 15%.&quot; 9Jobs specializes in converting standard descriptions into outcomes that prove your business capability.
              </p>
              <p>
                Lastly, we ensure that your resume works in tandem with your other online profiles. When a recruiter finds your resume on SEEK or receives it in an application, they will immediately search for you on LinkedIn. If the details, dates, or titles on your resume do not match your online presence, it raises immediate red flags. We ensure consistency across all surfaces so you present a clean, unified brand.
              </p>
            </div>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-leader-card">
                <div>
                  <h2>Start applying with absolute <span className="heading-mark">confidence</span></h2>
                  <p>Combine your optimized resume with our <Link href="/services/linkedin-optimization">LinkedIn Optimization</Link> and <Link href="/services/seek-profile-optimization">SEEK Profile Optimization</Link> services to double your interview callbacks.</p>
                </div>
                <div className="fj-leader-media">
                  <ShieldCheck size={120} color="var(--lime)" style={{ margin: "auto" }} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <ServiceRelatedGuides topic="resume" />

        <section className="fj-section fj-section--muted" id="faqs">
          <div className="fj-container fj-faq-grid">
            <Reveal direction="left" distance={30}>
              <div className="fj-faq-intro">
                <span className="fj-label">FAQs</span>
                <h2>Questions about resume writing in <span className="heading-mark">Australia</span></h2>
                <p>Answers to help you understand local requirements and formats.</p>
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
                <span>Transform Your Profile</span>
                <h2>Ready to get noticed by Australian recruiters?</h2>
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book a resume review</CalendlyLink>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

