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
      questionType,
      mcqOptionA,
      mcqOptionB,
      mcqOptionC,
      mcqOptionD,
      mcqCorrectAnswer,
      mcqExplanation,
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

    const resolvedQuestionType = questionType || 'written';

    if (resolvedQuestionType === 'multiple_choice') {
      if (!mcqOptionA || !mcqOptionB || !mcqOptionC || !mcqOptionD || !mcqCorrectAnswer || !mcqExplanation) {
        return Response.json(
          { error: 'Missing required multiple choice fields' },
          { status: 400 }
        );
      }
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
        question_type: resolvedQuestionType,
        marking_criteria: resolvedQuestionType === 'multiple_choice' ? null : (markingCriteria || null),
        sample_answer: resolvedQuestionType === 'multiple_choice' ? null : (sampleAnswer || null),
        mcq_option_a: resolvedQuestionType === 'multiple_choice' ? mcqOptionA : null,
        mcq_option_b: resolvedQuestionType === 'multiple_choice' ? mcqOptionB : null,
        mcq_option_c: resolvedQuestionType === 'multiple_choice' ? mcqOptionC : null,
        mcq_option_d: resolvedQuestionType === 'multiple_choice' ? mcqOptionD : null,
        mcq_correct_answer: resolvedQuestionType === 'multiple_choice' ? String(mcqCorrectAnswer).toUpperCase() : null,
        mcq_explanation: resolvedQuestionType === 'multiple_choice' ? mcqExplanation : null,
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
