import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, BookUser, Briefcase, FileText, Play, Search } from "lucide-react";
import connectMongoDB from "@/lib/mongodb";
import SocialBlog from "@/models/SocialBlog";
import SocialMediaPoster from "@/components/SocialMediaPoster";
import SyncFeedButton from "@/components/SyncFeedButton";
import socialMedia from "@/lib/blog/socialMedia";
import serializeSocialBlogPostModule from "@/lib/blog/serializeSocialBlogPost";
import { cities } from "../../data/australianJobsData";
import { createSeoMetadata, getRouteSeo } from "../../data/seo";

export const dynamic = "force-dynamic";

const posts = [
  [
    "How to Get a Job in Australia: The Definitive Guide",
    "A comprehensive, step-by-step guide to navigating the recruitment process, profile setups, and landing job offers in Australia.",
    "Job Search",
    Briefcase,
    "/blog/how-to-get-a-job-in-australia"
  ],
  [
    "Best ATS Resume Format for Australian Recruiters",
    "Learn how to format and optimize your resume to pass automated screens and align with local benchmarks.",
    "Resume",
    FileText,
    "/blog/ats-resume-format-australia"
  ],
  [
    "LinkedIn Optimization Guide for Job Seekers in Australia",
    "Unlock the power of LinkedIn Recruiter searches in Australia. Headline formulas, summaries, and settings adjustments.",
    "LinkedIn",
    BookUser,
    "/blog/linkedin-optimization-australia-guide"
  ],
  [
    "SEEK Profile Optimization: Top Sourcing Tips for Australia",
    "Make your SEEK profile stand out to recruiters. Settings, summaries, alerts, and formatting tips to maximize callbacks.",
    "SEEK",
    Search,
    "/blog/seek-profile-optimization-tips"
  ],
  [
    "Not Getting Job Interviews in Australia? Here is Why & How to Fix",
    "Discover the most common reasons why your applications are getting rejected and learn actionable steps to fix them.",
    "Job Search",
    FileText,
    "/blog/why-you-are-not-getting-job-interviews"
  ],
  [
    "Best Resume Format Australia 2026",
    "Discover the best resume format for Australia in 2026. Learn about ATS compliance, section ordering, page length, and key terms to stand out to recruiters.",
    "Resume",
    FileText,
    "/blog/best-resume-format-australia-2026"
  ],
  [
    "How ATS Systems Work in Australia",
    "Learn how Applicant Tracking Systems (ATS) scan, parse, and rank resumes in Australia. Discover formatting rules and keyword strategies to clear automated screens.",
    "Resume",
    FileText,
    "/blog/how-ats-systems-work-in-australia"
  ],
  [
    "How to Get More Interviews in Melbourne",
    "Get more interview invitations in Melbourne's competitive job market. Discover local hiring trends, recruiter preferences, and profile optimization strategies.",
    "Job Search",
    Briefcase,
    "/blog/how-to-get-more-interviews-in-melbourne"
  ],
  [
    "How to Get More Interviews in Sydney",
    "Navigate Sydney's corporate job market successfully. Learn about recruiter preferences, key hiring hubs, and profile strategies to get more interviews.",
    "Job Search",
    Briefcase,
    "/blog/how-to-get-more-interviews-in-sydney"
  ],
  [
    "Top LinkedIn Mistakes Job Seekers Make",
    "Avoid the most common LinkedIn mistakes that keep you invisible to recruiters. Learn how to optimize your headline, summary, and settings for recruitment searches.",
    "LinkedIn",
    BookUser,
    "/blog/top-linkedin-mistakes-job-seekers-make"
  ],
  [
    "SEEK Profile Optimization Checklist",
    "Optimize your SEEK profile to attract Australian recruiters. Discover settings configurations, summary writing tips, and sitemap indexing tricks.",
    "SEEK",
    Search,
    "/blog/seek-profile-optimization-checklist"
  ],
  [
    "How Recruiters Find Candidates on LinkedIn",
    "Understand the backend search mechanics of LinkedIn Recruiter. Learn how boolean search, location filters, and profile completeness affect your rankings.",
    "LinkedIn",
    BookUser,
    "/blog/how-recruiters-find-candidates-on-linkedin"
  ],
  [
    "Why Your Resume Gets Rejected in Australia",
    "Discover the most common reasons why resumes get rejected in Australia. Learn about ATS formatting blocks, duty-based lists, and local terminology.",
    "Resume",
    FileText,
    "/blog/why-your-resume-gets-rejected-in-australia"
  ],
  [
    "Jobs in Australia for New Migrants",
    "A comprehensive career guide for new migrants seeking jobs in Australia. Learn about work rights, resume localization, and local interview nuances.",
    "Job Search",
    Briefcase,
    "/blog/jobs-in-australia-for-new-migrants"
  ],
  [
    "Australian Resume vs International Resume",
    "Understand the key differences between Australian resumes and international formats. Discover length rules, personal data exclusions, and localization tips.",
    "Resume",
    FileText,
    "/blog/australian-resume-vs-international-resume"
  ]
];

