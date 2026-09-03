import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink, Play } from 'lucide-react';
import { notFound } from 'next/navigation';
import connectMongoDB from '@/lib/mongodb';
import SocialBlog from '@/models/SocialBlog';
import SocialMediaPoster from '@/components/SocialMediaPoster';
import ReelPlayer from '@/components/ReelPlayer';
import SocialCaption from '@/components/SocialCaption';
import socialMedia from '@/lib/blog/socialMedia';
import serializeSocialBlogPostModule from '@/lib/blog/serializeSocialBlogPost';
import { BlogSupportLinks } from '../../../components/RelatedSeoLinks';
import { JsonLd, createArticleSchema, createBreadcrumbSchema, createSeoMetadata } from '../../../data/seo';

export const dynamic = 'force-dynamic';
const {
  getFacebookEmbedUrl,
  getInlineVideoSrc,
  getPlayableMediaHref,
  getPreferredSocialImage,
  shouldOpenMediaExternally,
  shouldShowOriginalMediaLink,
  shouldUseGeneratedPoster,
} = socialMedia;
const { serializeSocialBlogPost } = serializeSocialBlogPostModule;

function formatDate(date) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatUiLabel(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function getSocialBlogPost(slug) {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  try {
    await connectMongoDB();
    const post = await SocialBlog.findOne({ slug, status: 'published' }).lean();
    return post ? serializeSocialBlogPost(post) : null;
  } catch (error) {
    console.error('Social blog lookup failed:', error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getSocialBlogPost(slug);

  if (!post) {
    return {
      title: 'Blog Post | 9 Jobs (9jobs)',
    };
  }

  return {
    ...createSeoMetadata({
      title: `${post.title} | 9 Jobs (9jobs)`,
      description: post.content.slice(0, 155),
      path: `/blog/${post.slug}`,
      type: 'article',
      publishedTime: new Date(post.publishedAt).toISOString(),
      modifiedTime: new Date(post.publishedAt).toISOString(),
    }),
  };
}

export default async function SocialBlogDetailPage({ params }) {
  const { slug } = await params;
  const post = await getSocialBlogPost(slug);

  if (!post) {
    notFound();
  }

  const paragraphs = post.content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const platformLabel = formatUiLabel(post.platform === 'linkedin' ? 'LinkedIn' : 'Facebook');
  const mediaLabel = post.mediaType === 'video' ? 'Reel' : 'Post';
  const mediaImage = getPreferredSocialImage(post);
  const inlineVideoSrc = getInlineVideoSrc(post);
  const embedUrl = getFacebookEmbedUrl(post);
  const usesGeneratedPoster = shouldUseGeneratedPoster(post);
  const playableHref = getPlayableMediaHref(post);
  const openMediaExternally = shouldOpenMediaExternally(post);
  const showOriginalMediaLink = shouldShowOriginalMediaLink(post);
  const description = post.content.slice(0, 155);
  const articleSchema = createArticleSchema({
    title: post.title,
    description,
    path: `/blog/${post.slug}`,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: new Date(post.publishedAt).toISOString(),
  });
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

  return (
    <main className="site-main fj-page">
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={articleSchema} />
      <section className="fj-page-hero">
        <div className="fj-container">
          <Link href="/blog" className="fj-social-back-link">
            <ArrowLeft size={16} /> Back to Blog
          </Link>
          <span className="fj-announcement"><span>Blog</span> {platformLabel} {mediaLabel.toLowerCase()}</span>
          <h1>{post.title}</h1>
          <p>{formatDate(post.publishedAt)} - Published from {platformLabel} as a {mediaLabel.toLowerCase()}</p>
        </div>
      </section>

      <section className="fj-section fj-section--tight">
        <article className={`fj-container fj-social-detail ${post.mediaType === 'video' ? 'fj-social-detail--reel' : ''}`}>
          {post.mediaType === 'video' && inlineVideoSrc ? (
            <ReelPlayer src={inlineVideoSrc} poster={mediaImage} title={post.title} />
          ) : post.mediaType === 'video' && embedUrl ? (
            <div className="fj-social-embed-shell">
              <iframe
                className="fj-social-embed-frame"
                src={embedUrl}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                scrolling="no"
                title={post.title}
              />
            </div>
          ) : mediaImage ? (
            playableHref ? (
              <a
                className="fj-social-detail-media fj-social-detail-media--interactive"
                href={playableHref}
                target={openMediaExternally ? '_blank' : undefined}
                rel={openMediaExternally ? 'noopener noreferrer' : undefined}
                aria-label={post.mediaType === 'video' ? `Play ${post.title}` : `Open ${post.title}`}
              >
                <img className="fj-social-detail-image" src={mediaImage} alt="" loading="lazy" decoding="async" />
                {post.mediaType === 'video' && (
                  <span className="fj-social-play-badge fj-social-play-badge--detail" aria-hidden="true">
                    <Play size={24} fill="currentColor" />
                  </span>
                )}
              </a>
            ) : (
              <div className="fj-social-detail-media">
                <img className="fj-social-detail-image" src={mediaImage} alt="" loading="lazy" decoding="async" />
                {post.mediaType === 'video' && (
                  <span className="fj-social-play-badge fj-social-play-badge--detail" aria-hidden="true">
                    <Play size={24} fill="currentColor" />
                  </span>
                )}
              </div>
            )
          ) : usesGeneratedPoster ? (
            <SocialMediaPoster post={post} />
          ) : post.mediaType === 'video' ? (
            <div className="fj-social-detail-media fj-social-detail-media--empty" aria-hidden="true">
              <span className="fj-social-play-badge fj-social-play-badge--detail">
                <Play size={24} fill="currentColor" />
              </span>
            </div>
          ) : null}

          {/* SocialCaption handles metadata, main text formatting, read more, and CTA callout */}
          <SocialCaption 
            content={post.content} 
            publishedAt={post.publishedAt} 
            platform={post.platform} 
          />

          {showOriginalMediaLink && (
            <a
              className="fj-button fj-button--dark w-full text-center flex justify-center items-center gap-2 mt-4"
              href={playableHref}
              target={openMediaExternally ? '_blank' : undefined}
              rel={openMediaExternally ? 'noopener noreferrer' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                marginTop: '16px'
              }}
            >
              {post.mediaType === 'video' && !post.videoUrl ? 'Play on Facebook' : `Open original ${mediaLabel.toLowerCase()}`} <ExternalLink size={16} />
            </a>
          )}
        </article>
      </section>

      <BlogSupportLinks />

      <section className="fj-section fj-section--tight">
        <div className="fj-container fj-final-cta">
          <span>Career Support</span>
          <h2>Need practical help with your next application?</h2>
          <Link className="fj-button fj-button--dark" href="/contact">
            Contact 9Jobs <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
