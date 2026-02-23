import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/db';

export const runtime = 'nodejs';

type QuestionRow = {
  id: string;
  topic: string | null;
  question_text: string | null;
  question_number: string | null;
};

type DotPointRow = {
  topic: string;
  subtopic: string;
  dot_point_text: string;
  dot_point_code: string | null;
  sort_order: number | null;
};

const extractContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textPart = content.find((part: any) => part?.type === 'text');
    return textPart?.text ? String(textPart.text) : '';
  }
  return content == null ? '' : String(content);
};

const parseModelSelection = (raw: string): { subtopic: string, dot_point: string } | null => {
  if (!raw.trim()) return null;

  const tryParse = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed?.subtopic && parsed?.dot_point) {
        return { subtopic: String(parsed.subtopic).trim(), dot_point: String(parsed.dot_point).trim() };
      }
      return null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(raw);
  if (direct) return direct;

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return tryParse(jsonMatch[0]);
};

const normalizeSchool = (value: unknown) => {
  const text = String(value || '').trim();
  return text || 'HSC';
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const grade = String(body?.grade || '').trim();
    const year = Number.parseInt(String(body?.year || ''), 10);
    const subject = String(body?.subject || '').trim();
    const school = normalizeSchool(body?.school);

    if (!grade || !subject || Number.isNaN(year)) {
      return NextResponse.json(
        { error: 'grade, year, subject, and school are required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY server configuration' },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_SYLLABUS_DOT_POINT_MODEL || 'gpt-5-mini';
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('hsc_questions')
      .select('id, topic, question_text, question_number')
      .match({
        grade,
        year,
        subject,
        school_name: school,
      })
      .order('question_number', { ascending: true });

    if (questionsError) {
      return NextResponse.json(
        { error: `Failed to load questions: ${questionsError.message}` },
        { status: 500 }
      );
    }

    const questionRows: QuestionRow[] = Array.isArray(questions) ? questions : [];
    if (!questionRows.length) {
      return NextResponse.json(
        { error: 'No questions found for this exam selection.' },
        { status: 404 }
      );
    }

    const topics = Array.from(
      new Set(
        questionRows
          .map((q) => String(q.topic || '').trim())
          .filter(Boolean)
      )
    );

    if (!topics.length) {
      return NextResponse.json(
        { error: 'No topics found on selected exam questions.' },
        { status: 400 }
      );
    }

    const { data: dotPointRows, error: dotPointError } = await supabaseAdmin
      .from('syllabus_taxonomy')
      .select('topic, subtopic, dot_point_text, dot_point_code, sort_order')
      .eq('grade', grade)
      .eq('subject', subject)
      .in('topic', topics)
      .order('sort_order', { ascending: true });

    if (dotPointError) {
      return NextResponse.json(
        { error: `Failed to load syllabus dot points: ${dotPointError.message}` },
        { status: 500 }
      );
    }

    const byTopic = new Map<string, { subtopic: string, dotPoint: string }[]>();
    (Array.isArray(dotPointRows) ? (dotPointRows as DotPointRow[]) : []).forEach((row) => {
      const topic = String(row.topic || '').trim();
      const subtopic = String(row.subtopic || '').trim();
      const dotPoint = String(row.dot_point_text || '').trim();
      if (!topic || !subtopic || !dotPoint) return;
      if (!byTopic.has(topic)) byTopic.set(topic, []);
      byTopic.get(topic)!.push({ subtopic, dotPoint });
    });

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failures: Array<{ questionId: string; questionNumber: string | null; reason: string }> = [];

    for (const question of questionRows) {
      const topic = String(question.topic || '').trim();
      const allowed = byTopic.get(topic) || [];
      if (!topic || !allowed.length) {
        skipped += 1;
        continue;
      }

      const questionLatex = String(question.question_text || '').trim();
      if (!questionLatex) {
        skipped += 1;
        continue;
      }

      const messages = [
        {
          role: 'system' as const,
          content:
            'You classify NSW exam questions into syllabus dot points. Identify the most relevant Subtopic first, then select the specific dot point within that subtopic. Return strict JSON format: { "subtopic": string, "dot_point": string }. Both must exactly match the provided lists.',
        },
        {
          role: 'user' as const,
          content: [
            `Grade: ${grade}`,
            `Subject: ${subject}`,
            `Topic: ${topic}`,
            `Question Number: ${question.question_number || 'Unknown'}`,
            'Question LaTeX:',
            questionLatex,
            '',
            'Allowed Subtopics and Syllabus Dot Points:',
            ...Array.from(new Set(allowed.map(a => a.subtopic))).map(subtopic => {
              const dots = allowed.filter(a => a.subtopic === subtopic).map(a => `  - ${a.dotPoint}`);
              return `- ${subtopic}\n${dots.join('\n')}`;
            }),
            '',
            'Output format:',
            '{"subtopic":"<exactly one subtopic>","dot_point":"<exactly one syllabus dot point>"}',
          ].join('\n'),
        },
      ];

      try {
        const response = await openai.chat.completions.create({
          model,
          messages,
          max_completion_tokens: 350,
        });

        const raw = extractContent(response.choices?.[0]?.message?.content).trim();
        const selection = parseModelSelection(raw);

        const isValidSelection = selection && allowed.some(a => a.subtopic === selection.subtopic && a.dotPoint === selection.dot_point);

        if (!isValidSelection) {
          failed += 1;
          failures.push({
            questionId: question.id,
            questionNumber: question.question_number,
            reason: 'Model output missing or not in allowed list',
          });
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from('hsc_questions')
          .update({ subtopic: selection.subtopic, syllabus_dot_point: selection.dot_point })
          .eq('id', question.id);

        if (updateError) {
          failed += 1;
          failures.push({
            questionId: question.id,
            questionNumber: question.question_number,
            reason: `DB update failed: ${updateError.message}`,
          });
          continue;
        }

        updated += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown model error';
        failed += 1;
        failures.push({
          questionId: question.id,
          questionNumber: question.question_number,
          reason: message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      model,
      exam: { grade, year, subject, school },
      totals: {
        questions: questionRows.length,
        updated,
        skipped,
        failed,
      },
      failures: failures.slice(0, 50),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to map syllabus dot points';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
