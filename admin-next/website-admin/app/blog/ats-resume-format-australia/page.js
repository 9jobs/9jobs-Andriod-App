import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { cities } from "../../../data/australianJobsData";
import { BlogSupportLinks } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";

const routeSeo = getRouteSeo("/blog/ats-resume-format-australia");

export const metadata = createSeoMetadata(routeSeo);

const faqs = [
  [
    "What is the best layout for an ATS resume in Australia?",
    "The best layout is a single-column, reverse-chronological format using standard, web-safe fonts like Arial, Calibri, or Helvetica. Avoid text boxes, tables, columns, charts, and graphics, as they can prevent the scanner from reading your experience correctly."
  ],
  [
    "Should I put my photo on my resume in Australia?",
    "No. In Australia, hiring managers and recruiters prefer resumes without photos due to anti-discrimination regulations. Including a photo is a common reason resumes get rejected before screening."
  ],
  [
    "How do I identify keywords to add to my resume?",
    "Read target job listings in your sector and highlight repeating skills, systems, tools, and methodologies. Integrate these exact terms naturally into your professional summary and experience sections."
  ],
  [
    "What is the ideal resume length for Australian employers?",
    "The golden standard is 2 to 3 pages. A single-page resume is often too brief to show professional depth, while 4+ pages can feel tedious to scan. Keep your content highly-focused."
  ]
];

export default function AtsResumeFormatPage() {
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
    "headline": "Best ATS Resume Format for Australian Recruiters",
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
    "description": "A comprehensive guide on formatting resumes to pass Applicant Tracking Systems used by Australian employers."
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
        "name": "Best ATS Resume Format for Australian Recruiters",
        "item": "https://9jobs.co/blog/ats-resume-format-australia"
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
          <span className="fj-announcement"><span>Blog</span> Resume Strategy</span>
          <h1>Best ATS Resume Format for Australian <span className="heading-mark">Recruiters</span></h1>
          <p>Learn how to format and optimize your resume to pass automated screens, align with local benchmarks, and secure callbacks.</p>
          <div style={{ marginTop: "16px", fontSize: "0.9rem", color: "var(--muted)" }}>
            Published: June 3, 2026 â€¢ 7 min read
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container" style={{ maxWidth: "800px", margin: "0 auto", color: "var(--muted)", lineHeight: "1.8", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h2>Why ATS Compatibility is the First Gate to Clear</h2>
          <p>
            When you apply for a job on SEEK, Jora, or LinkedIn, your resume rarely goes straight to a human hiring manager. Instead, it is processed by an Applicant Tracking System (ATS). This is especially true in highly competitive markets like <Link href="/jobs/sydney">Sydney</Link>, <Link href="/jobs/melbourne">Melbourne</Link>, <Link href="/jobs/brisbane">Brisbane</Link>, <Link href="/jobs/perth">Perth</Link>, and <Link href="/jobs/adelaide">Adelaide</Link> where recruiters process hundreds of applications per role.
          </p>
          <p>
            If your file uses a layout that cannot be read by these scanners, your text becomes scrambled or unreadable, leading to an automatic rejection. To land interviews, your resume must be designed to pass the digital screen first.
          </p>

          <h2>Key Formatting Rules to Ensure ATS Compatibility</h2>
          <p>
            Many candidates try to stand out by using creative, colorful resume templates from Canva or other design platforms. While these layouts look appealing, they are an absolute disaster for ATS scanning.
          </p>
          <ul>
            <li><strong>Avoid Multi-Column Layouts:</strong> Scanners read text from left to right. If you have two columns of text side-by-side, the software will merge the lines across the columns, making the experience section read as gibberish.</li>
            <li><strong>No Tables or Text Boxes:</strong> Databases cannot extract text embedded inside graphics, tables, or text boxes. Use standard paragraph and bullet formatting instead.</li>
            <li><strong>Use Standard Fonts:</strong> Use clean, modern, web-safe fonts such as Arial, Calibri, Trebuchet MS, or Georgia. Avoid decorative or non-standard fonts that can cause encoding issues during parsing.</li>
            <li><strong>Save as PDF or DOCX:</strong> Standard PDF files (saved from Word or Google Docs, not scanned images) or Microsoft Word documents (.docx) are the most compatible formats.</li>
          </ul>

          <h2>Essential Resume Sections for Australia</h2>
          <p>
            Australian hiring managers expect resumes to follow a logical structure:
          </p>
          <ol>
            <li><strong>Contact Details:</strong> Your name, phone number, professional email, LinkedIn link, and location (City, State, e.g. Sydney, NSW). Do not include personal details like photos, date of birth, marital status, or full street addresses.</li>
            <li><strong>Professional Summary:</strong> A 3-4 sentence paragraph summarizing your career achievements, target role, and visa status.</li>
            <li><strong>Key Skills Checklist:</strong> A 9-12 item grid of target skills, systems, or technical tools matching your industry.</li>
            <li><strong>Professional Experience:</strong> Chronological listing of your roles, company names, dates, achievements, and responsibilities.</li>
            <li><strong>Education & Certifications:</strong> Degree name, institution, and year of completion.</li>
          </ol>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "24px", borderRadius: "8px", margin: "24px 0" }}>
            <h3>ATS Formatting Help</h3>
            <p>Our writers specialize in creating ATS-compliant, recruiter-ready resumes tailored for the Australian job market.</p>
            <Link href="/services/resume-writing" className="fj-button fj-button--dark">
              Learn about Resume Writing <ArrowRight size={16} />
            </Link>
          </div>

          <h2>How to Integrate Keywords to Boost Your Rank</h2>
          <p>
            The ranking score calculated by the ATS relies heavily on keyword matching. Recruiters enter search criteria (e.g. &quot;React Developer&quot;, &quot;Agile&quot;, &quot;SaaS&quot;) and the system shows profiles that contain those terms.
          </p>
          <p>
            Review the job description of roles you want, find repeating industry terms, and integrate them naturally. Avoid &quot;keyword stuffing&quot;â€”listing terms without contextâ€”as human recruiters will immediately notice. Instead, weave them into accomplishment statements: &quot;Implemented React and Node.js solutions to automate internal data sync, reducing processing time by 20%.&quot;
          </p>

          <h2>Achievement-Focused Writing vs. Task Listing</h2>
          <p>
            Hiring managers are not interested in reading a list of your daily tasks. They want to see the outcomes you delivered. Change passive descriptions into active success statements.
          </p>
          <p>
            Instead of writing &quot;Responsible for managing customer calls,&quot; write: &quot;Managed a pipeline of 80+ customer inquiries daily, achieving a 95% satisfaction rating and reducing response latency by 2 hours.&quot; Frame your experiences around Situation, Task, Action, and Result (STAR) metrics to prove your capability.
          </p>
        </div>
      </section>

      <section className="fj-section fj-section--muted" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Frequently Asked Questions</h2>
            <p>Answers to help you format your resume correctly.</p>
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
          <span>Get Your Resume Scanned</span>
          <h2>Ready to pass automated recruiter checks?</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a resume rewrite</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}

