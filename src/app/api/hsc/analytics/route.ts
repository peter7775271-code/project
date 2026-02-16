import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

type TopicStatPayload = {
  topic: string;
  attempts: number;
  scoredAttempts: number;
  earnedMarks: number;
  totalMarks: number;
  accuracy: number | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const topics = Array.isArray(body?.topics) ? (body.topics as TopicStatPayload[]) : [];

    if (!topics.length) {
      return NextResponse.json({ summary: 'No attempts recorded yet.' });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY server configuration' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const messages = [
      {
        role: 'system' as const,
        content:
          'You are an experienced NSW mathematics tutor. Provide a concise improvement summary based only on topic performance. Do not mention any actual questions. Return 4-6 bullet points with actionable advice.',
      },
      {
        role: 'user' as const,
        content: `Topic performance data (JSON):\n${JSON.stringify(topics, null, 2)}`,
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_completion_tokens: 350,
    });

    const summary = response.choices?.[0]?.message?.content?.trim() || '';
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate analytics summary';
    console.error('[analytics] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
