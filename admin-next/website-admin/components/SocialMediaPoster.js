function formatUiLabel(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export default function SocialMediaPoster({ post, compact = false }) {
  const platformLabel = formatUiLabel(post.platform === 'linkedin' ? 'LinkedIn' : 'Facebook');
  const mediaLabel = post.mediaType === 'video' ? 'Reel' : 'Post';
  const title = String(post.title || '').trim();

  return (
    <div className={`fj-social-poster${compact ? ' fj-social-poster--compact' : ''}`}>
      <div className="fj-social-poster-grid" aria-hidden="true" />
      <div className="fj-social-poster-inner">
        <div className="fj-social-poster-tags">
          <span>{platformLabel}</span>
          <span>{mediaLabel}</span>
        </div>
        <strong>{title || `9Jobs ${mediaLabel}`}</strong>
        <p>{formatDate(post.publishedAt)}</p>
      </div>
    </div>
  );
}
