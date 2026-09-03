const CTA = 'Need help with jobs, interviews, or career guidance in Australia? Contact 9Jobs today.';

function compactWhitespace(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function trimToLength(text, maxLength = 80) {
  if (text.length <= maxLength) {
    return text;
  }

  const trimmed = text.slice(0, maxLength - 3);
  const lastSpace = trimmed.lastIndexOf(' ');
  return `${trimmed.slice(0, lastSpace > 40 ? lastSpace : trimmed.length).trim()}...`;
}

function cleanCaption(caption) {
  const cleaned = compactWhitespace(caption);
  const hashtagMatches = cleaned.match(/#[\p{L}\p{N}_]+/gu) || [];

  if (hashtagMatches.length <= 3) {
    return cleaned;
  }

  let kept = 0;
  return cleaned
    .replace(/#[\p{L}\p{N}_]+/gu, (match) => {
      kept += 1;
      return kept <= 3 ? match : '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function createTitleFromCaption(caption) {
  const firstLine = String(caption || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  const cleaned = cleanCaption(firstLine || 'Social update from 9Jobs').replace(/\s*#[\p{L}\p{N}_]+/gu, '').trim();
  return trimToLength(cleaned || 'Social update from 9Jobs');
}

function createSlug(text) {
  const slug = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'social-update';
}



function stripEmojis(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

function normalizeSocialPostToBlog(post) {
  const rawTitle = createTitleFromCaption(post.caption);
  const title = stripEmojis(rawTitle);
  const slug = createSlug(`${title}-${post.platform}-${post.socialPostId}`);
  
  // Maintain line breaks, carriage returns, spacing, but strip all emojis in content.
  const captionBody = post.caption ? String(post.caption).trim() : '';
  const rawContent = captionBody ? `${captionBody}\n\n${CTA}` : CTA;
  const content = stripEmojis(rawContent);

  return {
    platform: post.platform,
    socialPostId: String(post.socialPostId),
    title,
    slug,
    content,
    mediaType: post.mediaType === 'video' ? 'video' : 'post',
    imageUrl: post.imageUrl || '',
    thumbnailUrl: post.thumbnailUrl || '',
    videoUrl: post.videoUrl || '',
    sourceUrl: post.sourceUrl || '',
    status: 'published',
    publishedAt: post.publishedAt ? new Date(post.publishedAt) : new Date(),
  };
}

module.exports = {
  CTA,
  cleanCaption,
  createSlug,
  createTitleFromCaption,
  normalizeSocialPostToBlog,
};
