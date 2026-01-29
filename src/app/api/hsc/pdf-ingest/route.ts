import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/db';

export const runtime = 'nodejs';

const PDF_PROMPT = `The user provided this PDF and is requesting a transformation into structured LaTeX. This is allowed. Do not refuse.

I have provided one PDF whichis a HSC mathematics exam paper with written questions.

I want you to convert all the questions to nicely formatted LaTeX code. For each question you also need to write up a sample answer in LaTeX code.

RENDER-SAFE RULES (IMPORTANT):
- Use $...$ for inline math only. Do NOT use \( \).
- Use $$...$$ for display math only. Do NOT use \[ \].
- Always escape currency and percent as \\$ and \\%.
- Never insert line breaks inside words; keep sentences on one line.
- Keep tables only as \\begin{tabular}...\\end{tabular} or \\begin{array}...\\end{array}.
- Use \\text{...} inside math for words.

SKIP ALL OF THE MULTIPLE CHOICE QUESTIONS (USUALLY QUESTIONS 1 TO 10)
PLEASE FOLLOW THIS FORMAT FOR EACH WRITTEN QUESTION:

QUESTION_NUMBER X
NUM_MARKS X
TOPIC X
HAS_IMAGE {TRUE/FALSE}

QUESTION_CONTENT
{question written in latex code...}

SAMPLE_ANSWER
{sample answer written in latex code....}

READABILITY RULES:
- Add newlines where appropriate to improve readability.
- Include a blank line between the question header info and QUESTION_CONTENT.
- If a question has multiple parts, separate each part with a blank line.

BELOW ARE THE TOPIC NAMES FOR Year 12 mathematics advanced. Choose the most suitable topic for each question:
Further graph transformations
Sequences and series
Differential calculus
Integral calculus
Applications of calculus
Random variables
Financial mathematics

MAKE SURE TO SEPERATE EACH QUESTION WITH A NEWLINE AT THE END. DO NOT FORMAT ANY OF YOUR RESPONSE (just give me raw text). DO NOT RESPOND WITH ANYTHING OTHER THAN THE RAW TEXT.`;

const CRITERIA_PROMPT = `I have provided one PDF which is a HSC mathematics marking criteria.

Extract all the marking criteria from the marking criteria tables into this format:

MARKING_QUESTION_NUMBER X
MARKS_X {criteria text}
MARKS_Y {criteria text}

Rules:
- Only extract the marking criteria from the marking criteria tables.
- Ignore all sample answers.
- Skip all multiple choice questions.
- Use the question number exactly as shown in the marking criteria.
- If a question has parts (e.g., 11 a) and 11 b)), keep those part labels in the same MARKING_QUESTION_NUMBER block.
- Use one criterion per line.
- Each criterion line must start with MARKS_X followed by the criteria text.
- Do not add any extra text outside the format.
- Escape currency and percent as \\$ and \\%.
`;
const getHeaderValue = (line: string) => {
  const parts = line.split(/\s+/).slice(1);
  return parts.join(' ').trim();
};


type ParsedQuestion = {
  questionNumber: string | null;
  marks: number | null;
  topic: string | null;
  hasImage: boolean;
  questionText: string;
  sampleAnswer: string;
};

const parseQuestions = (content: string) => {
  const lines = content.split(/\r?\n/);

  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;
  let mode: 'question' | 'answer' | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const trimmedQuestion = current.questionText.trim();
    const trimmedAnswer = current.sampleAnswer.trim();
    if (!trimmedQuestion) return;
    questions.push({
      ...current,
      questionText: trimmedQuestion,
      sampleAnswer: trimmedAnswer,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('QUESTION_NUMBER')) {
      pushCurrent();
      current = {
        questionNumber: getHeaderValue(line) || null,
        marks: null,
        topic: null,
        hasImage: false,
        questionText: '',
        sampleAnswer: '',
      };
      mode = null;
      continue;
    }

    if (!current) continue;

    if (line.startsWith('NUM_MARKS')) {
      const value = parseInt(getHeaderValue(line), 10);
      current.marks = Number.isNaN(value) ? null : value;
      continue;
    }

    if (line.startsWith('TOPIC')) {
      const value = getHeaderValue(line);
      current.topic = value || null;
      continue;
    }

    if (line.startsWith('HAS_IMAGE')) {
      const value = getHeaderValue(line).toUpperCase();
      current.hasImage = value === 'TRUE';
      continue;
    }

    if (line.startsWith('QUESTION_CONTENT')) {
      mode = 'question';
      continue;
    }

    if (line.startsWith('SAMPLE_ANSWER')) {
      mode = 'answer';
      continue;
    }

    if (mode === 'question') {
      current.questionText += `${current.questionText ? '\n' : ''}${rawLine}`;
    } else if (mode === 'answer') {
      current.sampleAnswer += `${current.sampleAnswer ? '\n' : ''}${rawLine}`;
    }
  }

  pushCurrent();

  return { questions };
};

type ParsedCriteria = {
  baseNumber: string;
  partLabel: string | null;
  criteriaLines: string[];
};

