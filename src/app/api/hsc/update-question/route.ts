import { supabaseAdmin } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      questionId,
      grade,
      year,
      schoolName,
      subject,
      topic,
      subtopic,
      syllabusDotPoint,
      marks,
      questionNumber,
      questionText,
      markingCriteria,
      sampleAnswer,
      sampleAnswerImage,
      sampleAnswerImageSize,
      graphImageData,
      graphImageSize,
      questionType,
      mcqOptionA,
      mcqOptionB,
      mcqOptionC,
      mcqOptionD,
      mcqOptionAImage,
      mcqOptionBImage,
      mcqOptionCImage,
      mcqOptionDImage,
      mcqCorrectAnswer,
      mcqExplanation,
    } = body;

    if (!questionId) {
      return Response.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const parsedMarks = Number.parseInt(String(marks), 10);

    if (!grade || !year || !subject || !topic || !questionText) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(parsedMarks) || parsedMarks < 0) {
      return Response.json(
        { error: 'Marks must be a valid non-negative integer' },
        { status: 400 }
      );
    }

    const resolvedQuestionType = questionType || 'written';

    if (resolvedQuestionType === 'multiple_choice') {
      const hasOption = (t: string | undefined, img: string | undefined) => (t && t.trim()) || (img && img.trim());
      if (
        !hasOption(mcqOptionA, mcqOptionAImage) ||
        !hasOption(mcqOptionB, mcqOptionBImage) ||
        !hasOption(mcqOptionC, mcqOptionCImage) ||
        !hasOption(mcqOptionD, mcqOptionDImage) ||
        !mcqCorrectAnswer ||
        !mcqExplanation
      ) {
        return Response.json(
          { error: 'Each MCQ option must have either text or image; correct answer and explanation required' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from('hsc_questions')
      .update({
        grade,
        year: parseInt(year),
        school_name: schoolName?.trim() || null,
        subject,
        topic,
        subtopic: subtopic || null,
        syllabus_dot_point: syllabusDotPoint || null,
        marks: parsedMarks,
        question_number: questionNumber || null,
        question_text: questionText,
        question_type: resolvedQuestionType,
        marking_criteria: resolvedQuestionType === 'multiple_choice' ? null : (markingCriteria || null),
        sample_answer: resolvedQuestionType === 'multiple_choice' ? null : (sampleAnswer || null),
        sample_answer_image: resolvedQuestionType === 'multiple_choice' ? null : (sampleAnswerImage || null),
        sample_answer_image_size: resolvedQuestionType === 'multiple_choice' ? null : (sampleAnswerImageSize || null),
        mcq_option_a: resolvedQuestionType === 'multiple_choice' ? (mcqOptionA || null) : null,
        mcq_option_b: resolvedQuestionType === 'multiple_choice' ? (mcqOptionB || null) : null,
        mcq_option_c: resolvedQuestionType === 'multiple_choice' ? (mcqOptionC || null) : null,
        mcq_option_d: resolvedQuestionType === 'multiple_choice' ? (mcqOptionD || null) : null,
        mcq_option_a_image: resolvedQuestionType === 'multiple_choice' ? (mcqOptionAImage || null) : null,
        mcq_option_b_image: resolvedQuestionType === 'multiple_choice' ? (mcqOptionBImage || null) : null,
        mcq_option_c_image: resolvedQuestionType === 'multiple_choice' ? (mcqOptionCImage || null) : null,
        mcq_option_d_image: resolvedQuestionType === 'multiple_choice' ? (mcqOptionDImage || null) : null,
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
