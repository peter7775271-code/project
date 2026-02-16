import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import OpenAI from 'openai';

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

const buildPdfPrompt = (topics: ReadonlyArray<string>) => `I have provided a LATEX file containing a HSC Mathematics exam paper.
Your task is to convert every exam question (including multiple-choice and written-response questions) into clean, well-structured LaTeX code and provide a fully worked sample solution for each question.

CRITICAL — Question splitting (follow exactly):
- Split questions ONLY at lettered parts: (a), (b), (c), (d), etc. Each of these gets its own QUESTION_NUMBER block (e.g. 11 (a), 11 (b), 11 (c) are three separate questions).
- NEVER create a separate question for Roman numerals. (i), (ii), (iii), (iv), (v), (vi), (vii), (viii), (ix), (x) must NEVER start a new QUESTION_NUMBER block. All content under e.g. "11 (a)" — including (i), (ii), (iii) — must stay in one question.
- Do NOT split by (i), (ii), (iii). Do NOT split by I, II, III. Split ONLY by (a), (b), (c), (d).

Image flag rule: If a question explicitly refers to or depends on an image/graph/diagram (e.g. "Use the diagram above"), set HAS_IMAGE to TRUE. Otherwise set HAS_IMAGE to FALSE. Do NOT output LaTeX for diagrams, crop images, or describe figures; images will be added manually later.

For each NON-multiple-choice (written-response) question, you must follow this exact structure:

QUESTION_NUMBER X
NUM_MARKS X
TOPIC X
HAS_IMAGE {TRUE/FALSE}

QUESTION_CONTENT
{question written in LaTeX code...}

SAMPLE_ANSWER
{fully worked solution written in LaTeX code...}

For each MULTIPLE-CHOICE question you must follow this structure instead:

QUESTION_NUMBER X
NUM_MARKS X
TOPIC X
HAS_IMAGE {TRUE/FALSE}
QUESTION_TYPE MULTIPLE_CHOICE

QUESTION_CONTENT
{question stem written in LaTeX code...}

MCQ_OPTION_A {text for option A in LaTeX}
MCQ_OPTION_B {text for option B in LaTeX}
MCQ_OPTION_C {text for option C in LaTeX}
MCQ_OPTION_D {text for option D in LaTeX}
MCQ_CORRECT_ANSWER {A|B|C|D}
MCQ_EXPLANATION {detailed LaTeX explanation: why the correct option is right, why the others are wrong; format in clear steps with blank lines between ideas so a student can follow easily}

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

SAMPLE ANSWER REQUIREMENTS (format so a student can follow easily):
- Show every step of the working; do not skip steps. A student should be able to follow the logic from start to finish.
- Put each major step on its own line or in a small block. Use blank lines between distinct steps so the solution is not a wall of text.
- For algebraic manipulation: show one transformation per line (e.g. one line per "add 2 to both sides") where it helps clarity.
- For multi-part questions (i), (ii), (iii): start each part on a new line and label clearly (e.g. "(i)" or "Part (i)") with a blank line before it.
- After working, state the final answer clearly (e.g. "Therefore ..." or "Hence the answer is ...").
- Use short, clear sentences. Prefer "We have" / "So" / "Thus" to connect steps.
- Keep display math ($$...$$) for important equations; use inline math ($...$) for brief expressions in prose.
- The solution should look like a model answer a teacher would write on the board: neat, well-spaced, and easy to read.

For each question, choose the most suitable topic from this list:
${topics.join('\n')}

Output raw text only. Do not add commentary, explanations, or extra formatting. Return only the converted LaTeX content.`;

