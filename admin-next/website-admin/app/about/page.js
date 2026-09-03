import Image from "next/image";
import { CalendlyLink } from "../../components/CalendlyWidget";
import { JsonLd, createBreadcrumbSchema, createSeoMetadata, getRouteSeo } from "../../data/seo";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Factory,
  FileCheck2,
  HeartHandshake,
  SearchCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { Reveal, StaggerContainer, StaggerItem, HoverCard, PageTransition } from "../../components/homepage/HomeMotion";

const process = [
  ["Discover", "We understand your target roles, experience, location, salary goals, and hiring timeline.", SearchCheck],
  ["Prepare", "Your resume, LinkedIn profile, and portfolio signals are tightened for recruiter review.", FileCheck2],
  ["Match", "Relevant IT and non-IT opportunities are filtered by skill fit, seniority, and career direction.", Target],
  ["Apply & follow up", "Applications, messages, interview notes, and follow-ups stay organized in one clear pipeline.", ClipboardCheck],
];

const roleGroups = [
  ["IT roles", "Support for candidates across modern technology teams.", Cpu, ["Software developer", "Data analyst", "Cloud engineer", "QA tester"]],
  ["Non-IT roles", "Practical guidance for operational, business, and frontline career paths.", Factory, ["Sales executive", "HR coordinator", "Finance associate", "Operations manager"]],
];

const supportAreas = [
  ["Australia-ready profile", "Resume, LinkedIn, and application content shaped for Australian hiring expectations.", BriefcaseBusiness],
  ["Targeted job applying", "We focus applications around your skills, location, experience level, and role fit.", Target],
  ["Follow-up support", "Messages, interview notes, and next steps stay organized so no opportunity gets lost.", ClipboardCheck],
];

const routeSeo = getRouteSeo("/about");

export const metadata = createSeoMetadata(routeSeo);

export default function About() {
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);

  return (
    <PageTransition>
      <main className="site-main fj-page" data-fj-motion-root="true">
        <JsonLd schema={breadcrumbSchema} />
        <section className="fj-page-hero">
          <div className="fj-container">
            <Reveal direction="down" duration={0.6}>
              <span className="fj-announcement"><span>About</span> Built for candidates and hiring teams</span>
            </Reveal>
            <StaggerContainer as="div" className="fj-home-copy-stack" stagger={0.12} delayChildren={0.08}>
              <StaggerItem as="div">
                <h1>9Jobs helps IT and non-IT talent find the right <span className="heading-mark">opportunities.</span></h1>
              </StaggerItem>
              <StaggerItem as="div">
                <p>We combine practical career support, professional content, and organized application workflows so candidates can move from search to interview with more clarity.</p>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container fj-split">
            <Reveal direction="left" distance={30}>
              <div className="fj-copy-block">
                <span className="fj-label">Our story</span>
                <h2>Connecting skilled people with companies that need <span className="heading-mark">them.</span></h2>
                <p>9Jobs was created for candidates who know they can contribute, but need a sharper way to present skills, choose the right roles, and stay consistent through applications.</p>
                <p>9jobs, also known as 9 Jobs, helps professionals across Australia improve resumes, optimize LinkedIn profiles and secure interviews.</p>
              </div>
            </Reveal>
            <Reveal direction="right" distance={30}>
              <div className="fj-image-card">
                <Image src="/framer/story-ops.jpg" alt="9Jobs team reviewing candidate opportunities" width={1200} height={800} sizes="(max-width: 768px) 100vw, 600px" />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="fj-section">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-quote-panel">
                <HeartHandshake size={30} />
                <h2>We remove the invisible barriers between talent and <span className="heading-mark">opportunity.</span></h2>
                <p>Our work is simple: help candidates show up clearly, apply with purpose, and stay ready when the right conversation begins.</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="fj-section fj-section--muted">
          <div className="fj-container">
            <Reveal direction="up" distance={20}>
              <div className="fj-section-head">
                <span className="fj-label">Our process</span>
                <h2>A clear path from profile to <span className="heading-mark">placement.</span></h2>
              </div>
            </Reveal>
            <StaggerContainer as="div" className="fj-card-grid fj-card-grid--four" stagger={0.1}>
              {process.map(([title, text, Icon]) => (
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
          <div className="fj-container fj-split">
            <Reveal direction="left" distance={30}>
              <div className="fj-copy-block">
                <span className="fj-label">Role coverage</span>
                <h2>Built for technical and non-technical career <span className="heading-mark">paths.</span></h2>
                <p>For IT professionals, we focus on technical clarity. For non-IT professionals, we translate experience into outcomes hiring teams can quickly understand.</p>
              </div>
            </Reveal>
            <StaggerContainer as="div" className="fj-card-grid fj-card-grid--two" stagger={0.12}>
              {roleGroups.map(([title, text, Icon, roles]) => (
                <StaggerItem as="div" key={title}>
                  <HoverCard className="fj-plan-card" style={{ height: "100%" }}>
                    <div className="fj-icon-chip"><Icon size={22} /></div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <div className="fj-chip-list">
                      {roles.map((role) => (
                        <span key={role}><CheckCircle2 size={15} /> {role}</span>
                      ))}
                    </div>
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section fj-section--muted">
          <div className="fj-container">
            <Reveal direction="up" distance={20}>
              <div className="fj-section-head">
                <span className="fj-label">Australia job support</span>
                <h2>Professional support built around real <span className="heading-mark">outcomes.</span></h2>
              </div>
            </Reveal>
            <StaggerContainer as="div" className="fj-card-grid fj-card-grid--three" stagger={0.1}>
              {supportAreas.map(([title, text, Icon]) => (
                <StaggerItem as="div" key={title}>
                  <HoverCard className="fj-team-card fj-support-card" style={{ height: "100%" }}>
                    <div className="fj-icon-chip"><Icon size={22} /></div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container">
            <Reveal direction="up" distance={24}>
              <div className="fj-final-cta">
                <Sparkles size={28} />
                <h2>Shape the future of job applying with <span className="heading-mark">9Jobs.</span></h2>
                <CalendlyLink className="fj-button fj-button--dark">
                  Get started <ArrowRight size={17} />
                </CalendlyLink>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
