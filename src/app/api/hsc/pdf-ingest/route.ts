import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export const runtime = 'nodejs';

const TOPIC_LISTS = {
  'Year 12': {
    advanced: [
      'Further graph transformations',
      'Sequences and series',
      'Differential calculus',
      'Integral calculus',
      'Applications of calculus',
      'Random variables',
      'Financial mathematics',
    ],
    'extension 1': [
      'Proof by mathematical induction',
      'Vectors',
      'Inverse trigonometric functions',
      'Further calculus skills',
      'Further applications of calculus',
      'The binomial distribution and sampling distribution of the mean',
    ],
    'extension 2': [
      'The nature of proof',
      'Further work with vectors',
      'Introduction to complex numbers',
      'Further integration',
      'Applications of calculus to mechanics',
    ],
  },
  'Year 11': {
    advanced: [
      'Working with functions',
      'Trigonometry and measure of angles',
      'Trigonometric identities and equations',
      'Differentiation',
      'Exponential and logarithmic functions',
      'Graph transformations',
      'Probability and data',
    ],
    'extension 1': [
      'Further work with functions',
      'Polynomials',
      'Further trigonometry',
      'Permutations and combinations',
      'The binomial theorem',
    ],
  },
} as const;

const normalizeYearKey = (grade: string) => {
  const value = String(grade || '').toLowerCase();
  if (value.includes('12')) return 'Year 12';
  if (value.includes('11')) return 'Year 11';
  return 'Year 12';
};

const normalizeSubjectKey = (subject: string) => {
  const value = String(subject || '').toLowerCase();
  if (value.includes('extension 2') || value.includes('ext 2')) return 'extension 2';
  if (value.includes('extension 1') || value.includes('ext 1')) return 'extension 1';
  if (value.includes('advanced')) return 'advanced';
  return 'extension 1';
};

const getTopicOptions = (grade: string, subject: string) => {
  const yearKey = normalizeYearKey(grade);
  const subjectKey = normalizeSubjectKey(subject);
  if (yearKey === 'Year 11' && subjectKey === 'extension 2') {
    return null;
  }
  const yearTopics = TOPIC_LISTS[yearKey] as Record<string, ReadonlyArray<string>>;
  return yearTopics[subjectKey] || TOPIC_LISTS['Year 12']['extension 1'];
};

const buildPdfPrompt = (topics: ReadonlyArray<string>) => `I have provided a LATEX file containing a HSC Mathematics exam paper with written-response questions.
Your task is to convert every written question into clean, well-structured LaTeX code and provide a fully worked sample solution for each question.
Do not include or process any multiple-choice questions (these are usually Questions 1–10). Only convert the written-response questions.
Important question splitting rule: treat each lettered subpart as its own separate question. For example, 11 (a) is one question and 11 (b) is a separate question. However, do not split deeper subparts. Parts such as 11 (a) (i), 11 (a) (ii), and 11 (a) (iii) must remain grouped together under Question 11 (a) and must not be treated as separate questions. Split only by letters (a), (b), (c), not by roman numerals (i), (ii), (iii).
For each question, you must follow this exact structure:

QUESTION_NUMBER X
NUM_MARKS X
TOPIC X
HAS_IMAGE {TRUE/FALSE}

QUESTION_CONTENT
{question written in LaTeX code...}

SAMPLE_ANSWER
{fully worked solution written in LaTeX code...}

RENDER-SAFE LaTeX rules (strict):
- Inline math must use $...$ only. Do NOT use \( \). 
- Display math must use $$...$$ only. Do NOT use \[ \]. 
- Do NOT use \begin{align} or \begin{align*}. Use $$\begin{aligned}...\end{aligned}$$ instead.
- Escape currency and percent as \\\$ and \\\% in plain text. 
- Never output stray or unmatched $ symbols. 
- Never insert line breaks inside words; keep sentences on one line. 
- Tables must be only \\begin{tabular}...\\end{tabular} or \\begin{array}...\\end{array}. Do not use other environments. 
- Use \\text{...} for words inside math.

READABILITY RULES:
Add newlines where appropriate to improve readability.
Include one blank line between the header section and QUESTION_CONTENT.
If a question contains internal parts such as (i) or (ii), separate them with blank lines but keep them within the same question.
Leave one blank line between each completed question block.

SAMPLE ANSWER REQUIREMENTS:
Each solution must be fully worked out with all steps shown, clearly explained, easy to follow, and neatly formatted in LaTeX.

For each question, choose the most suitable topic from this list:
${topics.join('\n')}

Output raw text only. Do not add commentary, explanations, or extra formatting. Return only the converted LaTeX content.`;

