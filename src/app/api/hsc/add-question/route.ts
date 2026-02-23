import { supabaseAdmin } from '@/lib/db';

export async function POST(request: Request) {
  try {

    const body = await request.json();
    const {
      grade,
      year,
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

    // Validate required fields
    if (!grade || !year || !subject || !topic || !marks || !questionText) {
      return Response.json(
        { error: 'Missing required fields' },
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

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('hsc_questions')
      .insert([
        {
          grade,
          year: parseInt(year),
          subject,
          topic,
          subtopic: subtopic || null,
          syllabus_dot_point: syllabusDotPoint || null,
          marks: parseInt(marks),
          question_number: questionNumber || null,
          question_text: questionText,
          question_type: resolvedQuestionType,
          marking_criteria: resolvedQuestionType === 'multiple_choice' ? null : (markingCriteria || null),
          sample_answer: resolvedQuestionType === 'multiple_choice' ? null : (sampleAnswer || null),
          sample_answer_image: resolvedQuestionType === 'multiple_choice' ? null : (sampleAnswerImage || null),
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
