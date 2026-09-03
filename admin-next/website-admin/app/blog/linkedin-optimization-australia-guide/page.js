import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { cities } from "../../../data/australianJobsData";
import { BlogSupportLinks } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";

const routeSeo = getRouteSeo("/blog/linkedin-optimization-australia-guide");

export const metadata = createSeoMetadata(routeSeo);

const faqs = [
  [
    "How does the LinkedIn Recruiter search work?",
    "LinkedIn Recruiter is a backend search tool used by sourcing teams. Recruiters enter parameters like target job titles, specific skills tags, and location. Profiles matching these parameters rank higher. Optimization is about aligning your profile fields with these search queries."
  ],
  [
    "What settings are critical for candidates outside Australia?",
    "If relocating, you should update your target location to your desired Australian city and specify your availability date in the 'Open to Work' notes. This helps you appear in searches focused on that location."
  ],
  [
    "Should my headline contain my current company name?",
    "It is usually better to focus your headline on key roles, skills, and industry terms (e.g. 'Project Manager | Agile, Scrum | Software Delivery') rather than company names, as recruiters rarely search for company names when sourcing candidates."
  ],
  [
    "How often should I update my profile settings?",
    "Keep your settings updated dynamically: target locations, skills lists, and status updates. Sourcing tools prioritize active profiles, so minor updates keep your profile fresh in search indexes."
  ]
];