const buildExamImagePrompt = (topics: ReadonlyArray<string>) => `I have provided an image of a HSC Mathematics exam page with written-response questions.
Your task is to extract every written-response question from the image and convert it into clean, well-structured LaTeX code with a fully worked sample solution for each question.
Do not include or process any multiple-choice questions (these are usually Questions 1–10). Only convert the written-response questions.
Important question splitting rule: treat each lettered subpart as its own separate question. For example, 11 (a) is one question and 11 (b) is a separate question. However, do not split deeper subparts. Parts such as 11 (a) (i), 11 (a) (ii), and 11 (a) (iii) must remain grouped together under Question 11 (a) and must not be treated as separate questions. Split only by letters (a), (b), (c), not by roman numerals (i), (ii), (iii).
If a question has an image/graph/diagram, HAS_IMAGE should be set to true. For each question, you must follow this exact structure:

QUESTION_NUMBER X
NUM_MARKS X
TOPIC X
HAS_IMAGE {TRUE/FALSE}

QUESTION_CONTENT
{question written in LaTeX code...}

SAMPLE_ANSWER
{fully worked solution written in LaTeX code...}

RENDER-SAFE LaTeX rules (strict):
- Inline math must use $...$ only. Do NOT use \( \). 
- Display math must use $$...$$ only. Do NOT use \[ \]. 
- Do NOT use \begin{align} or \begin{align*}. Use $$\begin{aligned}...\end{aligned}$$ instead.
- Escape currency and percent as \\$ and \\% in plain text. 
- Never output stray or unmatched $ symbols. 
- Never insert line breaks inside words; keep sentences on one line. 
- Tables must be only \\begin{tabular}...\\end{tabular} or \\begin{array}...\\end{array}. Do not use other environments. 
- Use \\text{...} for words inside math.

READABILITY RULES:
Add newlines where appropriate to improve readability.
Include one blank line between the header section and QUESTION_CONTENT.
If a question contains internal parts such as (i) or (ii), separate them with blank lines but keep them within the same question.
Leave one blank line between each completed question block.

SAMPLE ANSWER REQUIREMENTS:
Each solution must be fully worked out with all steps shown, clearly explained, easy to follow, and neatly formatted in LaTeX.

For each question, choose the most suitable topic from this list:
${topics.join('\n')}

Output raw text only. Do not add commentary, explanations, or extra formatting. Return only the converted LaTeX content.`;

