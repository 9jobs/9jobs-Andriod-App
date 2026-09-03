import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, ClipboardCheck, Search, UserCheck, ShieldCheck, Sparkles, Target, Star } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { ServiceRelatedGuides } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";
import { Reveal, StaggerContainer, StaggerItem, HoverCard, PageTransition, FloatingCard } from "../../../components/homepage/HomeMotion";
import HomeFaq from "../../../components/homepage/HomeFaq";

const routeSeo = getRouteSeo("/services/job-application-automation");

export const metadata = createSeoMetadata(routeSeo);

const services = [
  ["Done-for-You Applications", "We research, identify, and submit high-quality job applications on your behalf, maintaining a daily pipeline.", ClipboardCheck],
  ["Role & Skill Matching", "We analyze role requirements, tech stacks, and seniority levels to ensure we only apply to suitable positions.", Target],
  ["SEEK & Jora Pipelines", "We run job application workflows across major local platforms including SEEK, Jora, LinkedIn, and direct portals.", Search],
  ["Daily Progress Reports", "Get detailed updates on which roles were applied to, company names, titles, and application status.", UserCheck],
];

const checklist = [
  ["Target Parameters Setting", "We map out your desired roles, target salary benchmarks, locations, and working formats (remote/hybrid/onsite)."],
  ["ATS Compliance Reviews", "We review every target description to ensure your resume matches high-impact keyword expectations before applying."],
  ["Application Submissions", "Our team submits daily applications on your behalf, answering application questionnaires with approved answers."],
  ["Recruiter Notes Logging", "Detailed tracking logs of all submitted roles, enabling easy follow-up tracking and interview preparation."],
];

const faqs = [
  [
    "How does the job application service work?",
    "We start by aligning on your career goals, target role titles, locations, and salary parameters. We then use your optimized resume and online profiles to actively search for matching positions across SEEK, Jora, and LinkedIn. We submit applications on your behalf, answers standard questionnaire forms based on your background, and provide daily logs of all applications so you stay fully informed."
  ],
  [
    "How many jobs will you apply to on my behalf?",
    "The application volume depends on your target market, industry, and the number of active, matching listings available. We focus on quality and relevancy rather than spamming. Typically, we submit between 10 to 25 highly targeted applications per week depending on the active listings matching your parameters."
  ],
  [
    "Do you customize cover letters for each application?",
    "Yes. For roles that require customized cover letters or specific selection criteria answers, we tailor the templates to align your experience with the key capabilities requested by the employer before submission."
  ],
  [
    "What platforms do you use to apply for jobs?",
    "We primarily use SEEK, Jora, and LinkedIn, as they cover over 90% of the active professional vacancies in Australia. If appropriate, we also submit applications directly through company HR portals (e.g. Workday, SuccessFactors)."
  ],
  [
    "How do I track which jobs have been applied to?",
    "We provide a shared tracking dashboard where you can see all applications in real-time: company name, job title, platform used, application date, and links to the original postings. This keeps your search fully organized."
  ]
];

