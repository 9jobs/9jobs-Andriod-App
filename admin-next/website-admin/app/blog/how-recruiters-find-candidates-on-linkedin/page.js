import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { cities } from "../../../data/australianJobsData";
import { BlogSupportLinks } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";

const routeSeo = getRouteSeo("/blog/how-recruiters-find-candidates-on-linkedin");

export const metadata = createSeoMetadata(routeSeo);


export default function BlogDetailPage() {
  const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does LinkedIn Recruiter search differ from regular search?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "LinkedIn Recruiter provides advanced filters like years of experience, current company, past company, education, location radiuses, and boolean query fields, allowing sourcing teams to build highly targeted candidate lists."
      }
    },
    {
      "@type": "Question",
      "name": "How does profile activity affect search rankings?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The LinkedIn search algorithm prioritizes active profiles. Regularly sharing industry updates, connecting with professionals, and engaging with content signals that your profile is active, which can boost your search ranking."
      }
    },
    {
      "@type": "Question",
      "name": "Should I accept every connection request from recruiters?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Connecting with recruiters expands your professional network and makes your profile more visible to their colleagues, increasing your chances of being discovered for unadvertised roles."
      }
    },
    {
      "@type": "Question",
      "name": "How can I hide my job search from my current employer?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Configure your 'Open to Work' settings to 'Recruiters Only.' While LinkedIn takes steps to prevent recruiters at your current company from seeing this flag, it is not 100% guaranteed, though it is generally secure."
      }
    }
  ]
};
  const blogPostingSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How Recruiters Find Candidates on LinkedIn",
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
  "description": "Understand the backend search mechanics of LinkedIn Recruiter. Learn how boolean search, location filters, and profile completeness affect your rankings."
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
      "name": "How Recruiters Find Candidates on LinkedIn | Sourcing Insights",
      "item": "https://9jobs.co/blog/how-recruiters-find-candidates-on-linkedin"
    }
  ]
};

  const faqs = [["How does LinkedIn Recruiter search differ from regular search?","LinkedIn Recruiter provides advanced filters like years of experience, current company, past company, education, location radiuses, and boolean query fields, allowing sourcing teams to build highly targeted candidate lists."],["How does profile activity affect search rankings?","The LinkedIn search algorithm prioritizes active profiles. Regularly sharing industry updates, connecting with professionals, and engaging with content signals that your profile is active, which can boost your search ranking."],["Should I accept every connection request from recruiters?","Yes. Connecting with recruiters expands your professional network and makes your profile more visible to their colleagues, increasing your chances of being discovered for unadvertised roles."],["How can I hide my job search from my current employer?","Configure your 'Open to Work' settings to 'Recruiters Only.' While LinkedIn takes steps to prevent recruiters at your current company from seeing this flag, it is not 100% guaranteed, though it is generally secure."]];

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
            <span style={{ color: "var(--fj-ink)", fontWeight: 800 }}>LinkedIn</span>
          </nav>
          <span className="fj-announcement"><span>Blog</span> LinkedIn Optimization</span>
          <h1>How Recruiters Find Candidates on LinkedIn</h1>
          <p>Understand the backend search mechanics of LinkedIn Recruiter. Learn how boolean search, location filters, and profile completeness affect your rankings.</p>
          <div style={{ marginTop: "16px", fontSize: "0.9rem", color: "var(--muted)" }}>
            Published: 2026-06-04 â€¢ 10 min read
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container" style={{ maxWidth: "800px", margin: "0 auto", color: "var(--muted)", lineHeight: "1.8", display: "flex", flexDirection: "column", gap: "24px" }}>
          <p>To optimize your LinkedIn profile successfully, you must understand how the other side operates. Recruiters and sourcing professionals do not browse LinkedIn the way regular users do. Sourcing teams use a specialized interface called LinkedIn Recruiter. This interface allows them to run advanced search queries, apply filters, build pipelines, and manage candidate communications. The profiles that appear on the first page of their search results are not there by accident; they are ranked by an algorithm that rewards specific keyword densities, locations, and settings configurations. If you are not appearing on the first page of recruiter searches in Sydney, Melbourne, Brisbane, Perth, or Adelaide, your profile remains invisible. This guide reveals the backend mechanics of LinkedIn Recruiter and outlines how to optimize your profile to rank higher in searches.</p>

          
          <h2>1. Boolean Searches: How Keywords are Combined</h2>
          <p>Recruiters build candidate lists by running boolean search queries in LinkedIn Recruiter. These queries combine job titles, technical skills, and certifications using operators like AND, OR, and NOT (e.g. 'Software Engineer' AND 'React' AND ('Node.js' OR 'TypeScript')). If your profile does not contain the exact combination of terms the recruiter is searching for, your name will not appear in the results. To improve your rankings, analyze target job descriptions in your industry and ensure those specific key terms are integrated throughout your headline, summary, and experience sections. For expert help in keyword alignment, check our <Link href="/services/linkedin-optimization">LinkedIn Optimization Australia</Link> service.</p>
  

          <h2>2. The Location and Working Rights Filter</h2>
          <p>Location is one of the most common filters applied by sourcing teams to narrow down candidate pools. If a role is based in Melbourne, the recruiter will filter search results to candidates located within a 50km radius. If your location is set incorrectly, you will be filtered out. Ensure that your location is set to your target city (e.g. 'Melbourne VIC' or 'Sydney NSW'). If you are relocating, update your settings and state your relocation timeline and work eligibility clearly in your summary. You can align these settings across platforms using our <Link href="/services/seek-profile-optimization">SEEK Profile Optimization</Link> program.</p>
  

          <h2>3. The Profile Completeness Score</h2>
          <p>LinkedIn's algorithm ranks profiles with high completeness scores higher in search results. A complete profile requires a professional photo, an optimized headline, a detailed summary, work history with detailed bullet points, education history, and at least 5 relevant skills. Leaving sections blank signals to the algorithm that your profile is inactive, causing your ranking to drop. Ensure every section of your profile is complete, and align your work history details with your resume using our <Link href="/services/resume-writing">Resume Writing Services Australia</Link> team.</p>
  

          <h2>4. The 'Open to Work' Backend Flag</h2>
          <p>LinkedIn Recruiter has a dedicated filter that allows sourcing teams to prioritize candidates who are actively seeking new opportunities. Sourcing professionals use this filter because 'open' candidates are more likely to respond to messages. Enable the 'Open to Work' feature in your privacy settings, selecting target job titles, locations, and employment types. If you want to keep your search confidential, configure the settings so this flag is only visible to users with a LinkedIn Recruiter license, keeping it hidden from your current employer.</p>
  

          <h2>5. Maintaining Sourcing and Application Momentum</h2>
          <p>While optimization increases inbound headhunting inquiries, you must also maintain a consistent volume of active job applications. The Australian job market moves fast, and applying early gives you a significant advantage. 9Jobs offers a comprehensive <Link href="/services/job-application-automation">Job Application Service Australia</Link> where our team manages your applications daily, tailoring cover letters and submitting resume packages to ensure you maintain a strong pipeline of opportunities.</p>
  
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