const CRITERIA_PROMPT = `I have provided one PDF which is a HSC mathematics marking criteria.

Extract all the marking criteria from the marking criteria tables into this format:

MARKING_QUESTION_NUMBER X
MARKS_X {criteria text}
MARKS_Y {criteria text}

Rules:
- A question may contain multiple parts. Each main subpart should be treated and counted as an individual question. For example, 11(a) and 11(b) should each be counted separately.
- If the marking criteria shows roman subparts like (i), (ii), include them in MARKING_QUESTION_NUMBER (e.g., 13(a)(i)).
- Only extract the marking criteria from the marking criteria tables.
- Ignore all sample answers.
- Skip all multiple choice questions.
- Use the question number exactly as shown in the marking criteria.
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
  key: string;
  rawLabel: string;
  criteriaLines: string[];
};

const normalizeQuestionKey = (raw: string) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { base: '', part: null as string | null, subpart: null as string | null, key: '' };

  const match = trimmed.match(/(\d+)\s*(?:\(?([a-z])\)?)?\s*(?:\(?((?:ix|iv|v?i{0,3}|x))\)?)?/i);
  const base = match?.[1] || trimmed;
  const part = match?.[2] ? match[2].toLowerCase() : null;
  const subpart = match?.[3] ? match[3].toLowerCase() : null;

  const key = base + (part ? `(${part})` : '');
  return { base, part, subpart, key };
};

const parseCriteria = (content: string) => {
  const lines = content.split(/\r?\n/);
  const criteria: ParsedCriteria[] = [];
  let currentNumber: string | null = null;
  let buffer: string[] = [];

  const pushCurrent = () => {
    if (!currentNumber) return;
    const normalized = normalizeQuestionKey(currentNumber);
    const subpartPrefix = normalized.subpart ? `(${normalized.subpart}) ` : '';
    const lines = buffer
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^MARKS_([^\s]+)\s*(.*)$/i);
        if (!match) return null;
        const markValue = match[1];
        const criteriaText = match[2].trim();
        const formatted = `${subpartPrefix}MARKS_${markValue} ${criteriaText}`.trim();
        return formatted;
      })
      .filter((line): line is string => Boolean(line));

    if (!lines.length) return;
    criteria.push({ key: normalized.key || currentNumber.trim(), rawLabel: currentNumber.trim(), criteriaLines: lines });
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
    const examImages = formData.getAll('examImages');
    const criteria = formData.get('criteria');
    const gradeInput = formData.get('grade');
    const yearInput = formData.get('year');
    const subjectInput = formData.get('subject');
    const overwriteInput = formData.get('overwrite');

    const examFile = exam instanceof File ? exam : null;
    const examImageFiles = examImages.filter((item): item is File => item instanceof File);
    const criteriaFile = criteria instanceof File ? criteria : null;

    if (!examFile && !examImageFiles.length && !criteriaFile) {
      return NextResponse.json({ error: 'Provide exam images or a criteria PDF' }, { status: 400 });
    }

    if (!gradeInput || !yearInput || !subjectInput) {
      return NextResponse.json({ error: 'Grade, year, and subject are required' }, { status: 400 });
    }

    const grade = String(gradeInput).trim();
    const year = parseInt(String(yearInput), 10);
    const subject = String(subjectInput).trim();
    const overwrite = String(overwriteInput || '').toLowerCase() === 'true';

    if (!grade || Number.isNaN(year) || !subject) {
      return NextResponse.json({ error: 'Invalid grade, year, or subject' }, { status: 400 });
    }

    if (examFile) {
      const lowerName = examFile.name.toLowerCase();
      const isPdf = examFile.type === 'application/pdf' || lowerName.endsWith('.pdf');
      const isLatex = lowerName.endsWith('.latex') || lowerName.endsWith('.tex');
      if (!isPdf && !isLatex) {
        return NextResponse.json({ error: 'Exam file must be a PDF or .latex/.tex file' }, { status: 400 });
      }
    }

    if (examImageFiles.length) {
      const invalidImage = examImageFiles.find((file) => !file.type.startsWith('image/'));
      if (invalidImage) {
        return NextResponse.json({ error: 'All exam images must be image files' }, { status: 400 });
      }
    }

    if (criteriaFile && criteriaFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Criteria file must be a PDF' }, { status: 400 });
    }

    const xaiApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (!xaiApiKey) {
      return NextResponse.json(
        { error: 'Missing XAI_API_KEY (or GROK_API_KEY) server configuration' },
        { status: 500 }
      );
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

    if (examFile && !examImageFiles.length) {
      const lowerName = examFile.name.toLowerCase();
      const isLatex = lowerName.endsWith('.latex') || lowerName.endsWith('.tex');
      const examBuffer = Buffer.from(await examFile.arrayBuffer());
      const examText = isLatex ? examBuffer.toString('utf8') : (await parsePdf(examBuffer)).text || '';
      contentParts.push({ source: 'exam', text: examText });
    }

    if (criteriaFile) {
      const criteriaBuffer = Buffer.from(await criteriaFile.arrayBuffer());
      const criteriaText = (await parsePdf(criteriaBuffer)).text || '';
      contentParts.push({ source: 'criteria', text: criteriaText });
    }

    if (!contentParts.length && !examImageFiles.length) {
      return NextResponse.json({ error: 'No extractable text found in uploads' }, { status: 400 });
    }

    const topicOptions = getTopicOptions(grade, subject);
    if (!topicOptions) {
      return NextResponse.json({ error: 'Year 11 Extension 2 is not supported.' }, { status: 400 });
    }

    const createChatCompletion = async (args: {
      model: string;
      messages: any[];
      temperature?: number;
      maxTokens?: number;
    }) => {
      const send = async (body: Record<string, any>) => {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${xaiApiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const err = new Error(`xAI API error ${res.status}: ${text || res.statusText}`);
          (err as any).status = res.status;
          (err as any).body = text;
          throw err;
        }
        return (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
      };

      const baseBody: Record<string, any> = {
        model: args.model,
        messages: args.messages,
        max_tokens: typeof args.maxTokens === 'number' ? args.maxTokens : 2000,
      };

      // Some reasoning models may reject unsupported params. We'll try with temperature,
      // and if that fails with a 400-level error, retry without it.
      if (typeof args.temperature === 'number') {
        try {
          return await send({ ...baseBody, temperature: args.temperature });
        } catch (err) {
          const status = (err as any)?.status;
          if (status && status >= 400 && status < 500) {
            return await send(baseBody);
          }
          throw err;
        }
      }

      return await send(baseBody);
    };

    const examTextModel = process.env.GROK_PDF_EXAM_MODEL || 'grok-4-1-fast-reasoning';
    const criteriaTextModel =
      process.env.GROK_PDF_CRITERIA_MODEL || 'grok-4-1-fast-reasoning';
    const examVisionModel = process.env.GROK_PDF_VISION_MODEL || 'grok-4';

    const chunkResponses: Array<{ source: 'exam' | 'criteria'; index: number; content: string }> = [];
    const refusals: Array<{ source: 'exam' | 'criteria'; index: number; content: string }> = [];
    // Always chunk large documents so each call stays within Grok's comfortable
    // completion limits. This avoids one huge request that gets truncated.
    const chunkMaxChars = Number(process.env.GROK_PDF_CHUNK_MAX_CHARS || 20000);

    for (const part of contentParts) {
      const fullText = String(part.text || '').trim();
      const chunks = chunkText(fullText, chunkMaxChars);
      const totalChunks = chunks.length;

      for (let index = 0; index < totalChunks; index += 1) {
        const chunk = chunks[index];

        const promptBase =
          part.source === 'criteria'
            ? CRITERIA_PROMPT
            : buildPdfPrompt(topicOptions);
        const prompt = `${promptBase}

