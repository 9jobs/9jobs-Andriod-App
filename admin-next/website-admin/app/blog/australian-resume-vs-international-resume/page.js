import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { cities } from "../../../data/australianJobsData";
import { BlogSupportLinks } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";

const routeSeo = getRouteSeo("/blog/australian-resume-vs-international-resume");

export const metadata = createSeoMetadata(routeSeo);


export default function BlogDetailPage() {
  const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is it called a CV or a Resume in Australia?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In Australia, the terms 'CV' (Curriculum Vitae) and 'Resume' are used interchangeably to refer to the same 2-3 page document used to apply for professional roles."
      }
    },
    {
      "@type": "Question",
      "name": "Should I include my GPA or high school details?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Unless you are a recent graduate applying for graduate programs, exclude your high school details and university GPA. Focus on listing your degree, institution, graduation year, and professional experience."
      }
    },
    {
      "@type": "Question",
      "name": "Should I include a reference list on my resume?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. You do not need to list reference contact details on your resume. Simply write 'References available upon request' at the end of the document."
      }
    },
    {
      "@type": "Question",
      "name": "How do I present my overseas experience?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Present your overseas experience by highlighting transferable skills, project scales, global frameworks, and translating company descriptions to help local recruiters understand the context of your achievements."
      }
    }
  ]
};
  const blogPostingSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Australian Resume vs International Resume",
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
  "datePublished": "2026-06-04",
  "description": "Understand the key differences between Australian resumes and international formats. Discover length rules, personal data exclusions, and localization tips."
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
      "name": "Blog",
      "item": "https://9jobs.co/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Australian Resume vs International Resume | Sourcing Differences",
      "item": "https://9jobs.co/blog/australian-resume-vs-international-resume"
    }
  ]
};

  const faqs = [["Is it called a CV or a Resume in Australia?","In Australia, the terms 'CV' (Curriculum Vitae) and 'Resume' are used interchangeably to refer to the same 2-3 page document used to apply for professional roles."],["Should I include my GPA or high school details?","No. Unless you are a recent graduate applying for graduate programs, exclude your high school details and university GPA. Focus on listing your degree, institution, graduation year, and professional experience."],["Should I include a reference list on my resume?","No. You do not need to list reference contact details on your resume. Simply write 'References available upon request' at the end of the document."],["How do I present my overseas experience?","Present your overseas experience by highlighting transferable skills, project scales, global frameworks, and translating company descriptions to help local recruiters understand the context of your achievements."]];

  return (
    <main className="site-main fj-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <section className="fj-page-hero">
        <div className="fj-container">
          <nav className="fj-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center", fontSize: "0.88rem", color: "var(--fj-muted)", fontWeight: 600 }}>
            <Link href="/" style={{ color: "inherit" }}>Home</Link>
            <span>&gt;</span>
            <Link href="/blog" style={{ color: "inherit" }}>Blog</Link>
            <span>&gt;</span>
            <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>Resume</span>
          </nav>
          <span className="fj-announcement"><span>Blog</span> Resume Optimization</span>
          <h1>Australian Resume vs International Resume</h1>
          <p>Understand the key differences between Australian resumes and international formats. Discover length rules, personal data exclusions, and localization tips.</p>
          <div style={{ marginTop: "16px", fontSize: "0.9rem", color: "var(--muted)" }}>
            Published: 2026-06-04 â€¢ 10 min read
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container" style={{ maxWidth: "800px", margin: "0 auto", color: "var(--muted)", lineHeight: "1.8", display: "flex", flexDirection: "column", gap: "24px" }}>
          <p>If you are targeting professional roles in Australia, you cannot use a generic resume designed for other global markets. Resume writing conventions and recruitment standards differ significantly across regions. While US employers prefer a single-page document and some European markets expect a photo and personal details, the Australian market has strict rules regarding length, formatting, personal privacy, and terminology. Recruiters in Sydney, Melbourne, Brisbane, Perth, and Adelaide use automated screening software that matches resumes against these local standards. Using an incorrect format can lead to automatic rejection before a human ever reviews your application. This guide outlines the key differences between an Australian resume and international formats, helping you adapt your profile to secure more interviews.</p>

          
          <h2>1. Page Length Rules: 1 Page vs 2-3 Pages</h2>
          <p>The most notable difference is page length. In the US and parts of Europe, candidates are encouraged to condense their career history onto a single page. In Australia, a single-page resume is often considered incomplete for mid-to-senior professional roles. The standard Australian resume is two to three pages long. This length provides enough space to detail your career achievements, project scale, technical stack, and education history without cluttering the page. For professional layout drafting that complies with these length standards, you can leverage our <Link href="/services/resume-writing">Resume Writing Services Australia</Link> team.</p>
  

          <h2>2. Personal Privacy: Excluding Photos and Personal Data</h2>
          <p>In many Asian, European, and Middle Eastern markets, it is customary to include a photo, date of birth, marital status, gender, and sometimes even your health status or religion on your resume. In Australia, including this information is a major mistake. Due to strict anti-discrimination and privacy laws, employers avoid reviewing resumes containing personal details to prevent compliance risks. Restrict your contact section to your full name, professional email address, Australian mobile number (starting with +61), LinkedIn URL, and your target location (e.g. Sydney NSW or Melbourne VIC). If you are relocating, update these details across platforms using our <Link href="/services/linkedin-optimization">LinkedIn Optimization Australia</Link> and <Link href="/services/seek-profile-optimization">SEEK Profile Optimization</Link> programs.</p>
  

          <h2>3. Achievement Focus vs Duty Descriptions</h2>
          <p>Many international resumes focus on listing daily responsibilities and job duties. In Australia, recruiters expect a results-oriented document that highlights measurable achievements and business outcomes. For every role, frame your experience using the STAR method (Situation, Task, Action, Result) and include metrics where possible. For example, instead of writing 'Responsible for client communication,' write 'Managed relationships with 15 corporate clients in Sydney, increasing client satisfaction scores by 20%.'</p>
  

          <h2>4. Outsourcing the Job Application Process</h2>
          <p>Adapting your resume to local standards and maintaining a consistent application volume is time-consuming. Because recruiters fill roles quickly, applying early gives you a significant advantage. 9Jobs offers a professional <Link href="/services/job-application-automation">Job Application Service Australia</Link> where our team monitors local job boards daily, tailors your applications, and submits them on your behalf, allowing you to maintain a consistent application volume without the stress.</p>
  

          <h2>5. Preparing for local Structured Interviews</h2>
          <p>Once your localized resume secures interviews, you must pass the interview stage. Australian hiring managers use structured behavioral interviews to assess cultural fit and technical capability. Sourcing teams look for candidates who can describe how they handled professional challenges using the STAR method. Our <Link href="/services/interview-coaching">Interview Support Australia</Link> program offers coaching sessions and mock interviews with local experts to build your confidence and help you secure offers.</p>
  
        </div>
      </section>

      <section className="fj-section fj-section--muted" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Frequently Asked Questions</h2>
            <p>Practical answers to accelerate your search and documentation.</p>
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
          <span>Start Your Job Search</span>
          <h2>Ready to land your dream job in Australia?</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a strategy call</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}

