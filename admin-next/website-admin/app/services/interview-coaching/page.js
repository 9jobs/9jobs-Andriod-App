import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Bell, Search, UserCheck, ShieldCheck, Sparkles, Target, Star } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { ServiceRelatedGuides } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";
import { Reveal, StaggerContainer, StaggerItem, HoverCard, PageTransition, FloatingCard } from "../../../components/homepage/HomeMotion";
import HomeFaq from "../../../components/homepage/HomeFaq";

const routeSeo = getRouteSeo("/services/interview-coaching");

export const metadata = createSeoMetadata(routeSeo);

const services = [
  ["Interview Notifications", "Real-time logging and tracking of incoming interview requests, phone screens, and recruiter follow-ups.", Bell],
  ["Behavioral Prep Coaching", "Targeted preparation for behavioral and situational interviews using the structured STAR technique.", Target],
  ["Australian Business Culture", "Coaching on communication styles, professional standards, and cultural expectations of local hiring managers.", UserCheck],
  ["Salary Negotiation Support", "Strategy coaching to negotiate compensation, benefits, and contract parameters with confidence.", ShieldCheck],
];

const checklist = [
  ["Recruiter Screening prep", "We guide you on how to handle the initial 10-15 minute recruiter phone screen, visa questions, and salary matching."],
  ["STAR Method Framework", "We structure your past career achievements into clear Situation, Task, Action, and Result formats."],
  ["Mock Interview Sessions", "Practice mock sessions mimicking common interview formats used by Australian corporates and tech firms."],
  ["Post-Interview Debrief", "We review the feedback, analyze questions asked, and refine parameters for subsequent stages."],
];

const faqs = [
  [
    "How does the interview support service work?",
    "When you receive interview invitations from your job applications, we run targeted preparation sessions. We review the job description, research the company's background, and map out likely behavioral and technical questions. We conduct mock practices, refine your answers, and coach you on negotiation strategy."
  ],
  [
    "What is the STAR method, and why is it used?",
    "The STAR method (Situation, Task, Action, Result) is the standard framework expected by Australian employers for behavioral questions (e.g. 'Tell me about a time you resolved a conflict'). It provides a clear, logical structure that proves your problem-solving capabilities using real metrics. We help you translate your career history into this format."
  ],
  [
    "How do you help with salary negotiation?",
    "We research local salary guides (like Hays or SEEK indicators) to establish industry benchmarks for your level. We then coach you on how to articulate your expectations, frame negotiations around value, and handle offer proposals confidently."
  ],
  [
    "Do you support technical coding or case study interviews?",
    "Yes. We support candidates across IT and commercial sectors. For technical roles, we help structure explanations of your technical stack, architecture choices, and project delivery processes. For non-tech roles, we focus on leadership, problem-solving, and stakeholder management."
  ],
  [
    "Do mock interviews take place online?",
    "Yes. All preparation sessions and mock interviews are conducted online via video conferencing (Zoom/Teams), replicating the exact format used by most employers for first and second-round interviews."
  ]
];