export default function LinkedInGuidePage() {
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

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "LinkedIn Optimization Guide for Job Seekers in Australia",
    "image": "https://9jobs.co/framer/story-ops.jpg",
    "author": {
      "@type": "Organization",
      "name": "9Jobs"
    },
    "publisher": {
      "@type": "Organization",
      "name": "9Jobs",
      "logo": {
        "@type": "ImageObject",
        "url": "https://9jobs.co/9jobs-logo.png"
      }
    },
    "datePublished": "2026-06-03",
    "description": "An expert guide detailing headlines, summaries, and settings to optimize LinkedIn profiles for the Australian job market."
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://9jobs.co/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://9jobs.co/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "LinkedIn Optimization Guide for Job Seekers in Australia",
        "item": "https://9jobs.co/blog/linkedin-optimization-australia-guide"
      }
    ]
  };

  return (
    <main className="site-main fj-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="fj-page-hero">
        <div className="fj-container">
          <span className="fj-announcement"><span>Blog</span> Profile Strategy</span>
          <h1>LinkedIn Optimization Guide for Job Seekers in <span className="heading-mark">Australia</span></h1>
          <p>Learn how to optimize your LinkedIn headline, summary, skills tags, and backend settings to get found by Australian talent acquisition teams.</p>
          <div style={{ marginTop: "16px", fontSize: "0.9rem", color: "var(--muted)" }}>
            Published: June 3, 2026 â€¢ 8 min read
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container" style={{ maxWidth: "800px", margin: "0 auto", color: "var(--muted)", lineHeight: "1.8", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h2>Why LinkedIn is Your Online Landing Page</h2>
          <p>
            In the modern Australian recruitment landscape, a resume is no longer the only document that matters. When a recruiter finds your resume on SEEK or receives an application, their first action is to search for your name on LinkedIn.
          </p>
          <p>
            Additionally, agencies and corporate sourcing teams in <Link href="/jobs/sydney">Sydney</Link>, <Link href="/jobs/melbourne">Melbourne</Link>, <Link href="/jobs/brisbane">Brisbane</Link>, <Link href="/jobs/perth">Perth</Link>, and <Link href="/jobs/adelaide">Adelaide</Link> use LinkedIn Recruiter to find matching candidates before posting ads. If your profile is empty, lacks relevant keywords, or is set to incorrect search settings, you are invisible in these queries. Optimizing your profile ensures you receive inbound sourcing messages directly in your inbox.
          </p>

          <h2>Headline Formula: How to Pass Sourcing Queries</h2>
          <p>
            The headline is the most important element on your profile. Most candidates write their current job title (e.g. &quot;Accountant at ABC Co&quot;). However, recruiters do not search for company names; they search for target roles and capability keywords.
          </p>
          <p>
            Use a structured headline that incorporates target terms:
            <br />
            <strong>[Target Job Title 1] | [Target Job Title 2] | [Core Skills & Tools] | [Local Market / Relocation Note]</strong>
            <br />
            Example: <em>&quot;Software Engineer | Full Stack Developer | React, Node.js, AWS | Relocating to Melbourne in July&quot;</em>
            This headline lists multiple target keywords that match recruiter search parameters, boosting your search appearance stats.
          </p>

          <h2>Crafting Your Professional Summary (About Section)</h2>
          <p>
            The 'About' section is where you tell your story. Avoid writing a boring list of tasks. Frame it around your achievements, years of experience, and location availability.
          </p>
          <p>
            Begin with a strong introductory hook, summarize your core expertise, outline your tech stack or methodologies, and include a clear statement about your location eligibility:
            <br />
            <em>&quot;Based in Sydney, holding full working rights (PR Subclass 189). Availability for new roles starts immediately.&quot;</em>
            Clearly stating your eligibility prevents recruiters from skipping your profile due to visa compliance uncertainty.
          </p>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "24px", borderRadius: "8px", margin: "24px 0" }}>
            <h3>LinkedIn Profile Audit</h3>
            <p>Get a complete LinkedIn profile optimization checklist and custom summaries written by our career coaches.</p>
            <Link href="/services/linkedin-optimization" className="fj-button fj-button--dark">
              Learn about LinkedIn Optimization <ArrowRight size={16} />
            </Link>
          </div>

          <h2>Aligning Your Skills and Endorsements Sections</h2>
          <p>
            LinkedIn allows you to list up to 50 skills, and recruiters filter candidate lists strictly based on these exact tags. Having them listed in your experience text is not enough; they must be explicitly added to the skills section.
          </p>
          <p>
            Review local job listings in your sector, identify the repeating systems, tools, or soft skills requested, and add them to your profile. Keep this list highly focused and encourage past colleagues to endorse you for your top skills to build social trust.
          </p>

          <h2>Key Settings to Adjust for an Australian Job Search</h2>
          <p>
            Having good copy is only half the battle. You must configure your backend settings correctly:
          </p>
          <ul>
            <li><strong>Update Target Location:</strong> If you are planning a relocation, change your target location to your desired city in Australia (e.g. Sydney, NSW) to appear in local search results.</li>
            <li><strong>Open to Work Notes:</strong> Use the Open to Work settings to write brief notes to recruiters, specifying your target job titles, location preferences, and visa eligibility.</li>
            <li><strong>Profile Visibility:</strong> Ensure your profile settings are set to public and your custom URL is set to a clean, professional format (e.g. `linkedin.com/in/yourname`).</li>
          </ul>
        </div>
      </section>

      <section className="fj-section fj-section--muted" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Frequently Asked Questions</h2>
            <p>Answers to help you optimize your LinkedIn presence.</p>
            <CalendlyLink className="fj-button fj-button--dark">
              Talk to us <ArrowRight size={17} />
            </CalendlyLink>
          </div>

          <div className="fj-faq-list">
            {faqs.map(([question, answer], index) => (
              <details className="fj-faq-item" key={question} open={index === 0}>
                <summary>
                  <span>{question}</span>
                  <ChevronDown size={20} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Australian Cities Sourcing Guides</span>
            <h2>Local Sourcing Opportunities</h2>
            <p>Target localized job markets across Australia's major hubs with tailored profiles, resumes, and networks.</p>
          </div>
          
          <div className="cities-marquee-wrapper">
            <div className="cities-marquee-track">
              {[...Object.values(cities), ...Object.values(cities)].map((city, idx) => (
                <article className="fj-city-card" key={`${city.slug}-${idx}`}>
                  <h3>{city.name} Jobs</h3>
                  <p>{city.description}</p>
                  <Link
                    href={
                      city.slug === "melbourne" ? "/jobs/melbourne" :
                      city.slug === "sydney" ? "/jobs/sydney" :
                      city.slug === "brisbane" ? "/jobs/brisbane" :
                      city.slug === "perth" ? "/jobs/perth" :
                      city.slug === "adelaide" ? "/jobs/adelaide" :
                      city.slug === "geelong" ? "/jobs/geelong" :
                      city.slug === "vic" ? "/jobs/vic" :
                      `/${city.slug}`
                    }
                    style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
                  >
                    See {city.name} jobs <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <BlogSupportLinks />

      <section className="fj-section fj-section--tight">
        <div className="fj-container fj-final-cta">
          <span>Get More Sourcing Calls</span>
          <h2>Ready to rank higher in recruiter searches?</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a profile review</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}

