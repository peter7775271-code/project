import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      questionText, 
      markingCriteria, 
      sampleAnswer, 
      maxMarks,
      userAnswerImage 
    } = body;

    if (!questionText || !markingCriteria || !sampleAnswer || !userAnswerImage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the prompt for AI marking
    const prompt = `You are an expert HSC mathematics examiner. Please mark the student's answer based on the provided criteria.

QUESTION:
${questionText}

MARKING CRITERIA:
${markingCriteria}

SAMPLE ANSWER:
${sampleAnswer}

MAX MARKS: ${maxMarks}

Please evaluate the student's handwritten answer in the image and provide your feedback. When writing mathematical expressions, wrap them in single dollar signs $ like this: $x^2 + 3x + 2$.

Use this format for your response:

Marks Awarded: X/${maxMarks}
Reasoning: [Brief explanation of why the student received this mark]
1. [First error or point of improvement, if any]
2. [Second error or point of improvement, if any]
3. [Additional points as needed]

If the student's answer is correct or nearly correct, you can omit the numbered list and just provide positive feedback in the reasoning section. Always wrap mathematical expressions in $ signs.`;

    // Call OpenAI API with vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: userAnswerImage,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const aiEvaluation = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      evaluation: aiEvaluation,
    });

  } catch (error) {
    console.error('Error in AI marking:', error);
    return NextResponse.json(
      { error: 'Failed to mark answer' },
      { status: 500 }
    );
  }
}
