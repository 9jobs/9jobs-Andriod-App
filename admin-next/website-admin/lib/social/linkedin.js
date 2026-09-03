function requireLinkedInEnv() {
  const organizationId = process.env.LINKEDIN_ORGANIZATION_ID;
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!organizationId || !accessToken) {
    throw new Error('LINKEDIN_ORGANIZATION_ID and LINKEDIN_ACCESS_TOKEN are required.');
  }

  return { organizationId, accessToken };
}

function buildLinkedInPostUrl(postId) {
  if (!postId) {
    return '';
  }

  return `https://www.linkedin.com/feed/update/${postId}/`;
}

function getLinkedInImageUrl(post) {
  return (
    post?.content?.media?.downloadUrl ||
    post?.content?.media?.url ||
    post?.content?.article?.thumbnail ||
    ''
  );
}

export async function fetchLinkedInPosts() {
  const { organizationId, accessToken } = requireLinkedInEnv();
  const organizationUrn = `urn:li:organization:${organizationId}`;
  const url = new URL(process.env.LINKEDIN_POSTS_ENDPOINT || 'https://api.linkedin.com/rest/posts');

  url.searchParams.set('author', organizationUrn);
  url.searchParams.set('q', 'author');
  url.searchParams.set('count', process.env.LINKEDIN_POST_LIMIT || '10');
  url.searchParams.set('sortBy', 'LAST_MODIFIED');

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Linkedin-Version': process.env.LINKEDIN_VERSION || '202511',
      'X-Restli-Protocol-Version': '2.0.0',
      'X-RestLi-Method': 'FINDER',
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || `LinkedIn API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (payload.elements || [])
    .filter((post) => post.commentary && post.commentary.trim())
    .filter((post) => !post.lifecycleState || post.lifecycleState === 'PUBLISHED')
    .map((post) => ({
      platform: 'linkedin',
      socialPostId: post.id,
      caption: post.commentary,
      imageUrl: getLinkedInImageUrl(post),
      sourceUrl: buildLinkedInPostUrl(post.id),
      publishedAt: post.publishedAt || post.createdAt || post.lastModifiedAt,
    }));
}
