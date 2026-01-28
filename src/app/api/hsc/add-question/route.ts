import { supabaseAdmin } from '@/lib/db';

export async function POST(request: Request) {
  try {

    const body = await request.json();
    const { grade, year, subject, topic, marks, questionText, markingCriteria, sampleAnswer } = body;

    // Validate required fields
    if (!grade || !year || !subject || !topic || !marks || !questionText || !markingCriteria || !sampleAnswer) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('hsc_questions')
      .insert([
        {
          grade,
          year: parseInt(year),
          subject,
          topic,
          marks: parseInt(marks),
          question_text: questionText,
          marking_criteria: markingCriteria,
          sample_answer: sampleAnswer,
        },
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { error: 'Failed to add question: ' + error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Question added successfully',
      data,
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
