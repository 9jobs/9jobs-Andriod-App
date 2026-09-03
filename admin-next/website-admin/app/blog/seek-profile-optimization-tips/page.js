import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { cities } from "../../../data/australianJobsData";
import { BlogSupportLinks } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";

const routeSeo = getRouteSeo("/blog/seek-profile-optimization-tips");

export const metadata = createSeoMetadata(routeSeo);

const faqs = [
  [
    "Should my SEEK profile be set to 'Standard' privacy?",
    "Yes. Setting your SEEK profile to 'Standard' is highly recommended when looking for a job. This allows registered employers and recruitment agencies to search for you, read your summary, view your uploaded resume, and contact you directly. If set to 'Limited' or 'Hidden', you will not show up in database searches."
  ],
  [
    "How does the SEEK matching score work?",
    "SEEK compares the text on your digital profile summary and experiences with your uploaded resume document. A closer match yields a higher compatibility score, which Vercel/SEEK displays to recruiters, boosting your visibility in their candidate lists."
  ],
  [
    "Do I need to update my SEEK profile if my resume is already updated?",
    "Yes. Recruiters filter database searches based on SEEK profile fields, not the text inside your uploaded resume attachment. If your SEEK profile is empty, you will be filtered out before they see your resume."
  ],
  [
    "How do I set up salary targets on SEEK?",
    "Configure your salary expectations based on local industry benchmarks. Setting a target salary that is too high can exclude you from standard roles, while setting it too low can filter you out of senior positions. We recommend aligning it with current market indicators."
  ]
];

export default function SeekTipsPage() {
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
    "headline": "SEEK Profile Optimization: Top Sourcing Tips for Australia",
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
    "description": "Top sourcing tips and settings configurations to optimize your SEEK profile for the Australian job market."
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
        "name": "SEEK Profile Optimization: Top Sourcing Tips for Australia",
        "item": "https://9jobs.co/blog/seek-profile-optimization-tips"
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
          <span className="fj-announcement"><span>Blog</span> SEEK Strategy</span>
          <h1>SEEK Profile Optimization: Top Sourcing Tips for <span className="heading-mark">Australia</span></h1>
          <p>Learn how to configure your SEEK profile summary, experience tags, and search settings to help you stand out to Australian employers.</p>
          <div style={{ marginTop: "16px", fontSize: "0.9rem", color: "var(--muted)" }}>
            Published: June 3, 2026 â€¢ 7 min read
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container" style={{ maxWidth: "800px", margin: "0 auto", color: "var(--muted)", lineHeight: "1.8", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h2>Why SEEK is the Gateway to the Australian Market</h2>
          <p>
            While LinkedIn is vital for international networking and professional branding, SEEK remains the absolute leader for active job transactions in Australia. Every year, millions of job advertisements are posted on the platform, and recruitment firms search the backend candidate database to fill roles before advertising them.
          </p>
          <p>
            If you only use SEEK to submit applications without optimizing your digital profile, you miss out on a massive stream of recruiter outreach. Sourcing teams use database searches to find matches. This guide outlines the key tips to optimize your profile.
          </p>

          <h2>Step 1: Set Your Profile Visibility to 'Standard'</h2>
          <p>
            SEEK offers three privacy levels for candidates: Standard, Limited, and Hidden. Many candidates set their privacy to Limited or Hidden out of privacy concerns. However, this means you will not show up in recruiter searches.
          </p>
          <p>
            When actively looking for work, set your visibility to Standard. This allows registered employers and agencies to search for you, read your summary, view your past experiences, see your target salary and location parameters, and contact you directly.
          </p>

          <h2>Step 2: Write a Specialized SEEK Summary</h2>
          <p>
            Your SEEK profile summary is a 150 to 200 word summary that recruiters see first in search results. It must state your core expertise, key achievements, years of experience, and location availability.
          </p>
          <p>
            Keep this section highly focused. Mention your target role title, specify your industry experience, list key tools or methodologies, and include a clear statement about your working rights. If you are relocating to Australia, state your relocation timeline and visa status clearly.
          </p>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "24px", borderRadius: "8px", margin: "24px 0" }}>
            <h3>SEEK Profile Audit</h3>
            <p>Get a complete SEEK profile review and custom written summaries to rank higher in recruiter searches.</p>
            <Link href="/services/seek-profile-optimization" className="fj-button fj-button--dark">
              Learn about SEEK Services <ArrowRight size={16} />
            </Link>
          </div>

          <h2>Step 3: Align Your Salary and Location Preferences</h2>
          <p>
            Recruiters filter candidate lists based on salary boundaries and location constraints. If your target salary is set to incorrect benchmarks, you will be excluded from recruiter queries.
          </p>
          <p>
            Research local industry benchmarks for your level. Set your target salary to a realistic range matching your target role values. Specify your preferred work arrangements (hybrid/remote/onsite) and target cities like <Link href="/jobs/sydney">Sydney</Link>, <Link href="/jobs/melbourne">Melbourne</Link>, <Link href="/jobs/brisbane">Brisbane</Link>, <Link href="/jobs/perth">Perth</Link>, and <Link href="/jobs/adelaide">Adelaide</Link> to ensure you show up in relevant search lists.
          </p>

          <h2>Step 4: Update Your Skills and Experience Tags</h2>
          <p>
            Ensure your SEEK profile contains your full employment history and relevant skills tags. Recruiter search tools look for these exact tags to match profiles.
          </p>
          <p>
            List your tools, technologies, and certifications in the skills section. A complete profile data structure ensures a high compatibility ranking in SEEK's matching algorithm, boosting your search appearances.
          </p>
        </div>
      </section>

      <section className="fj-section fj-section--muted" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Frequently Asked Questions</h2>
            <p>Answers to help you get discovered on SEEK.</p>
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
          <span>Stand Out on SEEK</span>
          <h2>Ready to get noticed by recruiters?</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book a SEEK profile review</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}