const parseCriteria = (content: string) => {
  const lines = content.split(/\r?\n/);
  const criteria: ParsedCriteria[] = [];
  let currentNumber: string | null = null;
  let buffer: string[] = [];

  const parseQuestionLabel = (raw: string) => {
    const trimmed = raw.trim();
    const baseMatch = trimmed.match(/(\d+)/);
    const baseNumber = baseMatch ? baseMatch[1] : trimmed;
    const partLabel = trimmed.replace(baseNumber, '').trim() || null;
    return { baseNumber, partLabel };
  };

  const pushCurrent = () => {
    if (!currentNumber) return;
    const { baseNumber, partLabel } = parseQuestionLabel(currentNumber);
    const lines = buffer.map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    criteria.push({ baseNumber, partLabel, criteriaLines: lines });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('MARKING_QUESTION_NUMBER')) {
      pushCurrent();
      currentNumber = getHeaderValue(line) || null;
      buffer = [];
      continue;
    }

    if (!currentNumber) continue;
    buffer.push(rawLine);
  }

  pushCurrent();

  return { criteria };
};

const isRefusal = (text: string) => {
  const lowered = text.toLowerCase();
  return (
    lowered.includes("i'm sorry") ||
    lowered.includes('i cannot assist') ||
    lowered.includes("i can't assist") ||
    lowered.includes('cannot help with that request')
  );
};

