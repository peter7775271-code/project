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
  id: string;
  topic: string;
  subtopic: string;
  dot_point_text: string;
  dot_point_code: string | null;
  sort_order: number | null;
};

type AllowedDotPoint = {
  id: string;
  topic: string;
  subtopic: string;
  content: string;
};

type ModelMappingResult = {
  subtopic_name: string;
  relevant_dot_points: Array<{ id: string; content: string }>;
};

type ModelMappingResponse = {
  mapping_results: ModelMappingResult[];
  reasoning_summary: string;
};

const extractContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textParts = content
      .filter((part: any) => part?.type === 'text')
      .map((part: any) => {
        if (typeof part?.text === 'string') return part.text;
        if (part?.text?.value) return String(part.text.value);
        return '';
      })
      .filter(Boolean);

    if (textParts.length > 0) return textParts.join('\n');

    return JSON.stringify(content);
  }
  return content == null ? '' : String(content);
};

const parseModelSelection = (raw: string): ModelMappingResponse | null => {
  if (!raw.trim()) return null;

  const tryParse = (value: string) => {
    try {
      const parsed = JSON.parse(value) as Partial<ModelMappingResponse>;
      if (!parsed || !Array.isArray(parsed.mapping_results)) return null;

      const normalizedResults = parsed.mapping_results
        .map((item) => {
          const subtopic_name = String(item?.subtopic_name || '').trim();
          const relevant_dot_points = Array.isArray(item?.relevant_dot_points)
            ? item!.relevant_dot_points
                .map((dot) => ({
                  id: String(dot?.id ?? '').trim(),
                  content: String(dot?.content ?? '').trim(),
                }))
                .filter((dot) => Boolean(dot.id) && Boolean(dot.content))
            : [];

          if (!subtopic_name || relevant_dot_points.length === 0) return null;

          return {
            subtopic_name,
            relevant_dot_points,
          };
        })
        .filter((item): item is ModelMappingResult => Boolean(item));

      return {
        mapping_results: normalizedResults,
        reasoning_summary: String(parsed.reasoning_summary || '').trim(),
      };
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
    const includeDebug = body?.debug === true;

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

    const callMappingModel = async (messages: Array<{ role: 'system' | 'user'; content: string }>, strictJson: boolean) => {
      const response = await openai.chat.completions.create({
        model,
        messages,
        max_completion_tokens: 2000,
        ...(strictJson
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'syllabus_mapping',
                  strict: true,
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      mapping_results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            subtopic_name: { type: 'string' },
                            relevant_dot_points: {
                              type: 'array',
                              items: {
                                type: 'object',
                                additionalProperties: false,
                                properties: {
                                  id: { type: 'string' },
                                  content: { type: 'string' },
                                },
                                required: ['id', 'content'],
                              },
                            },
                          },
                          required: ['subtopic_name', 'relevant_dot_points'],
                        },
                      },
                      reasoning_summary: { type: 'string' },
                    },
                    required: ['mapping_results', 'reasoning_summary'],
                  },
                },
              },
            }
          : {}),
      } as any);

      const firstChoice = response.choices?.[0];
      const firstMessage = firstChoice?.message;
      const refusalText = firstMessage?.refusal ? String(firstMessage.refusal) : '';
      const contentText = extractContent(firstMessage?.content).trim();
      const fallbackMessageJson = firstMessage ? JSON.stringify(firstMessage) : '';
      const fallbackChoiceJson = firstChoice ? JSON.stringify(firstChoice) : '';
      const raw = (contentText || refusalText || fallbackMessageJson || fallbackChoiceJson).trim();
      const selection = parseModelSelection(raw);

      return {
        raw,
        selection,
      };
    };

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

    const { data: dotPointRows, error: dotPointError } = await supabaseAdmin
      .from('syllabus_taxonomy')
      .select('id, topic, subtopic, dot_point_text, dot_point_code, sort_order')
      .eq('grade', grade)
      .eq('subject', subject)
      .order('sort_order', { ascending: true });

    if (dotPointError) {
      return NextResponse.json(
        { error: `Failed to load syllabus dot points: ${dotPointError.message}` },
        { status: 500 }
      );
    }

    const taxonomyRows: AllowedDotPoint[] = (Array.isArray(dotPointRows) ? (dotPointRows as DotPointRow[]) : [])
      .map((row) => ({
        id: String(row.id || '').trim(),
        topic: String(row.topic || '').trim(),
        subtopic: String(row.subtopic || '').trim(),
        content: String(row.dot_point_text || '').trim(),
      }))
      .filter((row) => Boolean(row.id) && Boolean(row.topic) && Boolean(row.subtopic) && Boolean(row.content));

    if (!taxonomyRows.length) {
      return NextResponse.json(
        { error: 'No syllabus taxonomy rows found for this grade and subject.' },
        { status: 404 }
      );
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failures: Array<{ questionId: string; questionNumber: string | null; reason: string }> = [];
    const debugOutputs: Array<{
      questionId: string;
      questionNumber: string | null;
      topic: string;
      reason: string;
      rawModelOutput: string | null;
      parsedModelOutput: ModelMappingResponse | null;
      allowedContextSize: number;
    }> = [];

    for (const question of questionRows) {
      const topic = String(question.topic || '').trim();
      if (!topic) {
        skipped += 1;
        continue;
      }

      const topicLower = topic.toLowerCase();
      const allowed = taxonomyRows.filter((row) => row.topic.toLowerCase().includes(topicLower));
      if (!allowed.length) {
        skipped += 1;
        failures.push({
          questionId: question.id,
          questionNumber: question.question_number,
          reason: `No syllabus topic match found via substring search for topic "${topic}"`,
        });
        continue;
      }

      const questionLatex = String(question.question_text || '').trim();
      if (!questionLatex) {
        skipped += 1;
        continue;
      }

      const buildMessages = (allowedContext: AllowedDotPoint[]) => [
        {
          role: 'system' as const,
          content:
            'You map NSW exam questions to syllabus taxonomy entries. A single question can map to multiple dot points across different subtopics. Return STRICT JSON only, matching the required schema exactly. Do not include markdown. If there is no valid mapping in the provided context, return {"mapping_results":[],"reasoning_summary":"..."}.',
        },
        {
          role: 'user' as const,
          content: [
            `Grade: ${grade}`,
            `Subject: ${subject}`,
            `Topic: ${topic}`,
            `Question Number: ${question.question_number || 'Unknown'}`,
            '',
            'Task:',
            '- Analyze the raw LaTeX question.',
            '- Identify EVERY relevant subtopic and specific syllabus dot point.',
            '- A question may map to MULTIPLE dot points across different subtopics.',
            '',
            'Question LaTeX:',
            questionLatex,
            '',
            'Filtered Syllabus Context (topic substring match):',
            ...Array.from(new Set(allowedContext.map((a) => a.subtopic))).map((subtopic) => {
              const dots = allowedContext
                .filter((a) => a.subtopic === subtopic)
                .map((a) => `  - id: ${a.id} | content: ${a.content}`);
              return `- ${subtopic}\n${dots.join('\n')}`;
            }),
            '',
            'Required JSON schema:',
            '{',
            '  "mapping_results": [',
            '    {',
            '      "subtopic_name": "String",',
            '      "relevant_dot_points": [',
            '        {"id": "String/Int", "content": "String"}',
            '      ]',
            '    }',
            '  ],',
            '  "reasoning_summary": "Short explanation of the mapping logic."',
            '}',
            '',
            'Important: If nothing matches from the provided context, return:',
            '{"mapping_results":[],"reasoning_summary":"No relevant dot points in filtered context."}',
          ].join('\n'),
        },
      ];

      try {
        const primaryAllowed = allowed.slice(0, 80);
        const fallbackAllowed = allowed.slice(0, 40);

        const primary = await callMappingModel(buildMessages(primaryAllowed), true);
        let raw = primary.raw;
        let selection = primary.selection;

        if (!selection) {
          const secondary = await callMappingModel(buildMessages(fallbackAllowed), false);
          raw = secondary.raw;
          selection = secondary.selection;
        }

        if (!selection) {
          failed += 1;
          if (includeDebug || debugOutputs.length < 10) {
            debugOutputs.push({
              questionId: question.id,
              questionNumber: question.question_number,
              topic,
              reason: 'Model output missing or not valid JSON schema',
              rawModelOutput: raw || null,
              parsedModelOutput: null,
              allowedContextSize: allowed.length,
            });
          }
          failures.push({
            questionId: question.id,
            questionNumber: question.question_number,
            reason: 'Model output missing or not valid JSON schema',
          });
          continue;
        }

        if (selection.mapping_results.length === 0) {
          skipped += 1;
          if (includeDebug || debugOutputs.length < 10) {
            debugOutputs.push({
              questionId: question.id,
              questionNumber: question.question_number,
              topic,
              reason: selection.reasoning_summary || 'No relevant dot points in filtered context',
              rawModelOutput: raw || null,
              parsedModelOutput: selection,
              allowedContextSize: allowed.length,
            });
          }
          continue;
        }

        const allowedKey = (row: AllowedDotPoint) => `${row.subtopic}|||${row.id}|||${row.content}`;
        const allowedSet = new Set(allowed.map(allowedKey));

        const validMappings = selection.mapping_results
          .map((result) => {
            const validDots = result.relevant_dot_points.filter((dot) =>
              allowedSet.has(`${result.subtopic_name}|||${String(dot.id)}|||${dot.content}`)
            );

            if (validDots.length === 0) return null;

            return {
              subtopic_name: result.subtopic_name,
              relevant_dot_points: validDots,
            };
          })
          .filter((result): result is ModelMappingResult => Boolean(result));

        if (validMappings.length === 0) {
          skipped += 1;
          if (includeDebug || debugOutputs.length < 10) {
            debugOutputs.push({
              questionId: question.id,
              questionNumber: question.question_number,
              topic,
              reason: 'Model mapping did not match filtered syllabus context',
              rawModelOutput: raw || null,
              parsedModelOutput: selection,
              allowedContextSize: allowed.length,
            });
          }
          failures.push({
            questionId: question.id,
            questionNumber: question.question_number,
            reason: 'Model mapping did not match filtered syllabus context',
          });
          continue;
        }

        const uniqueSubtopics = Array.from(new Set(validMappings.map((m) => m.subtopic_name)));
        const uniqueDotPoints = Array.from(
          new Set(validMappings.flatMap((m) => m.relevant_dot_points.map((dot) => dot.content)))
        );

        const subtopicValue = uniqueSubtopics.join(' | ');
        const dotPointValue = uniqueDotPoints.join(' || ');

        const { error: updateError } = await supabaseAdmin
          .from('hsc_questions')
          .update({ subtopic: subtopicValue, syllabus_dot_point: dotPointValue })
          .eq('id', question.id);

        if (updateError) {
          failed += 1;
          if (includeDebug || debugOutputs.length < 10) {
            debugOutputs.push({
              questionId: question.id,
              questionNumber: question.question_number,
              topic,
              reason: `DB update failed: ${updateError.message}`,
              rawModelOutput: raw || null,
              parsedModelOutput: selection,
              allowedContextSize: allowed.length,
            });
          }
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
        if (includeDebug || debugOutputs.length < 10) {
          debugOutputs.push({
            questionId: question.id,
            questionNumber: question.question_number,
            topic,
            reason: message,
            rawModelOutput: null,
            parsedModelOutput: null,
            allowedContextSize: allowed.length,
          });
        }
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
      debug_model_outputs: includeDebug ? debugOutputs : debugOutputs.slice(0, 3),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to map syllabus dot points';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
