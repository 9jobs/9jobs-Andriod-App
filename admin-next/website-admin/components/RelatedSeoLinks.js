import Link from "next/link";
import { ArrowRight } from "lucide-react";

const serviceGuides = {
  resume: [
    ["/blog/ats-resume-format-australia", "ATS Resume Format Australia", "Build a resume layout that recruiter systems can parse cleanly."],
    ["/blog/best-resume-format-australia-2026", "Best Resume Format Australia 2026", "Choose the right structure, page length, and section order for Australian roles."],
    ["/blog/why-your-resume-gets-rejected-in-australia", "Why Resumes Get Rejected", "Avoid the formatting and content issues that block interview callbacks."],
  ],
  linkedin: [
    ["/blog/linkedin-optimization-australia-guide", "LinkedIn Optimization Guide", "Improve your headline, summary, skills, and recruiter search visibility."],
    ["/blog/how-recruiters-find-candidates-on-linkedin", "How Recruiters Search LinkedIn", "Understand the search mechanics behind LinkedIn Recruiter."],
    ["/blog/top-linkedin-mistakes-job-seekers-make", "Top LinkedIn Mistakes", "Fix profile gaps that keep job seekers invisible to recruiters."],
  ],
  seek: [
    ["/blog/seek-profile-optimization-tips", "SEEK Profile Optimization Tips", "Improve profile visibility, search terms, and recruiter discovery."],
    ["/blog/seek-profile-optimization-checklist", "SEEK Profile Checklist", "Check the settings and content that make SEEK profiles easier to find."],
    ["/blog/how-to-get-a-job-in-australia", "How to Get a Job in Australia", "Connect SEEK, LinkedIn, resumes, applications, and interview preparation."],
  ],
  applications: [
    ["/blog/how-to-get-a-job-in-australia", "How to Get a Job in Australia", "Follow a complete application workflow for the Australian market."],
    ["/blog/why-you-are-not-getting-job-interviews", "Why You Are Not Getting Interviews", "Diagnose weak targeting, resume, and application issues."],
    ["/blog/jobs-in-australia-for-new-migrants", "Jobs in Australia for New Migrants", "Localize your search if you are new to the Australian market."],
  ],
  interviews: [
    ["/blog/why-you-are-not-getting-job-interviews", "Why You Are Not Getting Interviews", "Find the gaps between application quality and interview callbacks."],
    ["/blog/how-to-get-more-interviews-in-melbourne", "More Interviews in Melbourne", "Tune your applications and profiles for Melbourne recruiter searches."],
    ["/blog/how-to-get-more-interviews-in-sydney", "More Interviews in Sydney", "Improve callback rates in Sydney's corporate hiring market."],
  ],
};

const blogSupportLinks = [
  ["/services/resume-writing", "Resume Writing", "ATS-friendly resumes written for Australian hiring systems."],
  ["/services/linkedin-optimization", "LinkedIn Optimization", "Profile copy and keywords for recruiter discovery."],
  ["/services/interview-coaching", "Interview Coaching", "STAR practice and mock interview preparation."],
  ["/jobs/melbourne", "Jobs in Melbourne", "Local hiring context and application support for Melbourne."],
  ["/jobs/sydney", "Jobs in Sydney", "Local recruiter and job search guidance for Sydney."],
];

export function ServiceRelatedGuides({ topic }) {
  const guides = serviceGuides[topic] || serviceGuides.applications;

  return (
    <section className="fj-section fj-section--muted">
      <div className="fj-container">
        <div className="fj-section-head">
          <span className="fj-label">Related guides</span>
          <h2>Keep improving your Australian job search</h2>
          <p>Use these practical guides alongside the service to strengthen your resume, profiles, applications, and interview readiness.</p>
        </div>
        <div className="fj-card-grid fj-card-grid--three">
          {guides.map(([href, title, text]) => (
            <article className="fj-feature-card" key={href}>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link href={href} className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                Read guide <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlogSupportLinks() {
  return (
    <section className="fj-section fj-section--muted">
      <div className="fj-container">
        <div className="fj-section-head">
          <span className="fj-label">Next steps</span>
          <h2>Explore services and city guides</h2>
          <p>Move from reading into a practical resume, profile, application, and location strategy.</p>
        </div>
        <div className="fj-card-grid fj-card-grid--three">
          {blogSupportLinks.map(([href, title, text]) => (
            <article className="fj-feature-card" key={href}>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link href={href} className="fj-button fj-button--ghost" style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>
                Explore <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
