import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import InterviewFeedback from '@/models/InterviewFeedback';
import { analyzeSentiment } from '@/utils/sentiment';

export async function POST(request) {
  try {
    const data = await request.json();
    const { interviewer_name, job_role, overall_rating, experience_message } = data;

    // 1. Validation
    if (!interviewer_name || typeof interviewer_name !== 'string' || interviewer_name.trim() === '') {
      return NextResponse.json({ error: 'Interviewer Name is required.' }, { status: 400 });
    }

    if (!job_role || typeof job_role !== 'string' || job_role.trim() === '') {
      return NextResponse.json({ error: 'Job Role is required.' }, { status: 400 });
    }

    if (
      overall_rating === undefined ||
      overall_rating === null ||
      isNaN(overall_rating) ||
      overall_rating < 1 ||
      overall_rating > 5
    ) {
      return NextResponse.json({ error: 'Overall Rating must be a number between 1 and 5.' }, { status: 400 });
    }

    if (!experience_message || typeof experience_message !== 'string' || experience_message.trim() === '') {
      return NextResponse.json({ error: 'Experience message is required.' }, { status: 400 });
    }

    const cleanName = interviewer_name.trim();
    const cleanRole = job_role.trim();
    const rating = Number(overall_rating);
    const cleanMessage = experience_message.trim();

    // 2. Sentiment analysis and experience eligibility
    const { sentiment, show_as_testimonial } = analyzeSentiment(rating, cleanMessage);
    const show_as_experience = show_as_testimonial; // Map testimonial check to experience check

    await connectDB();

    const feedback = new InterviewFeedback({
      interviewer_name: cleanName,
      job_role: cleanRole,
      overall_rating: rating,
      experience_message: cleanMessage,
      sentiment,
      show_as_experience
    });

    await feedback.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Feedback submitted successfully.',
      data: {
        sentiment,
        show_as_experience
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error saving interview experience feedback:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();
    const experiences = await InterviewFeedback.find({
      sentiment: 'positive',
      show_as_experience: true
    }).sort({ created_at: -1 });

    return NextResponse.json({ success: true, data: experiences }, { status: 200 });
  } catch (error) {
    console.error('Error fetching interview experiences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
