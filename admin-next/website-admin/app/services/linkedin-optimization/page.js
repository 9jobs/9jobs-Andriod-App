import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, CheckCircle2, ChevronDown, Search, UserCheck, ShieldCheck, Sparkles, Target, Star } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";
import { Reveal, StaggerContainer, StaggerItem, HoverCard, PageTransition, FloatingCard } from "../../../components/homepage/HomeMotion";

const HomeFaq = dynamic(() => import("../../../components/homepage/HomeFaq"));
const ServiceRelatedGuides = dynamic(() => import("../../../components/RelatedSeoLinks").then((mod) => mod.ServiceRelatedGuides));

const routeSeo = getRouteSeo("/services/linkedin-optimization");

export const metadata = createSeoMetadata(routeSeo);

const services = [
  ["Headline Optimization", "Write a search-optimized headline targeting specific roles and industries using high-demand keywords.", Search],
  ["Professional Summary", "A compelling, storytelling summary that highlights your career achievements, expertise, and target direction.", Target],
  ["Skills & Endorsements", "Strategic alignment of your top skills to match the exact keywords recruiters use when searching.", UserCheck],
  ["Recruiter Flagging", "We optimize settings like 'Open to Work' and target locations to ensure visibility to Australian sourcing teams.", ShieldCheck],
];

const checklist = [
  ["Search Algorithm Alignment", "We format your profile segments specifically to boost your ranking in LinkedIn Recruiter search queries."],
  ["Professional Summary Rewrite", "Our writers craft an engaging, localized summary that details visa status, experience level, and goals."],
  ["Experience & Achievements", "We rewrite previous roles to emphasize tangible results and metrics aligned with local standards."],
  ["Visual Profile Review", "Advice on professional headshots, background banners, and recommendations that build visual trust."],
];

const faqs = [
  [
    "Why is LinkedIn optimization important for finding jobs in Australia?",
    "Over 90% of recruiters in Australia use LinkedIn Recruiter to actively search for and source candidates before posting job ads. If your profile is not optimized with the right keywords, locations, and settings, you will not show up in their search lists. An optimized profile ensures you receive inbound inquiries from hiring managers rather than relying solely on manual applications."
  ],
  [
    "How does the LinkedIn optimization service work?",
    "We start by reviewing your current profile and target job descriptions in Australia. Our copywriters then draft an optimization document containing a custom headline, a revised 'About' section, optimized job descriptions for your experience section, and a checklist of recommended settings. You can copy-paste this content directly into your profile or have our team guide you through it."
  ],
  [
    "What settings should I change for an Australian job search?",
    "Key settings include updating your target location to your desired Australian city, setting your status to 'Open to Work' (which can be configured to be visible only to recruiters), and aligning your industry classification with local expectations. We review all these settings to make sure your profile is visible to local sourcing teams."
  ],
  [
    "Will this service help if I am currently outside Australia?",
    "Yes. If you have visa rights or are planning a relocation, we advise you on how to format your location, summary, and headline to indicate your availability to Australian employers. This helps prevent your profile from being filtered out because of international location settings."
  ],
  [
    "Do you write custom LinkedIn content from scratch?",
    "Yes. All summaries, headlines, and descriptions are custom-written from scratch based on your specific career history, skills, and the target market requirements in Australia."
  ]
];

