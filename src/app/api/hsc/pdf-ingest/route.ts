import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/db';

const PDF_PROMPT = `I have provided one PDF whichis a HSC mathematics exam paper with written questions

I want you to convert all the questions (that aren't multiple choice) to nicely formatted latex code. For each question you also need to write up a sample answer in latex code.

Format for each question:

QUESTION_NUMBER X
NUM_MARKS X
TOPIC X
HAS_IMAGE {TRUE/FALSE}
QUESTION_CONTENT
{question written in latex code...}

SAMPLE_ANSWER
{sample answer written in latex code....}

At the top of your response make sure to indicate:

YEAR_GRADE_SUBJECT
e.g. 2024_Year_12_Mathematics_Advanced`;

const getHeaderValue = (line: string) => {
  const parts = line.split(/\s+/).slice(1);
  return parts.join(' ').trim();
};

const parseYearGradeSubject = (lines: string[]) => {
  let headerValue = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('YEAR_GRADE_SUBJECT')) {
      const inlineValue = line.replace('YEAR_GRADE_SUBJECT', '').trim();
      if (inlineValue) {
        headerValue = inlineValue;
      } else {
        const nextLine = lines.slice(i + 1).find((l) => l.trim());
        headerValue = nextLine?.trim() || '';
      }
      break;
    }
  }

  if (!headerValue) {
    return { year: null, grade: null, subject: null };
  }

  const parts = headerValue.split('_').filter(Boolean);
  if (parts.length < 3) {
    return { year: null, grade: null, subject: null };
  }

  const year = parseInt(parts[0], 10);
  const grade = `${parts[1]} ${parts[2]}`;
  const subject = parts.slice(3).join(' ').replace(/\s+/g, ' ').trim();

  return {
    year: Number.isNaN(year) ? null : year,
    grade,
    subject,
  };
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
  const { year, grade, subject } = parseYearGradeSubject(lines);

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

  return { year, grade, subject, questions };
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const exam = formData.get('exam');
    const criteria = formData.get('criteria');

    if (!exam || !criteria || !(exam instanceof File) || !(criteria instanceof File)) {
      return NextResponse.json({ error: 'Both exam and criteria PDFs are required' }, { status: 400 });
    }

    if (exam.type !== 'application/pdf' || criteria.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Files must be PDFs' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const examBuffer = Buffer.from(await exam.arrayBuffer());
    const criteriaBuffer = Buffer.from(await criteria.arrayBuffer());

    const examBase64 = examBuffer.toString('base64');
    const criteriaBase64 = criteriaBuffer.toString('base64');

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_PDF_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `${PDF_PROMPT}\n\nEXAM_PDF_BASE64:\n${examBase64}\n\nMARKING_CRITERIA_PDF_BASE64:\n${criteriaBase64}`,
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices?.[0]?.message?.content || '';

    if (!content.trim()) {
      return NextResponse.json({ error: 'No content returned from ChatGPT' }, { status: 500 });
    }

    const { year, grade, subject, questions } = parseQuestions(content);

    if (!year || !grade || !subject) {
      return NextResponse.json({ error: 'Missing YEAR_GRADE_SUBJECT in ChatGPT response' }, { status: 500 });
    }

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

    return NextResponse.json({
      success: true,
      message: `Created ${data?.length || 0} questions from ChatGPT response`,
      created: data?.length || 0,
      exam: { name: exam.name, size: exam.size },
      criteria: { name: criteria.name, size: criteria.size },
    });
  } catch (error) {
    console.error('PDF ingest error:', error);
    return NextResponse.json({ error: 'Failed to process PDFs' }, { status: 500 });
  }
}