You will receive the exam text in multiple chunks if the document is long. For EACH chunk:
- Convert every written-response question that is fully contained within THIS chunk.
- Do not repeat questions that were clearly already completed in previous chunks.
- If a question is cut off mid-way at the start or end of this chunk, skip that partial question.
- Do not stop early once you have converted a few questions; keep going until you have processed all complete questions in this chunk.

If the extracted text contains OCR noise, do your best to reconstruct the intended maths faithfully without inventing unseen questions.`;
        const model = part.source === 'criteria' ? criteriaTextModel : examTextModel;
        const messages = [
          {
            role: 'system' as const,
            content:
              'You are given user-provided content (OCR / PDF text) and are allowed to transform it. Comply with the requested format.',
          },
          {
            role: 'user' as const,
            content: `${prompt}\n\nSOURCE: ${part.source.toUpperCase()}\nCHUNK ${index + 1} of ${totalChunks}\n\n${chunk}`,
          },
        ];

        const response = await createChatCompletion({
          model,
          messages,
          temperature: 0.7,
          maxTokens: 2000,
        });

        let chunkContent = response.choices?.[0]?.message?.content || '';

        if (chunkContent.trim() && isRefusal(chunkContent)) {
          const retryResponse = await createChatCompletion({
            model,
            messages,
            temperature: 0.2,
            maxTokens: 2000,
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

    if (examImageFiles.length) {
      for (let index = 0; index < examImageFiles.length; index += 1) {
        const imageFile = examImageFiles[index];
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const imageBase64 = imageBuffer.toString('base64');
        const imageMime = imageFile.type || 'image/jpeg';
        const imageUrl = `data:${imageMime};base64,${imageBase64}`;

        const messages = [
          {
            role: 'system',
            content:
              'You are given user-provided content (an exam image) and are allowed to transform it. Comply with the requested format.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${buildExamImagePrompt(topicOptions)}\n\nIMAGE ${index + 1} of ${examImageFiles.length}`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'high' },
              },
            ],
          },
        ];

        const response = await createChatCompletion({
          model: examVisionModel,
          messages,
          temperature: 0.7,
          maxTokens: 2000,
        });

        let chunkContent = response.choices?.[0]?.message?.content || '';

        if (chunkContent.trim() && isRefusal(chunkContent)) {
          const retryResponse = await createChatCompletion({
            model: examVisionModel,
            messages,
            temperature: 0.2,
            maxTokens: 2000,
          });
          chunkContent = retryResponse.choices?.[0]?.message?.content || '';
        }

        if (chunkContent.trim() && !isRefusal(chunkContent)) {
          chunkResponses.push({ source: 'exam', index: index + 1, content: chunkContent });
        } else if (chunkContent.trim()) {
          refusals.push({ source: 'exam', index: index + 1, content: chunkContent });
        }
      }
    }

    const combinedContent = chunkResponses
      .sort((a, b) => a.source.localeCompare(b.source) || a.index - b.index)
      .map((item) => item.content)
      .join('\n\n');

    if (!combinedContent.trim()) {
      return NextResponse.json({ error: 'No content returned from the model' }, { status: 500 });
    }

    const createdQuestions: any[] = [];
    let updatedCriteriaCount = 0;
    const missingCriteria: string[] = [];

    if (examFile || examImageFiles.length) {
      if (overwrite) {
        const { error: deleteError } = await supabaseAdmin
          .from('hsc_questions')
          .delete()
          .match({ grade, year, subject });

        if (deleteError) {
          console.error('Overwrite delete error:', deleteError);
          return NextResponse.json(
            { error: 'Failed to overwrite existing questions: ' + deleteError.message },
            { status: 500 }
          );
        }
      }

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
        graph_image_size: question.hasImage ? 'missing' : 'medium',
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
      if (overwrite) {
        const { error: clearError } = await supabaseAdmin
          .from('hsc_questions')
          .update({ marking_criteria: null })
          .match({ grade, year, subject });

        if (clearError) {
          console.error('Overwrite criteria clear error:', clearError);
          return NextResponse.json(
            { error: 'Failed to overwrite existing marking criteria: ' + clearError.message },
            { status: 500 }
          );
        }
      }

      const criteriaContent = chunkResponses
        .filter((item) => item.source === 'criteria')
        .sort((a, b) => a.index - b.index)
        .map((item) => item.content)
        .join('\n\n');

      const { criteria } = parseCriteria(criteriaContent);

      const grouped: Record<string, string[]> = {};
      criteria.forEach((entry) => {
        if (!entry.key) return;
        if (!grouped[entry.key]) grouped[entry.key] = [];
        grouped[entry.key].push(...entry.criteriaLines);
      });

      const { data: existingQuestions, error: fetchError } = await supabaseAdmin
        .from('hsc_questions')
        .select('id, question_number')
        .match({ grade, year, subject });

      if (fetchError) {
        console.error('Criteria fetch error:', fetchError);
      }

      const byQuestionKey = new Map<string, string[]>();
      (existingQuestions || []).forEach((q: any) => {
        const normalized = normalizeQuestionKey(String(q.question_number || ''));
        const key = normalized.key || String(q.question_number || '').trim();
        if (!key) return;
        if (!byQuestionKey.has(key)) byQuestionKey.set(key, []);
        byQuestionKey.get(key)!.push(q.id);
      });

      for (const [questionKey, lines] of Object.entries(grouped)) {
        const criteriaText = lines.join('\n');
        const ids = byQuestionKey.get(questionKey) || [];

        if (!ids.length) {
          missingCriteria.push(questionKey);
          continue;
        }

        if (overwrite) {
          const { error: clearError } = await supabaseAdmin
            .from('hsc_questions')
            .update({ marking_criteria: null })
            .in('id', ids);

          if (clearError) {
            console.error('Criteria clear error:', clearError);
          }
        }

        const { error: updateError } = await supabaseAdmin
          .from('hsc_questions')
          .update({ marking_criteria: criteriaText })
          .in('id', ids);

        if (updateError) {
          console.error('Criteria update error:', updateError);
          continue;
        }
        updatedCriteriaCount += ids.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdQuestions.length} questions. Updated ${updatedCriteriaCount} marking criteria.`,
      exam: examImageFiles.length
        ? { images: examImageFiles.length, totalBytes: examImageFiles.reduce((sum, file) => sum + file.size, 0) }
        : examFile
          ? { name: examFile.name, size: examFile.size, type: examFile.type || 'unknown' }
          : null,
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
      // Backwards-compatible field name (used by the frontend today)
      chatgpt: combinedContent,
      // Preferred field name going forward
      modelOutput: combinedContent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process PDFs';
    console.error('PDF ingest error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
