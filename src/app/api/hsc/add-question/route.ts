import { supabaseAdmin } from '@/lib/db';

export async function POST(request: Request) {
  try {

    const body = await request.json();
    const { grade, year, subject, topic, marks, questionNumber, questionText, markingCriteria, sampleAnswer, graphImageData, graphImageSize } = body;

    // Validate required fields
    if (!grade || !year || !subject || !topic || !marks || !questionText) {
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
          question_number: questionNumber || null,
          question_text: questionText,
          marking_criteria: markingCriteria || null,
          sample_answer: sampleAnswer || null,
          graph_image_data: graphImageData || null,
          graph_image_size: graphImageSize || 'medium',
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
