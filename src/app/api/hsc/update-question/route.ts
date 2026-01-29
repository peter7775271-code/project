import { supabaseAdmin } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      questionId,
      grade,
      year,
      subject,
      topic,
      marks,
      questionNumber,
      questionText,
      markingCriteria,
      sampleAnswer,
      graphImageData,
      graphImageSize,
    } = body;

    if (!questionId) {
      return Response.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    if (!grade || !year || !subject || !topic || !marks || !questionText) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('hsc_questions')
      .update({
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
      })
      .eq('id', questionId)
      .select();

    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { error: 'Failed to update question: ' + error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Question updated successfully',
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
