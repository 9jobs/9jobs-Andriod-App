import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import ServiceFeedback from '@/models/ServiceFeedback';
import { analyzeSentiment } from '@/utils/sentiment';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const data = await request.json();
    const { full_name, overall_satisfaction, experience_message } = data;

    // 1. Validation
    if (!full_name || typeof full_name !== 'string' || full_name.trim() === '') {
      return NextResponse.json({ error: 'Full Name is required.' }, { status: 400 });
    }

    if (
      overall_satisfaction === undefined ||
      overall_satisfaction === null ||
      isNaN(overall_satisfaction) ||
      overall_satisfaction < 1 ||
      overall_satisfaction > 5
    ) {
      return NextResponse.json({ error: 'Overall Satisfaction must be a number between 1 and 5.' }, { status: 400 });
    }

    if (!experience_message || typeof experience_message !== 'string' || experience_message.trim() === '') {
      return NextResponse.json({ error: 'Experience message is required.' }, { status: 400 });
    }

    const cleanName = full_name.trim();
    const rating = Number(overall_satisfaction);
    const cleanMessage = experience_message.trim();

    // 2. Sentiment and Testimonial Classification using utility
    const { sentiment, show_as_testimonial } = analyzeSentiment(rating, cleanMessage);

    await connectDB();

    const feedback = new ServiceFeedback({
      full_name: cleanName,
      overall_satisfaction: rating,
      experience_message: cleanMessage,
      sentiment,
      show_as_testimonial
    });

    await feedback.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Feedback submitted successfully.',
      data: {
        sentiment,
        show_as_testimonial
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error saving client service feedback:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();
    const testimonials = await ServiceFeedback.find({
      sentiment: 'positive',
      show_as_testimonial: true
    }).sort({ created_at: -1 });

    return NextResponse.json({ success: true, data: testimonials }, { status: 200 });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
