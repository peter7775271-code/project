import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      questionText, 
      markingCriteria, 
      sampleAnswer, 
      maxMarks,
      userAnswerImage,
      answerQualityHint
    } = body;

    if (!questionText || !markingCriteria || !sampleAnswer || !userAnswerImage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (answerQualityHint === 'low_ink') {
      return NextResponse.json({
        success: true,
        evaluation: `Marks Awarded: 0/${maxMarks}
Reasoning: The response appears blank or contains only minimal/illegible scribbles, so no valid working can be identified.
1. No readable steps were provided to assess against the marking criteria.`,
      });
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
If the student's response is blank, illegible, or only contains random scribbles with no meaningful working, you must award 0 marks and state that no valid working was detected. Do not award full marks unless all criteria are clearly satisfied. Do not infer steps that are not explicitly shown in the student's work.

Use this format for your response:

Marks Awarded: X/${maxMarks}
Reasoning: [Brief explanation of why the student received this mark]
1. [First error or point of improvement, if any]
2. [Second error or point of improvement, if any]
3. [Additional points as needed]

If the student's answer is correct or nearly correct, you can omit the numbered list and just provide positive feedback in the reasoning section. Always wrap mathematical expressions in $ signs.`;

    const xaiApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (!xaiApiKey) {
      return NextResponse.json(
        { error: 'Missing XAI_API_KEY (or GROK_API_KEY) server configuration' },
        { status: 500 }
      );
    }

    const callVisionModel = async (model: string) => {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${xaiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: userAnswerImage,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          // xAI is OpenAI-compatible; this maps to output token cap
          max_tokens: 2000,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`xAI API error ${res.status}: ${text || res.statusText}`);
      }

      return (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
    };

    const primaryModel = process.env.GROK_MARK_MODEL || 'grok-4';
    const fallbackModel = process.env.GROK_MARK_MODEL_FALLBACK || 'grok-4-latest';

    let response;
    try {
      response = await callVisionModel(primaryModel);
    } catch (err) {
      console.warn(`Primary model failed, retrying with ${fallbackModel}:`, err);
      response = await callVisionModel(fallbackModel);
    }

    const aiEvaluation = response.choices?.[0]?.message?.content || '';

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
