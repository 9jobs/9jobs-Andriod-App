'use server';

import { revalidatePath } from 'next/cache';
import connectMongoDB from '@/lib/mongodb';
import { normalizeSocialPostToBlog } from '@/lib/blog/normalizeSocialPost';
import { fetchFacebookPosts } from '@/lib/social/facebook';
import { fetchLinkedInPosts } from '@/lib/social/linkedin';
import SocialBlog from '@/models/SocialBlog';

export async function importSocialPostsAction() {
  const errors = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    await connectMongoDB();

    let facebookPosts = [];
    try {
      facebookPosts = await fetchFacebookPosts();
    } catch (fbError) {
      console.error('Facebook fetch failed:', fbError);
      errors.push({ platform: 'facebook', message: fbError.message });
    }

    let linkedInPosts = [];
    try {
      linkedInPosts = await fetchLinkedInPosts();
    } catch (liError) {
      console.error('LinkedIn fetch failed:', liError);
      errors.push({ platform: 'linkedin', message: liError.message });
    }

    const posts = [...facebookPosts, ...linkedInPosts];

    for (const post of posts) {
      const normalized = normalizeSocialPostToBlog(post);

      const existing = await SocialBlog.findOne({
        platform: normalized.platform,
        socialPostId: normalized.socialPostId,
      }).lean();

      if (existing) {
        // Update the database if fields have changed or are now high-resolution
        const needsUpdate =
          existing.videoUrl !== normalized.videoUrl ||
          existing.thumbnailUrl !== normalized.thumbnailUrl ||
          existing.imageUrl !== normalized.imageUrl ||
          existing.content !== normalized.content;

        if (needsUpdate) {
          await SocialBlog.updateOne(
            { _id: existing._id },
            {
              $set: {
                videoUrl: normalized.videoUrl || existing.videoUrl,
                thumbnailUrl: normalized.thumbnailUrl || existing.thumbnailUrl,
                imageUrl: normalized.imageUrl || existing.imageUrl,
                content: normalized.content,
                mediaType: normalized.mediaType,
              },
            }
          );
          updated += 1;
          revalidatePath('/blog');
          revalidatePath(`/blog/${existing.slug}`);
        } else {
          skipped += 1;
        }
        continue;
      }

      try {
        const created = await SocialBlog.create(normalized);
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

    return {
      success: true,
      inserted,
      updated,
      skipped,
      errors,
    };
  } catch (error) {
    console.error('Import action failed:', error);
    return {
      success: false,
      inserted,
      updated,
      skipped,
      errors: [...errors, { platform: 'database', message: error.message }],
    };
  }
}
