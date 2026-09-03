import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CalendlyLink } from "./CalendlyWidget";

export default function Hero() {
  return (
    <section className="hero">
      <div className="container-wide">
        <span className="eyebrow">
          <span className="eyebrow-mark">New</span>
          Job applying automation tool <ArrowRight size={14} />
        </span>
        <h1 className="display-title" style={{ marginTop: 26 }}>
          Say hello to
          <br />
          smarter applying
        </h1>
        <p className="lead">
          A job applying platform for resumes, LinkedIn profiles, applications,
          and interview progress.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-light" href="/pricing">
            2 days trial
          </Link>
          <CalendlyLink className="btn btn-dark">
            Schedule a demo
          </CalendlyLink>
        </div>
        <div className="dashboard-shell">
          <Image
            className="dashboard-image"
            src="/dashboard.png"
            alt="9Jobs dashboard preview"
            width={1200}
            height={760}
            priority
          />
        </div>
      </div>
    </section>
  );
}
