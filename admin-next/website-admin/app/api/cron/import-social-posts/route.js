import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import connectMongoDB from '@/lib/mongodb';
import { normalizeSocialPostToBlog } from '@/lib/blog/normalizeSocialPost';
import { fetchFacebookPosts } from '@/lib/social/facebook';
import { fetchLinkedInPosts } from '@/lib/social/linkedin';
import SocialBlog from '@/models/SocialBlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function fetchPlatformPosts(platform, fetcher, errors) {
  try {
    return await fetcher();
  } catch (error) {
    errors.push({ platform, message: error.message });
    return [];
  }
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const errors = [];
  let inserted = 0;
  let skipped = 0;

  try {
    await connectMongoDB();

    const [facebookPosts, linkedInPosts] = await Promise.all([
      fetchPlatformPosts('facebook', fetchFacebookPosts, errors),
      fetchPlatformPosts('linkedin', fetchLinkedInPosts, errors),
    ]);

    const posts = [...facebookPosts, ...linkedInPosts];

    for (const post of posts) {
      const existing = await SocialBlog.findOne({
        platform: post.platform,
        socialPostId: post.socialPostId,
      }).lean();

      if (existing) {
        skipped += 1;
        continue;
      }

      try {
        const created = await SocialBlog.create(normalizeSocialPostToBlog(post));
        inserted += 1;
        revalidatePath('/blog');
        revalidatePath(`/blog/${created.slug}`);
      } catch (error) {
        if (error.code === 11000) {
          skipped += 1;
        } else {
          errors.push({ platform: post.platform, socialPostId: post.socialPostId, message: error.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        inserted,
        skipped,
        errors: [...errors, { platform: 'database', message: error.message }],
      },
      { status: 500 }
    );
  }
}
