import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { CalendlyLink } from "../../../components/CalendlyWidget";
import { cities } from "../../../data/australianJobsData";
import { BlogSupportLinks } from "../../../components/RelatedSeoLinks";
import { createSeoMetadata, getRouteSeo } from "../../../data/seo";

const routeSeo = getRouteSeo("/blog/why-you-are-not-getting-job-interviews");

export const metadata = createSeoMetadata(routeSeo);

const faqs = [
  [
    "Why am I getting automatic rejection emails?",
    "Automatic rejection emails are typically triggered by applicant tracking software (ATS). If your resume does not pass basic formatting checks, lacks critical keywords, or fails specific screening questions (e.g. visa parameters), the system will automatically reject you before a human reviews your file."
  ],
  [
    "How can I tell if my resume is ATS-friendly?",
    "If your resume uses columns, text boxes, tables, images, or custom fonts, it is likely not ATS-friendly. Test your resume by copy-pasting the text into a plain text editor (like Notepad). If the formatting scrambled or text disappears, the ATS will also fail to parse it."
  ],
  [
    "Does visa status affect interview calls?",
    "Yes. Australian employers prioritize candidates with full working rights due to compliance regulations. If your visa status is restricted or not specified on your profile, talent teams will skip your application. State your work eligibility clearly."
  ],
  [
    "Should I follow up with recruiters after applying?",
    "Yes. A brief, professional follow-up call or email 3-4 days after applying can help you stand out. Sourcing teams handle large volumes of applications, and a polite inquiry demonstrates active interest."
  ]
];

export default function WhyNoInterviewsPage() {
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
    "headline": "Not Getting Job Interviews in Australia? Here is Why & How to Fix",
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
    "description": "An analysis of the common reasons for job application rejections in Australia and actionable solutions to secure interviews."
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
        "name": "Not Getting Job Interviews in Australia? Here is Why & How to Fix",
        "item": "https://9jobs.co/blog/why-you-are-not-getting-job-interviews"
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
          <span className="fj-announcement"><span>Blog</span> Career Support</span>
          <h1>Not Getting Job Interviews in Australia? Here is Why & How to <span className="heading-mark">Fix It</span></h1>
          <p>Analyze your application funnel, identify common rejection triggers, and learn how to configure your resume and profiles for success.</p>
          <div style={{ marginTop: "16px", fontSize: "0.9rem", color: "var(--muted)" }}>
            Published: June 3, 2026 â€¢ 8 min read
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container" style={{ maxWidth: "800px", margin: "0 auto", color: "var(--muted)", lineHeight: "1.8", display: "flex", flexDirection: "column", gap: "24px" }}>
          <h2>The Frustration of the Silent Job Search</h2>
          <p>
            One of the most discouraging experiences in a career transition is submitting dozens of applications only to receive silence or generic automatic rejections (&quot;We regret to inform you...&quot;). Many candidates believe they lack the experience required for the roles they target.
          </p>
          <p>
            However, in most cases, rejections are not caused by a lack of capability. They are caused by structural errors in your application funnel: formatting issues that block scanner parsing, missing keywords, incorrect visibility parameters, or visa status uncertainty. This is true whether you are applying for roles in <Link href="/jobs/sydney">Sydney</Link>, <Link href="/jobs/melbourne">Melbourne</Link>, <Link href="/jobs/brisbane">Brisbane</Link>, <Link href="/jobs/perth">Perth</Link>, or <Link href="/jobs/adelaide">Adelaide</Link>. This guide explains why this happens and how to fix it.
          </p>

          <h2>Reason 1: Your Resume is Getting Blocked by ATS Filters</h2>
          <p>
            Over 75% of resumes submitted online are filtered out automatically by Applicant Tracking Systems (ATS). If your file uses design templates (with columns, text boxes, tables, or graphs), the parser will scramble the text.
          </p>
          <p>
            To fix this, rebuild your resume using a clean, single-column format. Remove graphics, charts, and non-standard fonts. Read our <Link href="/services/resume-writing">Resume Writing Services</Link> guide to learn how to structure an ATS-friendly layout.
          </p>

          <h2>Reason 2: You Lack Relevant Sourcing Keywords</h2>
          <p>
            Recruiters use search filters to query candidate databases on platforms like SEEK or LinkedIn. If your profile lacks target industry terms and skill tags, you will be excluded from search queries before you apply.
          </p>
          <p>
            Review local job listings, identify repeating technical terms, tools, or certifications in your field, and add them to your resume and digital profiles. Read our <Link href="/services/linkedin-optimization">LinkedIn Optimization</Link> and <Link href="/services/seek-profile-optimization">SEEK Optimization</Link> guides to configure your keywords correctly.
          </p>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "24px", borderRadius: "8px", margin: "24px 0" }}>
            <h3>Get an Interview Audit</h3>
            <p>We analyze your resume, SEEK, and LinkedIn profiles to pinpoint why you are missing out on interviews and write optimized versions for you.</p>
            <Link href="/pricing" className="fj-button fj-button--dark">
              Explore Our Packages <ArrowRight size={16} />
            </Link>
          </div>

          <h2>Reason 3: Your Visa Status or Availability is Unclear</h2>
          <p>
            Australian employers are highly cautious about visa compliance. Sourcing teams prioritize candidates who state their work rights clearly. If your profile summary is silent about your eligibility, hiring managers will assume you require sponsorship, leading to quick rejections.
          </p>
          <p>
            Clearly state your visa status (e.g. &quot;Full working rights, Permanent Residency Subclass 190&quot;) at the top of your resume and in your profile summaries. This builds instant trust and clears compliance checks.
          </p>

          <h2>Reason 4: Lack of Daily Application Consistency</h2>
          <p>
            Job vacancies in Australia are filled quickly. Sourcing teams start contacting candidates within 48 hours of posting. If you only apply in batches on weekends, you miss out on high-priority roles.
          </p>
          <p>
            Apply to roles daily as they are listed. 9Jobs offers a professional <Link href="/services/job-application-automation">Job Application Service</Link> where our team researches and submits applications on your behalf daily, maintaining consistency.
          </p>

          <h2>Reason 5: Weak Phone Screen Performance</h2>
          <p>
            If you pass the initial screen, you will receive phone screening calls. Sourcing teams use these conversations to verify basic parameters. If you cannot explain your background, working rights, and salary expectations clearly, you will be filtered out.
          </p>
          <p>
            Prepare for screening calls by structuring your achievements using the STAR method. For mock interview practice and communication coaching, check our <Link href="/services/interview-coaching">Interview Support</Link> program.
          </p>
        </div>
      </section>

      <section className="fj-section fj-section--muted" id="faqs">
        <div className="fj-container fj-faq-grid">
          <div className="fj-faq-intro">
            <span className="fj-label">FAQs</span>
            <h2>Frequently Asked Questions</h2>
            <p>Answers to help you secure more callbacks.</p>
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
          <span>Secure More Interviews</span>
          <h2>Ready to fix your application funnel?</h2>
          <div className="fj-actions">
            <Link className="fj-button fj-button--ghost" href="/pricing">Check pricing</Link>
            <CalendlyLink className="fj-button fj-button--dark">Book an interview prep audit</CalendlyLink>
          </div>
        </div>
      </section>
    </main>
  );
}

