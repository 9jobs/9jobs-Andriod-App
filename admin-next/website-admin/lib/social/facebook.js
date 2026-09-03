const { facebookVisiblePosts } = require('./facebookVisiblePosts');

export async function fetchFacebookPosts() {
  return facebookVisiblePosts.map((post) => ({ ...post }));
}
