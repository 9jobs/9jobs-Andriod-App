import Link from "next/link";
import { ArrowRight, Briefcase, FileText, MessageCircle, SearchCheck, UserCheck } from "lucide-react";
import { CalendlyLink } from "../../components/CalendlyWidget";
import { JsonLd, createBreadcrumbSchema, createSeoMetadata, getRouteSeo } from "../../data/seo";
import { Reveal, StaggerContainer, StaggerItem, HoverCard, PageTransition } from "../../components/homepage/HomeMotion";

const routeSeo = getRouteSeo("/services");

export const metadata = createSeoMetadata(routeSeo);

const services = [
  {
    title: "Resume Writing",
    href: "/services/resume-writing",
    description: "ATS-friendly resume writing tailored to Australian hiring systems and recruiter expectations.",
    icon: FileText,
  },
  {
    title: "LinkedIn Optimization",
    href: "/services/linkedin-optimization",
    description: "Profile copy, keywords, and settings that help Australian recruiters find and trust your profile.",
    icon: SearchCheck,
  },
  {
    title: "SEEK Profile Optimization",
    href: "/services/seek-profile-optimization",
    description: "SEEK summary, visibility, and profile settings configured for local candidate searches.",
    icon: UserCheck,
  },
  {
    title: "Job Application Support",
    href: "/services/job-application-automation",
    description: "Done-for-you job sourcing and application support to keep your pipeline moving consistently.",
    icon: Briefcase,
  },
  {
    title: "Interview Coaching",
    href: "/services/interview-coaching",
    description: "Mock interview preparation, STAR response coaching, and offer-stage confidence building.",
    icon: MessageCircle,
  },
];

const resourceLinks = [
  {
    href: "/blog/how-to-get-a-job-in-australia",
    title: "How to Get a Job in Australia",
    text: "A complete search roadmap covering resumes, profiles, applications, and interviews.",
  },
  {
    href: "/blog/ats-resume-format-australia",
    title: "ATS Resume Format Australia",
    text: "Formatting guidance for resumes that need to parse cleanly in recruiter systems.",
  },
  {
    href: "/blog/linkedin-optimization-australia-guide",
    title: "LinkedIn Optimization Guide",
    text: "Practical profile changes that improve recruiter discovery in Australia.",
  },
];

export default function ServicesPage() {
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
  ]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "9Jobs Career Services",
    "itemListElement": services.map((service, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `https://9jobs.co${service.href}`,
      "name": service.title
    }))
  };

  return (
    <PageTransition>
      <main className="site-main fj-page" data-fj-motion-root="true">
        <JsonLd schema={breadcrumbSchema} />
        <JsonLd schema={itemListSchema} />

        <section className="fj-page-hero">
          <div className="fj-container">
            <Reveal direction="down" duration={0.6}>
              <nav className="fj-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.88rem", color: "var(--fj-muted)", fontWeight: 600 }}>
                <Link href="/" style={{ color: "inherit" }} prefetch={false}>Home</Link>
                <span>&gt;</span>
                <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>Services</span>
              </nav>
            </Reveal>
            <Reveal direction="down" duration={0.6} delay={0.06}>
              <span className="fj-announcement"><span>Services</span> Career support for Australia</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.12}>
              <StaggerItem as="div">
                <h1>Career Services for Australian Job Seekers</h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>Choose focused support for your resume, LinkedIn profile, SEEK profile, applications, and interview preparation.</p>
              </StaggerItem>
              <StaggerItem as="div">
                <div className="fj-actions">
                  <Link className="fj-button fj-button--ghost" href="/pricing" prefetch={false}>View plans</Link>
                  <CalendlyLink className="fj-button fj-button--dark">Book a call</CalendlyLink>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container">
            <Reveal direction="up" distance={20}>
              <div className="fj-section-head">
                <span className="fj-label">What we help with</span>
                <h2>Practical support across the full job search</h2>
                <p>Each service links to a dedicated page with detailed process, FAQs, and Australian market context.</p>
              </div>
            </Reveal>
            <StaggerContainer as="div" className="fj-card-grid fj-card-grid--three" stagger={0.1}>
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <StaggerItem as="div" key={service.href}>
                    <HoverCard className="fj-feature-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      <div className="fj-icon-chip"><Icon size={22} /></div>
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                      <Link href={service.href} className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }} prefetch={false}>
                        Explore {service.title} <ArrowRight size={14} />
                      </Link>
                    </HoverCard>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section fj-section--muted">
          <div className="fj-container">
            <Reveal direction="up" distance={20}>
              <div className="fj-section-head">
                <span className="fj-label">Recommended guides</span>
                <h2>Learn how each service improves <span className="heading-mark">crawl-to-callback signals</span></h2>
                <p>These guides explain the resume, profile, and application improvements behind the 9Jobs services.</p>
              </div>
            </Reveal>
            <StaggerContainer as="div" className="fj-card-grid fj-card-grid--three" stagger={0.1}>
              {resourceLinks.map((resource) => (
                <StaggerItem as="div" key={resource.href}>
                  <HoverCard className="fj-feature-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <h3>{resource.title}</h3>
                    <p>{resource.text}</p>
                    <Link href={resource.href} className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }} prefetch={false}>
                      Read guide <ArrowRight size={14} />
                    </Link>
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