export default function JobApplicationServicesPage() {
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
    "serviceType": "Job Sourcing and Application Management",
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
    "description": "Done-for-you job search and automatic application submission service for professionals in Australia.",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "AUD",
      "lowPrice": "199",
      "highPrice": "699",
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
        "name": "Job Application Automation",
        "item": "https://9jobs.co/services/job-application-automation"
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
                <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>Job Application Automation</span>
              </nav>
            </Reveal>
            <Reveal direction="down" duration={0.6} delay={0.06}>
              <span className="fj-announcement"><span>Services</span> Job Application Services Australia</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.12}>
              <StaggerItem as="div">
                <h1>We Apply for Jobs in Australia on Your <span className="heading-mark">Behalf</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>Save time, maintain consistency, and land more interviews. 9Jobs manages your daily application workflow from matching to submission.</p>
              </StaggerItem>
              <StaggerItem as="div">
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">View plans</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Schedule a workflow demo</CalendlyLink>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container fj-split">
            <Reveal direction="left" distance={30}>
              <div className="fj-copy-block">
                <span className="fj-label">Save Hours of Busywork</span>
                <h2>Why a consistent, daily application strategy is vital in <span className="heading-mark">Australia</span></h2>
                <p>
                  Looking for a job is a full-time job. To secure interviews in a competitive market like Australia, you must remain consistent. Most candidates apply to roles in erratic batches—sending 20 applications in one weekend and then none for a fortnight. This approach means you miss out on high-impact roles that get filled within 48 hours of posting.
                </p>
                <p>
                  Applying for jobs manually is tedious. Searching platforms, tailoring resumes, filling out long HR questionnaires, and tracking deadlines takes hours. 9Jobs solves this problem by handling the busywork for you. We search, filter, and submit high-relevancy applications daily, ensuring you never miss a match while freeing you up to focus on interview preparation.
                </p>
              </div>
            </Reveal>
            <Reveal direction="right" distance={30} style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <FloatingCard depth={24} floatRange={12} duration={7.2}>
                  <div className="fj-ai-card">
                    <div className="fj-ai-search">
                      <ClipboardCheck size={22} />
                      <span>Application Pipeline Active</span>
                    </div>
                    <div className="fj-ai-note">
                      <span>Matching algorithm scan</span>
                      <strong>Role criteria verification</strong>
                      <p>Relevancy check complete. Match score 92% based on target profiles.</p>
                    </div>
                    <div className="fj-ai-note">
                      <span>Submission tracking</span>
                      <strong>Daily volume logs</strong>
                      <p>Pass. 4 matching roles applied to on SEEK & Jora today.</p>
                    </div>
                  </div>
                </FloatingCard>
                <div className="fj-hero-floating-cluster" style={{ pointerEvents: 'none' }}>
                  <FloatingCard className="fj-hero-floating-card" depth={14} floatRange={8} duration={6} style={{ position: 'absolute', top: '-20px', left: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Applied to Canva</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>Product Designer (SEEK)</span>
                  </FloatingCard>
                  <FloatingCard className="fj-hero-floating-card" depth={18} floatRange={10} duration={7} delay={0.4} style={{ position: 'absolute', bottom: '-20px', right: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Applied to Atlassian</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>Software Engineer (Portal)</span>
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
                <span className="fj-label">Service Features</span>
                <h2>A structured, done-for-you job search <span className="heading-mark">pipeline</span></h2>
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
                <h2>How we manage your job applications <span className="heading-mark">daily</span></h2>
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
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Live Application Pipeline</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Current status breakdown</p>
                  </div>
                  {[
                    ["Matching roles reviewed", "18 positions analyzed today"],
                    ["ATS resume optimized", "Tailored achievements matched to requirements"],
                    ["Applications submitted", "4 target submissions completed"],
                    ["Tracking logs updated", "View company details on shared board"]
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
                <h2>The reality of applying for jobs in Australia <span className="heading-mark">uncovered</span></h2>
              </div>
            </Reveal>
            <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.8", color: "var(--muted)" }}>
              <p>
                In Australia, recruitment cycles are fast, especially for professional, commercial, and technical vacancies. When a recruiter posts an ad on SEEK or Jora, they receive an initial surge of applications within the first 48 hours. Sourcing teams typically begin reviewing, screening, and contacting candidates almost immediately. If you apply 5 days after the posting, the role may already be in the final interview stage.
              </p>
              <p>
                This fast cycle makes daily application checks essential. A successful strategy requires monitoring alerts, identifying matching roles, verifying that your profile matches requirements, and submitting the application immediately. If you are doing this manually, it is easy to burn out or miss matching roles.
              </p>
              <p>
                Additionally, many corporate application portals require candidates to navigate lengthy registration forms and answer behavioral questions during the submission process. We manage all of these steps for you. By leveraging your pre-approved answers and professional background, we submit high-quality applications that represent you professionally while maintaining the daily consistency required to capture new vacancies.
              </p>
              <p>
                Most importantly, we keep your job search organized. When you receive a screening call from an agency or employer, the first question they ask is: &quot;Why are you interested in this role?&quot; If you have applied to hundreds of jobs randomly, you won't remember the details of that specific company. Our shared dashboard ensures you can instantly view the company's description, the job ad, and the version of the resume submitted, so you show up prepared for every initial conversation.
              </p>
            </div>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-leader-card">
                <div>
                  <h2>Prepare for incoming interview requests <span className="heading-mark">confidently</span></h2>
                  <p>Once your applications are running consistently, prepare for recruiter calls with our specialized <Link href="/services/interview-coaching">Interview Support</Link> program.</p>
                </div>
                <div className="fj-leader-media">
                  <Sparkles size={120} color="var(--lime)" style={{ margin: "auto" }} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <ServiceRelatedGuides topic="applications" />

        <section className="fj-section fj-section--muted" id="faqs">
          <div className="fj-container fj-faq-grid">
            <Reveal direction="left" distance={30}>
              <div className="fj-faq-intro">
                <span className="fj-label">FAQs</span>
                <h2>Questions about job application services in <span className="heading-mark">Australia</span></h2>
                <p>Answers to help you understand our process and workflow.</p>
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
                <span>Outsource the Busywork</span>
                <h2>Ready to maintain a consistent daily application pipeline?</h2>
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Schedule a pipeline demo</CalendlyLink>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