export default function InterviewSupportPage() {
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
    "serviceType": "Interview Coaching and Prep Support Services",
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
    "description": "Structured job interview preparation and mock practice coaching tailored to Australian business standards.",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "AUD",
      "lowPrice": "149",
      "highPrice": "399",
      "offerCount": "2"
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
        "name": "Interview Coaching",
        "item": "https://9jobs.co/services/interview-coaching"
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
                <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>Interview Coaching</span>
              </nav>
            </Reveal>
            <Reveal direction="down" duration={0.6} delay={0.06}>
              <span className="fj-announcement"><span>Services</span> Interview Support Australia</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.12}>
              <StaggerItem as="div">
                <h1>Secure Your Next Job Offer in <span className="heading-mark">Australia</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>Mock interviews, behavioral preparation, and negotiation coaching tailored to the expectations of local Australian hiring managers.</p>
              </StaggerItem>
              <StaggerItem as="div">
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">View plans</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book prep session</CalendlyLink>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container fj-split">
            <Reveal direction="left" distance={30}>
              <div className="fj-copy-block">
                <span className="fj-label">Secure the Job Offer</span>
                <h2>Why local interview preparation is critical for success in <span className="heading-mark">Australia</span></h2>
                <p>
                  Landing the interview is only the first step. To secure a job offer, you must convince the hiring manager that you have the skills, cultural fit, and local market understanding to contribute immediately. In Australia, hiring practices rely heavily on behavioral interviews—asking situational questions to evaluate how you react under pressure.
                </p>
                <p>
                  Many candidates fail interviews not because they lack technical skills, but because they explain past work history in a disorganized, rambling manner. Recruiters look for structured, metrics-focused answers. 9Jobs prepares you to structure your experience, understand local corporate communication standards, and negotiate your contract parameters successfully.
                </p>
              </div>
            </Reveal>
            <Reveal direction="right" distance={30} style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <FloatingCard depth={24} floatRange={12} duration={7.2}>
                  <div className="fj-ai-card">
                    <div className="fj-ai-search">
                      <UserCheck size={22} />
                      <span>Interview Prep Evaluation</span>
                    </div>
                    <div className="fj-ai-note">
                      <span>Behavioral Answer Structure</span>
                      <strong>STAR Method Check</strong>
                      <p>Pass. Answers structured logically around Situation, Task, Action, and measurable Results.</p>
                    </div>
                    <div className="fj-ai-note">
                      <span>Salary benchmark alignment</span>
                      <strong>Local market check (Melbourne/Sydney)</strong>
                      <p>Excellent. Value arguments mapped to Hays Salary Guide averages.</p>
                    </div>
                  </div>
                </FloatingCard>
                <div className="fj-hero-floating-cluster" style={{ pointerEvents: 'none' }}>
                  <FloatingCard className="fj-hero-floating-card" depth={14} floatRange={8} duration={6} style={{ position: 'absolute', top: '-20px', left: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Mock Interview Score</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>STAR framework aligned</span>
                  </FloatingCard>
                  <FloatingCard className="fj-hero-floating-card" depth={18} floatRange={10} duration={7} delay={0.4} style={{ position: 'absolute', bottom: '-20px', right: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Mock Q: Tell me about...</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>Australian culture optimized</span>
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
                <h2>Comprehensive interview preparation and support <span className="heading-mark">features</span></h2>
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
                <h2>Our step-by-step approach to securing local job <span className="heading-mark">offers</span></h2>
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
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>Interview Milestones</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Tracking candidate preparation metrics</p>
                  </div>
                  {[
                    ["Phone Screen prep", "Visa status & salary parameters verified"],
                    ["Behavioral scenarios mapped", "STAR examples written for key competencies"],
                    ["Mock sessions completed", "Mock interview completed with scoring feedback"],
                    ["Negotiation framework set", "Benchmark targets mapped for contract offer"]
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
                <h2>Crucial communication strategies for Australian interviews <span className="heading-mark">unveiled</span></h2>
              </div>
            </Reveal>
            <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.8", color: "var(--muted)" }}>
              <p>
                Interviewing in Australia has its own unique set of cultural nuances. Local employers value structured, direct, yet modest communication styles. This balance of professional authority and collaborative modesty is critical: candidates must prove capability without appearing overly aggressive or arrogant, a communication style often described as &quot;team-oriented confidence.&quot;
              </p>
              <p>
                Behavioral questions represent the core of local interviews. When a hiring manager asks, &quot;Tell me about a time you managed a difficult stakeholder,&quot; they are not interested in generic theories. They expect to hear a specific narrative: the scenario, the action you personally took, and the outcome achieved. Using the STAR framework is the best way to prevent rambling.
              </p>
              <p>
                Additionally, many candidates struggle with salary negotiation. Discussing money can feel uncomfortable. We teach candidates how to research target benchmarks, communicate expectations in a professional manner, and negotiate parameters like remote/hybrid flexibility or superannuation (which is the Australian retirement pension system and represents a critical component of local compensation packages).
              </p>
              <p>
                Finally, post-interview follow-ups are highly valued. Sending a brief, personalized thank-you note highlighting a key discussion point within 24 hours of the interview shows professionalism and keeps you top-of-mind as final selection choices are made.
              </p>
            </div>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-leader-card">
                <div>
                  <h2>Align your entire profile for career success <span className="heading-mark">today</span></h2>
                  <p>Pair your interview readiness with an optimized <Link href="/services/resume-writing">Professional Resume</Link>, <Link href="/services/linkedin-optimization">LinkedIn Profile</Link>, and active <Link href="/services/job-application-automation">Job Applications</Link>.</p>
                </div>
                <div className="fj-leader-media">
                  <Sparkles size={120} color="var(--lime)" style={{ margin: "auto" }} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <ServiceRelatedGuides topic="interviews" />

        <section className="fj-section fj-section--muted" id="faqs">
          <div className="fj-container fj-faq-grid">
            <Reveal direction="left" distance={30}>
              <div className="fj-faq-intro">
                <span className="fj-label">FAQs</span>
                <h2>Questions about job interview support in <span className="heading-mark">Australia</span></h2>
                <p>Answers to help you prepare and build confidence.</p>
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
                <span>Secure the Offer</span>
                <h2>Ready to secure your next job offer in Australia?</h2>
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book an interview audit</CalendlyLink>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

