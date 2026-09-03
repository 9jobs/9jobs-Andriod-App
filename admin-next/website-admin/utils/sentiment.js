const positiveKeywords = [
  'great', 'good', 'excellent', 'amazing', 'love', 'best', 'awesome', 
  'satisfied', 'satisfaction', 'recommend', 'recommendation', 'appreciate', 
  'appreciation', 'perfect', 'helpful', 'wonderful', 'smooth', 'efficient', 
  'happy', 'glad', 'fantastic', 'nice', 'pleasant', 'superb', 'outstanding'
];

const negativeKeywords = [
  'bad', 'worst', 'poor', 'terrible', 'unhappy', 'disappointed', 'disappointing',
  'complain', 'complaint', 'slow', 'fail', 'failure', 'problem', 'issue', 'broken',
  'difficult', 'hard', 'hate', 'waste', 'frustrated', 'frustration', 'regret'
];

function analyzeSentiment(rating, message) {
  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new Error('Invalid rating');
  }

  const msgLower = (message || '').trim().toLowerCase();
  const hasPositiveIntent = positiveKeywords.some(keyword => msgLower.includes(keyword));
  const hasNegativeComplaint = negativeKeywords.some(keyword => msgLower.includes(keyword));

  let sentiment = 'neutral';
  let show_as_testimonial = false;

  if (ratingNum >= 4) {
    if (hasPositiveIntent && !hasNegativeComplaint) {
      sentiment = 'positive';
      show_as_testimonial = true;
    } else if (hasNegativeComplaint) {
      sentiment = 'negative';
      show_as_testimonial = false;
    } else {
      sentiment = 'neutral';
      show_as_testimonial = false;
    }
  } else if (ratingNum === 3) {
    sentiment = 'neutral';
    show_as_testimonial = false;
  } else {
    sentiment = 'negative';
    show_as_testimonial = false;
  }

  return { sentiment, show_as_testimonial };
}

module.exports = {
  analyzeSentiment,
  positiveKeywords,
  negativeKeywords
};
