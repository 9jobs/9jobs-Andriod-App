import Link from "next/link";
import NewsletterForm from "./NewsletterForm";

const footerGroups = [
  {
    title: "Services",
    href: "/services",
    links: [
      { href: "/services/resume-writing", label: "Resume Writing Services" },
      { href: "/services/linkedin-optimization", label: "LinkedIn Profile Optimization" },
      { href: "/services/seek-profile-optimization", label: "SEEK Profile Optimization" },
      { href: "/services/job-application-automation", label: "Job Sourcing & Applications" },
      { href: "/services/interview-coaching", label: "Interview Coaching Services" },
    ],
  },
  {
    title: "Popular Locations",
    href: "/jobs",
    links: [
      { href: "/jobs/melbourne", label: "Jobs in Melbourne" },
      { href: "/jobs/sydney", label: "Jobs in Sydney" },
      { href: "/jobs/brisbane", label: "Jobs in Brisbane" },
      { href: "/jobs/perth", label: "Jobs in Perth" },
      { href: "/jobs/adelaide", label: "Jobs in Adelaide" },
    ],
  },
  {
    title: "Explore 9Jobs",
    href: "/jobs",
    links: [
      { href: "/9-jobs", label: "9 Jobs" },
      { href: "/jobs", label: "9jobs Australia" },
      { href: "/services/resume-writing", label: "9 Jobs Resume Service" },
      { href: "/about", label: "9 Jobs Career Support" },
      { href: "/services/linkedin-optimization", label: "LinkedIn Optimization" },
      { href: "/services/interview-coaching", label: "Interview Coaching" },
      { href: "/blog/how-to-get-a-job-in-australia", label: "How to Get a Job in Australia" },
    ],
  },
  {
    title: "Regional & Niche",
    href: "/jobs",
    links: [
      { href: "/jobs/geelong", label: "Jobs in Geelong" },
      { href: "/jobs/vic", label: "Jobs in Victoria" },
      { href: "/jobs/melbourne/traffic-controller", label: "Traffic Controller Jobs" },
      { href: "/jobs/melbourne/warehouse", label: "Warehouse Jobs Melbourne" },
    ],
  },
  {
    title: "Resources",
    href: "/blog",
    links: [
      { href: "/blog", label: "Blog & Sourcing Guides" },
      { href: "/success-stories", label: "Client Success Stories" },
      { href: "/features", label: "Solutions & Features" },
      { href: "/pricing", label: "Pricing & Plans" },
    ],
  },
  {
    title: "Company",
    href: "/about",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact Us" },
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/client-service-feedback", label: "Client Feedback" },
    ],
  },
];

const footerRows = Math.max(...footerGroups.map((group) => group.links.length));

export default function Footer() {
  return (
    <footer className="site-footer fj-footer">
      <div className="fj-container">
        <div className="fj-footer-grid">
          <div className="fj-footer-brand">
            <Link className="brand fj-brand" href="/" aria-label="9Jobs home page" prefetch={false}>
              <span className="fj-brand-mark" role="presentation">
                <span />
                <span />
              </span>
              <span>9Jobs</span>
            </Link>
            <p>Join the 40,000 professionals in Australia using 9Jobs today.</p>
            <NewsletterForm />
            <div className="fj-footer-socials">
              <a href="https://www.instagram.com/9jobsau/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/9jobs.co" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/9jobs/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect width="4" height="12" x="2" y="9"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
            </div>
          </div>

          {footerGroups.map((group) => (
            <div className="fj-footer-column" key={group.title}>
              {group.href ? (
                <h3>
                  <Link href={group.href} style={{ color: "inherit", textDecoration: "none" }} prefetch={false}>
                    {group.title}
                  </Link>
                </h3>
              ) : (
                <h3>{group.title}</h3>
              )}
              <div className="fj-footer-links">
                {group.links.map((link) => (
                  <Link href={link.href} key={`${group.title}-${link.label}`} prefetch={false}>
                    {link.label}
                  </Link>
                ))}
                {Array.from({ length: footerRows - group.links.length }).map((_, index) => (
                  <span className="fj-footer-link-placeholder" aria-hidden="true" key={`${group.title}-placeholder-${index}`}>
                    &nbsp;
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="footer-bottom fj-footer-bottom" style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid var(--line)", paddingTop: "20px", marginTop: "40px", fontSize: "0.8rem", color: "var(--muted)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
            <span>&copy; 2026 9Jobs. All rights reserved. Registered Australian Business.</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.75rem", lineHeight: "1.4" }}>
            Disclaimer: 9Jobs is a private career support, resume optimization, and job search facilitation provider. We are not associated with or endorsed by SEEK Limited, Jora, or LinkedIn Corporation. All product and service names, logos, and brands are property of their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