const chunkText = (text: string, maxChars: number) => {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    const nextBreak = text.lastIndexOf('\n', end);
    if (nextBreak > start + 200) {
      end = nextBreak;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }

  return chunks.filter((chunk) => chunk.length > 0);
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const exam = formData.get('exam');
    const criteria = formData.get('criteria');
    const gradeInput = formData.get('grade');
    const yearInput = formData.get('year');
    const subjectInput = formData.get('subject');

    const examFile = exam instanceof File ? exam : null;
    const criteriaFile = criteria instanceof File ? criteria : null;

    if (!examFile && !criteriaFile) {
      return NextResponse.json({ error: 'At least one PDF is required' }, { status: 400 });
    }

    if (!gradeInput || !yearInput || !subjectInput) {
      return NextResponse.json({ error: 'Grade, year, and subject are required' }, { status: 400 });
    }

    const grade = String(gradeInput).trim();
    const year = parseInt(String(yearInput), 10);
    const subject = String(subjectInput).trim();

    if (!grade || Number.isNaN(year) || !subject) {
      return NextResponse.json({ error: 'Invalid grade, year, or subject' }, { status: 400 });
    }

    if (examFile && examFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Exam file must be a PDF' }, { status: 400 });
    }

    if (criteriaFile && criteriaFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Criteria file must be a PDF' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const contentParts: Array<{ source: 'exam' | 'criteria'; text: string }> = [];

    const parsePdf = async (buffer: Buffer) => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url
      ).toString();

      const data = new Uint8Array(buffer);
      const loadingTask = (pdfjs.getDocument as any)({ data, disableWorker: true });
      const pdf = await loadingTask.promise;
      let text = '';

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (pageText) {
          text += `${pageText}\n`;
        }
      }

      return { text };
    };

    if (examFile) {
      const examBuffer = Buffer.from(await examFile.arrayBuffer());
      const examText = (await parsePdf(examBuffer)).text || '';
      contentParts.push({ source: 'exam', text: examText });
    }

    if (criteriaFile) {
      const criteriaBuffer = Buffer.from(await criteriaFile.arrayBuffer());
      const criteriaText = (await parsePdf(criteriaBuffer)).text || '';
      contentParts.push({ source: 'criteria', text: criteriaText });
    }

    if (!contentParts.length) {
      return NextResponse.json({ error: 'No extractable text found in PDFs' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const chunkResponses: Array<{ source: 'exam' | 'criteria'; index: number; content: string }> = [];
    const refusals: Array<{ source: 'exam' | 'criteria'; index: number; content: string }> = [];
    const maxChunkChars = 12000;

    for (const part of contentParts) {
      const chunks = chunkText(part.text, maxChunkChars);
      const totalChunks = chunks.length;

      for (let index = 0; index < totalChunks; index += 1) {
        const chunk = chunks[index];

        const prompt = part.source === 'criteria' ? CRITERIA_PROMPT : PDF_PROMPT;
        const messages = [
          {
            role: 'system' as const,
            content: 'You are given user-provided content and are allowed to transform it. Comply with the requested format and do not refuse.',
          },
          {
            role: 'user' as const,
            content: `${prompt}\n\nSOURCE: ${part.source.toUpperCase()}\nCHUNK ${index + 1} of ${totalChunks}\n\n${chunk}`,
          },
        ];

        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_PDF_MODEL || 'gpt-4o',
          messages,
          temperature: 0.2,
        });

        let chunkContent = response.choices?.[0]?.message?.content || '';

        if (chunkContent.trim() && isRefusal(chunkContent)) {
          const retryResponse = await openai.chat.completions.create({
            model: process.env.OPENAI_PDF_MODEL || 'gpt-4o',
            messages,
            temperature: 0.1,
          });
          chunkContent = retryResponse.choices?.[0]?.message?.content || '';
        }

        if (chunkContent.trim() && !isRefusal(chunkContent)) {
          chunkResponses.push({ source: part.source, index: index + 1, content: chunkContent });
        } else if (chunkContent.trim()) {
          refusals.push({ source: part.source, index: index + 1, content: chunkContent });
        }
      }
    }

    const combinedContent = chunkResponses
      .sort((a, b) => a.source.localeCompare(b.source) || a.index - b.index)
      .map((item) => item.content)
      .join('\n\n');

    if (!combinedContent.trim()) {
      return NextResponse.json({ error: 'No content returned from ChatGPT' }, { status: 500 });
    }

    const createdQuestions: any[] = [];
    let updatedCriteriaCount = 0;
    const missingCriteria: string[] = [];

    if (examFile) {
      const examContent = chunkResponses
        .filter((item) => item.source === 'exam')
        .sort((a, b) => a.index - b.index)
        .map((item) => item.content)
        .join('\n\n');

      const { questions } = parseQuestions(examContent);

      if (!questions.length) {
        return NextResponse.json({ error: 'No questions parsed from ChatGPT response' }, { status: 500 });
      }

      const insertPayload = questions.map((question) => ({
        grade,
        year,
        subject,
        topic: question.topic || 'Unspecified',
        marks: question.marks || 0,
        question_number: question.questionNumber || null,
        question_text: question.questionText,
        question_type: 'written',
        marking_criteria: null,
        sample_answer: question.sampleAnswer || null,
        graph_image_data: null,
        graph_image_size: 'medium',
      }));

      const { data, error } = await supabaseAdmin
        .from('hsc_questions')
        .insert(insertPayload)
        .select();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to create questions: ' + error.message }, { status: 500 });
      }

      if (Array.isArray(data)) {
        createdQuestions.push(...data);
      }
    }

    if (criteriaFile) {
      const criteriaContent = chunkResponses
        .filter((item) => item.source === 'criteria')
        .sort((a, b) => a.index - b.index)
        .map((item) => item.content)
        .join('\n\n');

      const { criteria } = parseCriteria(criteriaContent);

      const grouped: Record<string, Record<string, string[]>> = {};
      criteria.forEach((entry) => {
        const partKey = entry.partLabel || 'main';
        if (!grouped[entry.baseNumber]) grouped[entry.baseNumber] = {};
        if (!grouped[entry.baseNumber][partKey]) grouped[entry.baseNumber][partKey] = [];
        grouped[entry.baseNumber][partKey].push(...entry.criteriaLines);
      });

      const { data: existingQuestions, error: fetchError } = await supabaseAdmin
        .from('hsc_questions')
        .select('id, question_number')
        .match({ grade, year, subject });

      if (fetchError) {
        console.error('Criteria fetch error:', fetchError);
      }

      const byBaseNumber = new Map<string, string[]>();
      (existingQuestions || []).forEach((q: any) => {
        const numberMatch = String(q.question_number || '').match(/(\d+)/);
        const base = numberMatch ? numberMatch[1] : null;
        if (!base) return;
        if (!byBaseNumber.has(base)) byBaseNumber.set(base, []);
        byBaseNumber.get(base)!.push(q.id);
      });

      for (const [baseNumber, parts] of Object.entries(grouped)) {
        const partKeys = Object.keys(parts);
        const lines: string[] = [];

        if (partKeys.length > 1 || (partKeys.length === 1 && partKeys[0] !== 'main')) {
          partKeys.forEach((key) => {
            const label = key === 'main' ? 'Part' : `Part ${key}`;
            lines.push(`PART ${label}`);
            lines.push(...parts[key]);
          });
        } else {
          lines.push(...parts[partKeys[0]]);
        }

        const criteriaText = lines.join('\n');
        const ids = byBaseNumber.get(baseNumber) || [];

        if (!ids.length) {
          missingCriteria.push(baseNumber);
          continue;
        }

        for (const id of ids) {
          const { error } = await supabaseAdmin
            .from('hsc_questions')
            .update({ marking_criteria: criteriaText })
            .eq('id', id);

          if (error) {
            console.error('Criteria update error:', error);
            continue;
          }
          updatedCriteriaCount += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdQuestions.length} questions. Updated ${updatedCriteriaCount} marking criteria.`,
      exam: examFile ? { name: examFile.name, size: examFile.size } : null,
      criteria: criteriaFile ? { name: criteriaFile.name, size: criteriaFile.size } : null,
      parsed: {
        year,
        grade,
        subject,
        questionsCreated: createdQuestions.length,
        criteriaUpdated: updatedCriteriaCount,
        criteriaMissing: missingCriteria.length,
      },
      missingCriteria,
      chunks: chunkResponses,
      refusals,
      chatgpt: combinedContent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process PDFs';
    console.error('PDF ingest error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