const routeSeo = getRouteSeo("/blog");
const { getPreferredSocialImage, shouldUseGeneratedPoster } = socialMedia;
const { serializeSocialBlogPost } = serializeSocialBlogPostModule;

export const metadata = createSeoMetadata(routeSeo);

function formatDate(date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function createExcerpt(content) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  return text.length > 145 ? `${text.slice(0, 142).trim()}...` : text;
}

function getSocialCardImage(post) {
  return getPreferredSocialImage(post);
}

function formatUiLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function getSocialBlogPosts() {
  if (!process.env.MONGODB_URI) {
    return [];
  }

  try {
    await connectMongoDB();
    const socialPosts = await SocialBlog.find({ status: "published" })
      .sort({ publishedAt: -1 })
      .limit(12)
      .lean();

    return socialPosts.map((post) => ({
      id: post._id.toString(),
      ...serializeSocialBlogPost(post),
    }));
  } catch (error) {
    console.error("Social blog list failed:", error);
    return [];
  }
}

export default async function BlogPage() {
  const socialPosts = await getSocialBlogPosts();
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
      }
    ]
  };
  const serviceLinks = [
    ["/services/resume-writing", "Resume Writing", "Turn resume advice into an ATS-friendly Australian CV."],
    ["/services/linkedin-optimization", "LinkedIn Optimization", "Use profile guidance to improve recruiter discovery."],
    ["/services/seek-profile-optimization", "SEEK Profile Optimization", "Make SEEK profile recommendations easier to apply."],
    ["/services/interview-coaching", "Interview Coaching", "Convert interview tips into practiced STAR answers."],
  ];

  return (
    <main className="site-main fj-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <section className="fj-page-hero">
        <div className="fj-container">
          <span className="fj-announcement"><span>Blog</span> Career notes that stay practical</span>
          <h1>Small improvements that make applications <span className="heading-mark">stronger.</span></h1>
          <p>Clean advice for resumes, LinkedIn, interviews, targeting, and the habits that keep a job search moving.</p>
        </div>
      </section>

      <section className="fj-section fj-section--tight">
        <div className="fj-container">
          <div className="fj-section-head fj-section-head--social">
            <span className="fj-label">Latest from 9Jobs Social</span>
            <h2>Recent Facebook posts and reels</h2>
            <p>Open the latest 9Jobs social updates, including reels and posts, directly from the website.</p>
            <SyncFeedButton />
          </div>
          <div className="fj-card-grid fj-card-grid--three">
            {socialPosts.map((post, index) => {
              const cardImage = getSocialCardImage(post);
              const isVideo = post.mediaType === "video";
              const usesGeneratedPoster = shouldUseGeneratedPoster(post);
              return (
                <article 
                  className={`fj-blog-card fj-social-blog-card ${isVideo ? 'fj-social-blog-card--reel' : ''}`} 
                  key={post.id}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className={`fj-social-card-media ${isVideo ? 'fj-social-card-media--reel' : ''}`}
                    aria-label={isVideo ? `Play ${post.title}` : `Open ${post.title}`}
                    prefetch={false}
                  >
                    {cardImage ? (
                      <Image 
                        className={`fj-social-blog-image ${isVideo ? 'fj-social-blog-image--reel' : ''}`} 
                        src={cardImage} 
                        alt={post.title || "Social Post Image"} 
                        width={400}
                        height={500}
                        sizes="(max-width: 768px) 50vw, 33vw"
                        priority={index < 3}
                        style={{ objectFit: "cover" }}
                      />
                    ) : usesGeneratedPoster ? (
                      <SocialMediaPoster post={post} compact />
                    ) : (
                      <div className={`fj-social-blog-image fj-social-blog-image--empty ${isVideo ? 'fj-social-blog-image--reel' : ''}`} aria-hidden="true">
                        <span>{isVideo ? "Video" : "Post"}</span>
                      </div>
                    )}
                    {isVideo && (
                      <span className="fj-social-play-badge" aria-hidden="true">
                        <Play size={18} fill="currentColor" />
                      </span>
                    )}
                  </Link>
                  <div className="fj-social-blog-meta">
                    <span className="fj-badge">{formatUiLabel(post.platform === "linkedin" ? "LinkedIn" : "Facebook")}</span>
                    <span className="fj-badge fj-badge--ghost">{isVideo ? "Reel" : "Post"}</span>
                    <time dateTime={new Date(post.publishedAt).toISOString()}>{formatDate(post.publishedAt)}</time>
                  </div>
                  <h2>{post.title}</h2>
                  <p>{createExcerpt(post.content)}</p>
                  <Link href={`/blog/${post.slug}`} aria-label={isVideo ? `Open Reel about ${post.title}` : `Open Post about ${post.title}`}>Open {isVideo ? "Reel" : "Post"} <ArrowRight size={16} /></Link>
                </article>
              );
            })}
          {posts.map(([title, text, tag, Icon, href]) => (
            <article className="fj-blog-card" key={title}>
              <div className="fj-icon-chip"><Icon size={22} /></div>
              <span className="fj-badge">{tag}</span>
              <h2>{title}</h2>
              <p>{text}</p>
              <Link href={href} aria-label={`Read Article: ${title}`}>Read Article <ArrowRight size={16} /></Link>
            </article>
          ))}
          </div>
        </div>
      </section>

      <section className="fj-section">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Australian Cities Sourcing Guides</span>
            <h2>Local Sourcing Opportunities</h2>
            <p>Target localized job markets across Australia&apos;s major hubs with tailored profiles, resumes, and networks.</p>
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

      <section className="fj-section fj-section--muted">
        <div className="fj-container">
          <div className="fj-section-head">
            <span className="fj-label">Turn advice into action</span>
            <h2>Explore 9Jobs career services</h2>
            <p>Use the blog guides with hands-on help for resumes, profiles, applications, and interviews.</p>
          </div>
          <div className="fj-card-grid fj-card-grid--four">
            {serviceLinks.map(([href, title, text]) => (
              <article className="fj-feature-card" key={href}>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link href={href} className="fj-button fj-button--ghost" aria-label={`Explore ${title} services`} style={{ marginTop: "auto", minHeight: "40px", fontSize: "0.82rem" }}>Explore <ArrowRight size={14} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fj-section fj-section--tight">
        <div className="fj-container fj-final-cta">
          <BookOpen size={28} />
          <h2>Want help applying the <span className="heading-mark">advice?</span></h2>
          <p>Send your goals to 9Jobs and we will help shape a practical next step.</p>
          <Link className="fj-button fj-button--dark" href="/contact">
            Contact us
          </Link>
        </div>
      </section>
    </main>
  );
}
