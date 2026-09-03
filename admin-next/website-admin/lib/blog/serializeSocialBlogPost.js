function serializeSocialBlogPost(post = {}) {
  return {
    socialPostId: post.socialPostId || '',
    title: post.title,
    slug: post.slug,
    content: post.content || '',
    mediaType: post.mediaType || 'post',
    imageUrl: post.imageUrl || '',
    thumbnailUrl: post.thumbnailUrl || '',
    videoUrl: post.videoUrl || '',
    sourceUrl: post.sourceUrl || '',
    platform: post.platform,
    publishedAt: post.publishedAt,
  };
}

module.exports = {
  serializeSocialBlogPost,
};