export default function LinkedinOptimizationPage() {
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
    "serviceType": "LinkedIn Profile Optimization Services",
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
    "description": "Professional LinkedIn profile optimization and writing services tailored for the Australian job market.",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "AUD",
      "lowPrice": "99",
      "highPrice": "299",
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
        "name": "LinkedIn Optimization",
        "item": "https://9jobs.co/services/linkedin-optimization"
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
                <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>LinkedIn Optimization</span>
              </nav>
            </Reveal>
            <Reveal direction="down" duration={0.6} delay={0.06}>
              <span className="fj-announcement"><span>Services</span> LinkedIn Optimization Australia</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.12}>
              <StaggerItem as="div">
                <h1>Get More Sourcing Calls with an Optimized <span className="heading-mark">LinkedIn</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>We optimize your LinkedIn profile to rank higher in recruiter searches, capture local hiring team interest, and build a strong professional brand in Australia.</p>
              </StaggerItem>
              <StaggerItem as="div">
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">View plans</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book a profile audit</CalendlyLink>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container fj-split">
            <Reveal direction="left" distance={30}>
              <div className="fj-copy-block">
                <span className="fj-label">Optimize for Recruiter Search</span>
                <h2>How Australian recruiters use LinkedIn to find skilled <span className="heading-mark">talent</span></h2>
                <p>
                  In the modern Australian job market, applying for jobs manually is only half the battle. A large percentage of professional, corporate, and technology roles are never advertised publicly. Instead, recruitment agencies and internal talent acquisition teams use a tool called LinkedIn Recruiter to find matching profiles based on strict filters: location, job titles, key skills, and industry terms.
                </p>
                <p>
                  If your profile lacks relevant keywords or specifies an overseas location without indicating relocation availability, you remain invisible in these search results. 9Jobs understands the algorithms behind LinkedIn's search system. We optimize your profile's headlines, summary, and experience sections so you rank high in searches and receive inbound interview inquiries.
                </p>
              </div>
            </Reveal>
            <Reveal direction="right" distance={30} style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <FloatingCard depth={24} floatRange={12} duration={7.2}>
                  <div className="fj-ai-card">
                    <div className="fj-ai-search">
                      <Sparkles size={22} color="#0077b5" />
                      <span>LinkedIn Recruiter Filter Audit</span>
                    </div>
                    <div className="fj-ai-note">
                      <span>Location filter match</span>
                      <strong>Sydney/Melbourne/Brisbane/etc.</strong>
                      <p>Match. Relocation notes integrated to bypass location blocks.</p>
                    </div>
                    <div className="fj-ai-note">
                      <span>Headline & Summary keywords</span>
                      <strong>Recruiter query alignment score</strong>
                      <p>Pass. Optimized terms increased keyword search visibility by 140%.</p>
                    </div>
                  </div>
                </FloatingCard>
                <div className="fj-hero-floating-cluster" style={{ pointerEvents: 'none' }}>
                  <FloatingCard className="fj-hero-floating-card" depth={14} floatRange={8} duration={6} style={{ position: 'absolute', top: '-20px', left: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Profile views increased</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>140% weekly search</span>
                  </FloatingCard>
                  <FloatingCard className="fj-hero-floating-card" depth={18} floatRange={10} duration={7} delay={0.4} style={{ position: 'absolute', bottom: '-20px', right: '-20px', background: '#fff', padding: '12px 18px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(212, 160, 23, 0.08)', border: '1px solid rgba(212, 160, 23, 0.26)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--fj-ink)' }}>Recruiter found you</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fj-muted)' }}>Location match audit pass</span>
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
                <span className="fj-label">Our Service Deliverables</span>
                <h2>Every section optimized for recruiter <span className="heading-mark">discovery</span></h2>
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
                <span className="fj-label">Our Strategy</span>
                <h2>Our structured approach to boosting profile <span className="heading-mark">views</span></h2>
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
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>LinkedIn Profile Metrics</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Key milestones to monitor</p>
                  </div>
                  {[
                    ["Search appearances", "Recruiters finding you weekly"],
                    ["Profile views", "Visits from hiring teams"],
                    ["InMail conversion", "Inbound messages for open roles"]
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
                <h2>Best practices for Australian LinkedIn profiles <span className="heading-mark">explained</span></h2>
              </div>
            </Reveal>
            <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.8", color: "var(--muted)" }}>
              <p>
                A successful LinkedIn profile in Australia does not simply copy the bullet points of a resume. It serves as a narrative of your career history. While a resume is a formal document targeted at a specific application, your LinkedIn profile is a public landing page designed to attract interest, build credibility, and encourage recruiters to start a conversation.
              </p>
              <p>
                The most critical real estate on your profile is the headline. Most people write their current job title (e.g. &quot;Software Engineer at XYZ Corp&quot;). However, recruiters do not search for company names; they search for roles and capabilities. A headline like &quot;Software Engineer | Full Stack Developer | React, Node.js, AWS | Building Scalable SaaS Applications&quot; is much more effective because it lists multiple target keywords that match search queries.
              </p>
              <p>
                The 'About' section is where you tell your story. It should begin with a strong hook summarizing your experience, key industry expertise, and what you specialize in. Crucially, it must also include a clear statement about your location preference and visa status in Australia. If a recruiter matches your profile but is unsure if you are located in Australia or have legal working rights, they may skip your profile to save time. State your status clearly to build instant trust.
              </p>
              <p>
                Finally, you must actively align your skills list. LinkedIn allow you to list up to 50 skills, and recruiters filter profiles based on these exact tags. We review local job listings to identify the most common skills requested in your field, and make sure those terms appear prominently in your skills section and throughout your job descriptions.
              </p>
            </div>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-leader-card">
                <div>
                  <h2>Integrate your online and offline <span className="heading-mark">brand</span></h2>
                  <p>Make sure your LinkedIn works in tandem with an optimized <Link href="/services/resume-writing">Resume Format</Link> and a fully tuned <Link href="/services/seek-profile-optimization">SEEK Profile</Link> to maximize conversion.</p>
                </div>
                <div className="fj-leader-media">
                  <Sparkles size={120} color="var(--lime)" style={{ margin: "auto" }} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <ServiceRelatedGuides topic="linkedin" />

        <section className="fj-section fj-section--muted" id="faqs">
          <div className="fj-container fj-faq-grid">
            <Reveal direction="left" distance={30}>
              <div className="fj-faq-intro">
                <span className="fj-label">FAQs</span>
                <h2>Questions about LinkedIn optimization in <span className="heading-mark">Australia</span></h2>
                <p>Answers to help you get discovered by local recruiters.</p>
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
                <h2>Ready to rank higher in recruiter searches?</h2>
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book a profile review</CalendlyLink>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

