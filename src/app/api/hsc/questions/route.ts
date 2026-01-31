import { supabaseAdmin } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const grade = searchParams.get('grade');
    const year = searchParams.get('year');
    const subject = searchParams.get('subject');
    const topic = searchParams.get('topic');

    // Build query with filters
    let query = supabaseAdmin.from('hsc_questions').select('*');

    if (grade) {
      query = query.eq('grade', grade);
    }
    if (year) {
      query = query.eq('year', parseInt(year));
    }
    if (subject) {
      query = query.eq('subject', subject);
    }
    if (topic) {
      query = query.eq('topic', topic);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[questions] Supabase error:', error.message, error.code);
      return NextResponse.json(
        { error: 'Failed to fetch questions', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No questions found matching filters', filters: { grade, year, subject, topic } },
        { status: 404 }
      );
    }

    // Return a random question from filtered results
    const randomQuestion = data[Math.floor(Math.random() * data.length)];
    
    return NextResponse.json({ question: randomQuestion });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
