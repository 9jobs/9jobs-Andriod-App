import Image from "next/image";
import { CalendlyLink } from "../../components/CalendlyWidget";
import {
  ArrowRight,
  Bot,
  BookUser,
  BriefcaseBusiness,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  MailCheck,
  SearchCheck,
  Settings2,
} from "lucide-react";

const platformFeatures = [
  ["Resume review and editing", "Improve structure, clarity, keywords, formatting, and ATS readiness.", FileCheck2],
  ["LinkedIn optimization", "Turn your profile into a stronger signal for recruiters and hiring managers.", BookUser],
  ["Application targeting", "Focus on roles that match your profile, location, level, and goals.", SearchCheck],
  ["Follow-up workflows", "Keep follow-ups, recruiter notes, and application status in one clean view.", MailCheck],
  ["Automation assist", "Use smart support for repetitive job search tasks while you approve key decisions.", Bot],
  ["Progress reporting", "See what moved forward, what needs review, and what is ready next.", Gauge],
];

const workflow = [
  ["Resume", "ATS format reviewed", "Complete"],
  ["LinkedIn", "Headline and summary tuned", "Ready"],
  ["Applications", "Priority roles selected", "Live"],
  ["Follow-up", "Recruiter messages queued", "Next"],
];

export const metadata = {
  title: "Features | 9 Jobs (9jobs)",
  description: "Explore 9 Jobs (9jobs) features for resumes, LinkedIn, applications, automation, and job search tracking.",
  alternates: {
    canonical: "/features",
  },
};

export default function FeaturePage() {
  return (
    <main className="site-main fj-page">
      <section className="fj-page-hero">
        <div className="fj-container">
          <span className="fj-announcement"><span>Feature</span> All the moving parts in one place</span>
          <h1>A cleaner operating system for job <span className="heading-mark">applying.</span></h1>
          <p>9Jobs brings documents, profile work, job targeting, follow-ups, and reporting into a simple workflow that stays easy to scan.</p>
        </div>
      </section>

      <section className="fj-section fj-section--tight">
        <div className="fj-container fj-split">
          <div className="fj-activity-card">
            <div className="fj-card-media">
              <Image src="/framer/dashboard.png" alt="9Jobs dashboard preview" width={1184} height={620} />
            </div>
            {workflow.map(([title, text, status]) => (
              <div className="fj-activity-row" key={title}>
                <span className="fj-icon-chip"><ClipboardCheck size={18} /></span>
                <p><strong>{title}</strong><br />{text}</p>
                <em>{status}</em>
              </div>
            ))}
          </div>

          <div className="fj-copy-block">
            <span className="fj-label">Built for repeated action</span>
            <h2>Less scattered work. More forward <span className="heading-mark">motion.</span></h2>
            <p>The reference experience is intentionally calm: big readable sections, focused cards, and enough visual context to understand what is happening without digging.</p>
            <div className="fj-list-grid">
              {[
                [BriefcaseBusiness, "Role-focused support"],
                [Settings2, "Custom workflows"],
                [ArrowRight, "Clear next steps"],
                [ClipboardCheck, "Approval checkpoints"],
              ].map(([Icon, title]) => (
                <div className="fj-mini-item" key={title}>
                  <Icon size={22} />
                  <h3>{title}</h3>
                  <p>Everything is designed to keep the application process easy to read.</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--muted">
        <div className="fj-container">
          <div className="fj-section-head">
            <h2>The tools candidates naturally <span className="heading-mark">expect.</span></h2>
          </div>
          <div className="fj-card-grid fj-card-grid--three">
            {platformFeatures.map(([title, text, Icon]) => (
              <article className="fj-feature-card" key={title}>
                <div className="fj-icon-chip"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--tight">
        <div className="fj-container fj-final-cta">
          <h2>Get a clean 9Jobs <span className="heading-mark">walkthrough.</span></h2>
          <CalendlyLink className="fj-button fj-button--dark">
            Schedule a demo <ArrowRight size={17} />
          </CalendlyLink>
        </div>
      </section>
    </main>
  );
}
