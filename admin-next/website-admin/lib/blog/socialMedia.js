function isLowResImportedImage(value) {
  return typeof value === 'string' && value.startsWith('/social-imports/');
}

function getGeneratedPreviewVideoUrl(post = {}) {
  if (post.mediaType !== 'video') {
    return '';
  }

  const candidate = post.imageUrl || post.thumbnailUrl || '';
  if (!isLowResImportedImage(candidate) || !candidate.endsWith('.jpg')) {
    if (post.publishedAt) {
      try {
        const dateStr = new Date(post.publishedAt).toISOString().split('T')[0];
        return `/social-imports/${dateStr}-reel.mp4`;
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  return candidate.replace(/\.jpg$/i, '.mp4');
}

function getInlineVideoSrc(post = {}) {
  return post.videoUrl || getGeneratedPreviewVideoUrl(post) || '';
}

function getPlayableMediaHref(post = {}) {
  if (post.mediaType === 'video') {
    const inlineVideoSrc = getInlineVideoSrc(post);
    if (inlineVideoSrc) {
      return inlineVideoSrc;
    }

    if (post.platform === 'facebook' && post.socialPostId) {
      return `https://www.facebook.com/reel/${post.socialPostId}`;
    }

    return post.sourceUrl || '';
  }

  return post.sourceUrl || '';
}

function getFacebookEmbedUrl(post = {}) {
  if (post.platform !== 'facebook' || post.mediaType !== 'video' || getInlineVideoSrc(post)) {
    return '';
  }

  const reelUrl = post.sourceUrl && post.sourceUrl.includes('/reel/')
    ? post.sourceUrl
    : post.socialPostId
      ? `https://www.facebook.com/reel/${post.socialPostId}`
      : '';

  if (!reelUrl) {
    return '';
  }

  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(reelUrl)}&show_text=false&width=1280`;
}

const LOCAL_IMPORTED_IMAGES = new Set([
  '2026-06-16-reel.jpg',
  '2026-06-15-post.jpg',
  '2026-06-14-reel.jpg',
  '2026-06-13-reel.jpg',
  '2026-06-10-post.jpg',
  '2026-06-08-reel.jpg',
  '2026-06-06-post.jpg',
  '2026-06-05-post.jpg',
  '2026-06-03-reel.jpg',
  '2026-06-02-reel.jpg'
]);

function getPreferredSocialImage(post = {}) {
  const imageUrl = post.imageUrl || '';
  const thumbnailUrl = post.thumbnailUrl || '';

  if (imageUrl && !isLowResImportedImage(imageUrl)) {
    if (post.publishedAt) {
      try {
        const dateStr = new Date(post.publishedAt).toISOString().split('T')[0];
        const typeStr = post.mediaType === 'video' ? 'reel' : 'post';
        const localFilename = `${dateStr}-${typeStr}.jpg`;

        if (LOCAL_IMPORTED_IMAGES.has(localFilename)) {
          return `/social-imports/${localFilename}`;
        }
      } catch (e) {
        // Ignore
      }
    }
    return imageUrl;
  }

  if (thumbnailUrl && !isLowResImportedImage(thumbnailUrl)) {
    if (post.publishedAt) {
      try {
        const dateStr = new Date(post.publishedAt).toISOString().split('T')[0];
        const typeStr = post.mediaType === 'video' ? 'reel' : 'post';
        const localFilename = `${dateStr}-${typeStr}.jpg`;

        if (LOCAL_IMPORTED_IMAGES.has(localFilename)) {
          return `/social-imports/${localFilename}`;
        }
      } catch (e) {
        // Ignore
      }
    }
    return thumbnailUrl;
  }

  return '';
}

function shouldUseGeneratedPoster(post = {}) {
  return !getPreferredSocialImage(post) && (Boolean(post.imageUrl) || Boolean(post.thumbnailUrl));
}

function shouldOpenMediaExternally(post = {}) {
  return post.mediaType === 'video' && !getInlineVideoSrc(post) && Boolean(post.sourceUrl);
}

function shouldShowOriginalMediaLink(post = {}) {
  if (getInlineVideoSrc(post)) {
    return false;
  }

  return Boolean(getPlayableMediaHref(post)) && !getFacebookEmbedUrl(post);
}

module.exports = {
  getFacebookEmbedUrl,
  getGeneratedPreviewVideoUrl,
  getInlineVideoSrc,
  getPreferredSocialImage,
  getPlayableMediaHref,
  isLowResImportedImage,
  shouldOpenMediaExternally,
  shouldShowOriginalMediaLink,
  shouldUseGeneratedPoster,
};