const buildExamImagePrompt = (topics: ReadonlyArray<string>) => `I have provided an image of a HSC Mathematics exam page.
Your task is to extract every exam question (including multiple-choice and written-response questions) from the image and convert it into clean, well-structured LaTeX code with a fully worked sample solution for each question.

CRITICAL — Question splitting (follow exactly):
- Split questions ONLY at lettered parts: (a), (b), (c), (d), etc. Each of these gets its own QUESTION_NUMBER block (e.g. 11 (a), 11 (b), 11 (c) are three separate questions).
- NEVER create a separate question for Roman numerals. (i), (ii), (iii), (iv), (v), (vi), (vii), (viii), (ix), (x) must NEVER start a new QUESTION_NUMBER block. All content under e.g. "11 (a)" — including (i), (ii), (iii) — must stay in one question.
- Do NOT split by (i), (ii), (iii). Do NOT split by I, II, III. Split ONLY by (a), (b), (c), (d).

Image flag rule: If a question visibly includes or depends on an image/graph/diagram on the page, set HAS_IMAGE to TRUE. Do NOT crop, describe, or output LaTeX for diagrams; images will be added manually. Just set the flag.

For each NON-multiple-choice (written-response) question, you must follow this exact structure:

QUESTION_NUMBER X
NUM_MARKS X
TOPIC X
HAS_IMAGE {TRUE/FALSE}

QUESTION_CONTENT
{question written in LaTeX code...}

SAMPLE_ANSWER
{fully worked solution written in LaTeX code...}

For each MULTIPLE-CHOICE question you must follow this structure instead:

QUESTION_NUMBER X
NUM_MARKS X
TOPIC X
HAS_IMAGE {TRUE/FALSE}
QUESTION_TYPE MULTIPLE_CHOICE

QUESTION_CONTENT
{question stem written in LaTeX code...}

MCQ_OPTION_A {text for option A in LaTeX}
MCQ_OPTION_B {text for option B in LaTeX}
MCQ_OPTION_C {text for option C in LaTeX}
MCQ_OPTION_D {text for option D in LaTeX}
MCQ_CORRECT_ANSWER {A|B|C|D}
MCQ_EXPLANATION {detailed LaTeX explanation: why the correct option is right, why the others are wrong; format in clear steps with blank lines between ideas so a student can follow easily}

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

SAMPLE ANSWER REQUIREMENTS (format so a student can follow easily):
- Show every step of the working; do not skip steps. A student should be able to follow the logic from start to finish.
- Put each major step on its own line or in a small block. Use blank lines between distinct steps so the solution is not a wall of text.
- For algebraic manipulation: show one transformation per line (e.g. one line per "add 2 to both sides") where it helps clarity.
- For multi-part questions (i), (ii), (iii): start each part on a new line and label clearly (e.g. "(i)" or "Part (i)") with a blank line before it.
- After working, state the final answer clearly (e.g. "Therefore ..." or "Hence the answer is ...").
- Use short, clear sentences. Prefer "We have" / "So" / "Thus" to connect steps.
- Keep display math ($$...$$) for important equations; use inline math ($...$) for brief expressions in prose.
- The solution should look like a model answer a teacher would write on the board: neat, well-spaced, and easy to read.

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

const stripOuterBraces = (s: string): string => {
  const t = s.trim();
  if (t.startsWith('{') && t.endsWith('}') && t.length >= 2) return t.slice(1, -1).trim();
  return s;
};

type ParsedQuestion = {
  questionNumber: string | null;
  marks: number | null;
  topic: string | null;
  hasImage: boolean;
  questionText: string;
  sampleAnswer: string;
  questionType: 'written' | 'multiple_choice' | null;
  mcqOptionA: string | null;
  mcqOptionB: string | null;
  mcqOptionC: string | null;
  mcqOptionD: string | null;
  mcqCorrectAnswer: 'A' | 'B' | 'C' | 'D' | null;
  mcqExplanation: string | null;
};

const MCQ_HEADER_PREFIXES = [
  'QUESTION_NUMBER', 'NUM_MARKS', 'TOPIC', 'HAS_IMAGE', 'QUESTION_TYPE',
  'MCQ_OPTION_A', 'MCQ_OPTION_B', 'MCQ_OPTION_C', 'MCQ_OPTION_D',
  'MCQ_CORRECT_ANSWER', 'MCQ_EXPLANATION', 'QUESTION_CONTENT', 'SAMPLE_ANSWER',
];

const parseQuestions = (content: string) => {
  const lines = content.split(/\r?\n/);

  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;
  let mode: 'question' | 'answer' | 'mcq_explanation' | null = null;
  let pendingMcqOption: 'A' | 'B' | 'C' | 'D' | null = null;

  const pushCurrent = () => {
    pendingMcqOption = null;
    if (!current) return;
    const trimmedQuestion = current.questionText.trim();
    const trimmedAnswer = current.sampleAnswer.trim();
    if (!trimmedQuestion) return;
    const hasAllMcqOptions =
      current.mcqOptionA != null &&
      current.mcqOptionB != null &&
      current.mcqOptionC != null &&
      current.mcqOptionD != null &&
      current.mcqCorrectAnswer != null;
    const inferredType: ParsedQuestion['questionType'] =
      current.questionType === 'multiple_choice' || hasAllMcqOptions ? 'multiple_choice' : current.questionType;
    questions.push({
      ...current,
      questionType: inferredType,
      questionText: trimmedQuestion,
      sampleAnswer: trimmedAnswer,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (pendingMcqOption && current) {
      const nextLine = rawLine.trim();
      if (nextLine && !MCQ_HEADER_PREFIXES.some((p) => nextLine.startsWith(p))) {
        const value = stripOuterBraces(nextLine);
        if (pendingMcqOption === 'A') current.mcqOptionA = value;
        else if (pendingMcqOption === 'B') current.mcqOptionB = value;
        else if (pendingMcqOption === 'C') current.mcqOptionC = value;
        else if (pendingMcqOption === 'D') current.mcqOptionD = value;
        pendingMcqOption = null;
        continue;
      }
      if (nextLine) pendingMcqOption = null;
    }

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
        questionType: null,
        mcqOptionA: null,
        mcqOptionB: null,
        mcqOptionC: null,
        mcqOptionD: null,
        mcqCorrectAnswer: null,
        mcqExplanation: null,
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

    if (line.toUpperCase().startsWith('QUESTION_TYPE')) {
      const value = getHeaderValue(line).toLowerCase();
      current.questionType = value.includes('multiple') ? 'multiple_choice' : 'written';
      continue;
    }

    if (line.startsWith('MCQ_OPTION_A')) {
      mode = null;
      const v = stripOuterBraces(getHeaderValue(line).trim());
      current.mcqOptionA = v || null;
      if (!v) pendingMcqOption = 'A';
      continue;
    }
    if (line.startsWith('MCQ_OPTION_B')) {
      mode = null;
      const v = stripOuterBraces(getHeaderValue(line).trim());
      current.mcqOptionB = v || null;
      if (!v) pendingMcqOption = 'B';
      continue;
    }
    if (line.startsWith('MCQ_OPTION_C')) {
      mode = null;
      const v = stripOuterBraces(getHeaderValue(line).trim());
      current.mcqOptionC = v || null;
      if (!v) pendingMcqOption = 'C';
      continue;
    }
    if (line.startsWith('MCQ_OPTION_D')) {
      mode = null;
      const v = stripOuterBraces(getHeaderValue(line).trim());
      current.mcqOptionD = v || null;
      if (!v) pendingMcqOption = 'D';
      continue;
    }
    if (line.startsWith('MCQ_CORRECT_ANSWER')) {
      mode = null;
      const value = stripOuterBraces(getHeaderValue(line).trim()).toUpperCase();
      current.mcqCorrectAnswer =
        value === 'A' || value === 'B' || value === 'C' || value === 'D' ? (value as 'A' | 'B' | 'C' | 'D') : null;
      continue;
    }
    if (line.startsWith('MCQ_EXPLANATION')) {
      const sameLine = stripOuterBraces(getHeaderValue(line).trim());
      current.mcqExplanation = sameLine || '';
      mode = 'mcq_explanation';
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
    } else if (mode === 'mcq_explanation') {
      current.mcqExplanation = (current.mcqExplanation || '') + (current.mcqExplanation ? '\n' : '') + rawLine;
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

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY server configuration' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

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
      return await openai.chat.completions.create({
        model: args.model,
        // We intentionally keep messages as any[] here to support both
        // plain-text and multimodal (image_url) payloads without over-constraining
        // the type definition.
        messages: args.messages as any,
        // Omit temperature: this model only supports the default (1); sending 0 or 0.7 returns 400.
        max_completion_tokens: typeof args.maxTokens === 'number' ? args.maxTokens : 2000,
      });
    };

    const extractMessageContent = (content: unknown): string => {
      if (content == null) return '';
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        const textPart = content.find((p: any) => p?.type === 'text');
        return (textPart?.text != null ? String(textPart.text) : '') || '';
      }
      return String(content);
    };

    const examTextModel = process.env.OPENAI_PDF_EXAM_MODEL || 'gpt-4o';
    const criteriaTextModel =
      process.env.OPENAI_PDF_CRITERIA_MODEL || 'gpt-4o';
    const examVisionModel = process.env.OPENAI_PDF_VISION_MODEL || 'gpt-4o';

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
          maxTokens: 2000,
        });

        let chunkContent = response.choices?.[0]?.message?.content || '';

        if (chunkContent.trim() && isRefusal(chunkContent)) {
          const retryResponse = await createChatCompletion({
            model,
            messages,
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

    const createdQuestions: any[] = [];
    let updatedCriteriaCount = 0;
    const missingCriteria: string[] = [];
    const imageResponseBodies: string[] = [];

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

      // If examFile is provided (PDF / LaTeX), use the existing text-based pipeline.
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

        const insertPayload = questions.map((question) => {
          const topic = question.topic || 'Unspecified';
          const isMcq = question.questionType === 'multiple_choice';

          return {
            grade,
            year,
            subject,
            topic,
            marks: question.marks || 0,
            question_number: question.questionNumber || null,
            question_text: question.questionText,
            question_type: isMcq ? 'multiple_choice' : 'written',
            marking_criteria: isMcq ? null : null,
            sample_answer: isMcq ? null : (question.sampleAnswer || null),
            mcq_option_a: isMcq ? (question.mcqOptionA ?? null) : null,
            mcq_option_b: isMcq ? (question.mcqOptionB ?? null) : null,
            mcq_option_c: isMcq ? (question.mcqOptionC ?? null) : null,
            mcq_option_d: isMcq ? (question.mcqOptionD ?? null) : null,
            mcq_option_a_image: null,
            mcq_option_b_image: null,
            mcq_option_c_image: null,
            mcq_option_d_image: null,
            mcq_correct_answer: isMcq ? (question.mcqCorrectAnswer ?? null) : null,
            mcq_explanation: isMcq ? (question.mcqExplanation ?? null) : null,
            graph_image_data: null,
            graph_image_size: 'medium',
          };
        });

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

      // If JPEGs are provided, process each image independently and attach its image data
      // to every question parsed from that image.
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
            maxTokens: 2000,
          });

          let chunkContent = extractMessageContent(response.choices?.[0]?.message?.content ?? '');

          if (chunkContent.trim() && isRefusal(chunkContent)) {
            const retryResponse = await createChatCompletion({
              model: examVisionModel,
              messages,
              maxTokens: 2000,
            });
            chunkContent = extractMessageContent(retryResponse.choices?.[0]?.message?.content ?? '');
          }

          const imageLabel = `--- Image ${index + 1} of ${examImageFiles.length} ---`;
          if (chunkContent.trim() && !isRefusal(chunkContent)) {
            imageResponseBodies.push(`${imageLabel}\n\n${chunkContent}`);
          } else {
            imageResponseBodies.push(
              chunkContent.trim()
                ? `${imageLabel}\n\n(Content was skipped: refusal or invalid.)\n\n${chunkContent}`
                : `${imageLabel}\n\n(No text returned from the model for this image.)`
            );
          }

          if (!chunkContent.trim() || isRefusal(chunkContent)) {
            continue;
          }

          const { questions } = parseQuestions(chunkContent);
          if (!questions.length) {
            continue;
          }

          const insertPayload = questions.map((question) => {
            const topic = question.topic || 'Unspecified';
            const isMcq = question.questionType === 'multiple_choice';

            return {
              grade,
              year,
              subject,
              topic,
              marks: question.marks || 0,
              question_number: question.questionNumber || null,
              question_text: question.questionText,
              question_type: isMcq ? 'multiple_choice' : 'written',
              marking_criteria: null,
              sample_answer: isMcq ? null : (question.sampleAnswer || null),
              mcq_option_a: isMcq ? (question.mcqOptionA ?? null) : null,
              mcq_option_b: isMcq ? (question.mcqOptionB ?? null) : null,
              mcq_option_c: isMcq ? (question.mcqOptionC ?? null) : null,
              mcq_option_d: isMcq ? (question.mcqOptionD ?? null) : null,
              mcq_option_a_image: null,
              mcq_option_b_image: null,
              mcq_option_c_image: null,
              mcq_option_d_image: null,
              mcq_correct_answer: isMcq ? (question.mcqCorrectAnswer ?? null) : null,
              mcq_explanation: isMcq ? (question.mcqExplanation ?? null) : null,
              graph_image_data: null,
              graph_image_size: question.hasImage ? 'medium' : 'medium',
            };
          });

          const { data, error } = await supabaseAdmin
            .from('hsc_questions')
            .insert(insertPayload)
            .select();

          if (error) {
            console.error('Database error (image ingest):', error);
            return NextResponse.json({ error: 'Failed to create questions from images: ' + error.message }, { status: 500 });
          }

          if (Array.isArray(data)) {
            createdQuestions.push(...data);
          }
        }
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

    const fromChunks = chunkResponses
      .sort((a, b) => a.source.localeCompare(b.source) || a.index - b.index)
      .map((c) => c.content)
      .join('\n\n');
    const fromImages = imageResponseBodies.join('\n\n');
    const combinedModelOutput = [fromChunks, fromImages].filter(Boolean).join('\n\n') || null;

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
      chatgpt: combinedModelOutput,
      modelOutput: combinedModelOutput,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process PDFs';
    console.error('PDF ingest error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
