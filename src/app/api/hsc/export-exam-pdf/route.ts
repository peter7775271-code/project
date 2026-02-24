import { access, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import { constants } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);
const PDFLATEX_PATH = process.env.PDFLATEX_PATH ?? '/usr/bin/pdflatex';
const LATEX_TO_PDF_API_URL = process.env.LATEX_TO_PDF_API_URL ?? 'https://latex.ytotech.com/builds/sync';
const LATEX_TO_PDF_API_MODE = (process.env.LATEX_TO_PDF_API_MODE ?? 'auto').toLowerCase();
const IMAGE_FETCH_TIMEOUT_MS = Number(process.env.IMAGE_FETCH_TIMEOUT_MS ?? 15000);
const PDF_COMPILE_TIMEOUT_MS = Number(process.env.PDF_COMPILE_TIMEOUT_MS ?? 45000);
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES ?? 10 * 1024 * 1024);
const MAX_GET_TEX_LENGTH = Number(process.env.MAX_GET_TEX_LENGTH ?? 1800);

type ExportQuestion = {
  question_number?: string | null;
  question_text?: string | null;
  topic?: string | null;
  marks?: number | null;
  question_type?: 'written' | 'multiple_choice' | null;
  sample_answer?: string | null;
  sample_answer_image?: string | null;
  sample_answer_image_size?: 'small' | 'medium' | 'large' | null;
  marking_criteria?: string | null;
  graph_image_data?: string | null;
  graph_image_size?: 'small' | 'medium' | 'large' | 'missing' | null;
  mcq_option_a?: string | null;
  mcq_option_b?: string | null;
  mcq_option_c?: string | null;
  mcq_option_d?: string | null;
  mcq_option_a_image?: string | null;
  mcq_option_b_image?: string | null;
  mcq_option_c_image?: string | null;
  mcq_option_d_image?: string | null;
  mcq_correct_answer?: 'A' | 'B' | 'C' | 'D' | null;
  mcq_explanation?: string | null;
  graph_image_file?: string | null;
  sample_answer_image_file?: string | null;
  mcq_option_a_image_file?: string | null;
  mcq_option_b_image_file?: string | null;
  mcq_option_c_image_file?: string | null;
  mcq_option_d_image_file?: string | null;
};

const escapeLatexText = (value: string) =>
  value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([{}%$&#_])/g, '\\$1')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}');

const stripInvalidControlChars = (value: string) =>
  String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

const normalizeLatexBody = (value: string) =>
  stripInvalidControlChars(value)
    .replace(/\[\[PART_DIVIDER:([^\]]+)\]\]/g, (_match, label) => `\\paragraph{(${label})}`)
    .replace(/\[\s*beginaligned/gi, '')
    .replace(/\[\s*endaligned\s*\]/gi, '')
    .replace(/\bbeginaligned\b/gi, '')
    .replace(/\bendaligned\b/gi, '')
    .replace(/\bMARKS_(\d+)\b/g, 'MARKS\\_$1')
    .replace(/\bQUESTION_(\d+)\b/g, 'QUESTION\\_$1')
    .replace(/&/g, '\\&')
    .replace(/(^|\s)([0-9]*[A-Za-z]+)\^\(([^)]+)\)/g, (_match, prefix, base, powerExpr) => `${prefix}\\ensuremath{${base}^{(${powerExpr})}}`)
    .replace(/(^|\s)([0-9]*[A-Za-z]+)\^([A-Za-z])(?![A-Za-z0-9{])/g, (_match, prefix, base, power) => `${prefix}\\ensuremath{${base}^{${power}}}`)
    .replace(/(^|\s)([0-9]*[A-Za-z]+)\^([0-9]+)(?=\b)/g, (_match, prefix, base, power) => `${prefix}\\ensuremath{${base}^{${power}}}`)
    .replace(/∠/g, '\\ensuremath{\\angle}')
    .replace(/≤/g, '\\ensuremath{\\le}')
    .replace(/≥/g, '\\ensuremath{\\ge}')
    .replace(/≠/g, '\\ensuremath{\\neq}')
    .replace(/⇒/g, '\\ensuremath{\\Rightarrow}')
    .replace(/→/g, '\\ensuremath{\\to}')
    .replace(/↔/g, '\\ensuremath{\\leftrightarrow}')
    .replace(/×/g, '\\ensuremath{\\times}')
    .replace(/÷/g, '\\ensuremath{\\div}')
    .replace(/π/g, '\\ensuremath{\\pi}')
    .replace(/α/g, '\\ensuremath{\\alpha}')
    .replace(/β/g, '\\ensuremath{\\beta}')
    .replace(/γ/g, '\\ensuremath{\\gamma}')
    .replace(/δ/g, '\\ensuremath{\\delta}')
    .replace(/θ/g, '\\ensuremath{\\theta}')
    .replace(/λ/g, '\\ensuremath{\\lambda}')
    .replace(/μ/g, '\\ensuremath{\\mu}')
    .replace(/σ/g, '\\ensuremath{\\sigma}')
    .replace(/φ/g, '\\ensuremath{\\phi}')
    .replace(/ω/g, '\\ensuremath{\\omega}')
    .replace(/Δ/g, '\\ensuremath{\\Delta}')
    .replace(/Σ/g, '\\ensuremath{\\Sigma}')
    .replace(/Ω/g, '\\ensuremath{\\Omega}')
    .replace(/√/g, '\\ensuremath{\\sqrt{}}')
    .trim();

const normalizePlainBody = (value: string) =>
  stripInvalidControlChars(value)
    .replace(/\[\[PART_DIVIDER:([^\]]+)\]\]/g, (_match, label) => `(${label})`)
    .replace(/\[\s*beginaligned/gi, '')
    .replace(/\[\s*endaligned\s*\]/gi, '')
    .replace(/\bbeginaligned\b/gi, '')
    .replace(/\bendaligned\b/gi, '')
    .replace(/\bMARKS_(\d+)\b/g, 'MARKS $1')
    .replace(/\bQUESTION_(\d+)\b/g, 'QUESTION $1')
    .replace(/&/g, ' and ')
    .replace(/\(([^)]+)\)\^\(?([^\s,)]+)\)?/g, '($1) to the power of $2')
    .replace(/([A-Za-z0-9]+)\^\(([^)]+)\)/g, '$1 to the power of $2')
    .replace(/([A-Za-z0-9]+)\^([A-Za-z0-9]+)/g, '$1 to the power of $2')
    .replace(/\^/g, ' to the power of ')
    .replace(/∠/g, 'angle ')
    .replace(/≤/g, ' <= ')
    .replace(/≥/g, ' >= ')
    .replace(/≠/g, ' != ')
    .replace(/⇒/g, ' => ')
    .replace(/→/g, ' -> ')
    .replace(/↔/g, ' <-> ')
    .replace(/×/g, ' x ')
    .replace(/÷/g, ' / ')
    .replace(/π/g, 'pi')
    .replace(/α/g, 'alpha')
    .replace(/β/g, 'beta')
    .replace(/γ/g, 'gamma')
    .replace(/δ/g, 'delta')
    .replace(/θ/g, 'theta')
    .replace(/λ/g, 'lambda')
    .replace(/μ/g, 'mu')
    .replace(/σ/g, 'sigma')
    .replace(/φ/g, 'phi')
    .replace(/ω/g, 'omega')
    .replace(/Δ/g, 'Delta')
    .replace(/Σ/g, 'Sigma')
    .replace(/Ω/g, 'Omega')
    .replace(/[\\$]/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const imageWidthBySize = (size: string | null | undefined) => {
  if (size === 'small') return '0.38\\textwidth';
  if (size === 'large') return '0.85\\textwidth';
  return '0.62\\textwidth';
};

const detectImageExt = (mimeOrPath: string) => {
  const value = mimeOrPath.toLowerCase();
  if (value.includes('jpeg') || value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'jpg';
  if (value.includes('png') || value.endsWith('.png')) return 'png';
  if (value.includes('webp') || value.endsWith('.webp')) return 'webp';
  if (value.includes('gif') || value.endsWith('.gif')) return 'gif';
  return 'png';
};

const isPdflatexImageExt = (ext: string) => ext === 'jpg' || ext === 'png';

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const isPdfBuffer = (buffer: Buffer) => buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';

const safeUtf8Preview = (buffer: Buffer, maxLength = 500) =>
  buffer.toString('utf8').replace(/\s+/g, ' ').slice(0, maxLength);

const getRomanDisplayBase = (questionNumber: string | null | undefined) => {
  const raw = String(questionNumber || '').trim();
  const withRoman = raw.match(/^(\d+)\s*\(?([a-z])\)?\s*\(?((?:ix|iv|v?i{0,3}|x))\)?/i);
  if (!withRoman) return null;
  return `${withRoman[1]}(${withRoman[2].toLowerCase()})`;
};

const writeQuestionImageAsset = async (tempDir: string, baseName: string, source: string) => {
  const trimmed = String(source || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    const dataMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!dataMatch) return null;
    const mime = dataMatch[1];
    const base64 = dataMatch[2];
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      console.warn('[export-exam-pdf] Skipping invalid base64 image payload');
      return null;
    }
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
      console.warn('[export-exam-pdf] Skipping embedded image due to size constraints');
      return null;
    }
    const ext = detectImageExt(mime);
    if (!isPdflatexImageExt(ext)) {
      console.warn(`[export-exam-pdf] Skipping unsupported embedded image format for pdflatex: ${ext}`);
      return null;
    }
    const filename = `${baseName}.${ext}`;
    await writeFile(path.join(tempDir, filename), buffer);
    return filename;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const response = await fetchWithTimeout(trimmed, {}, IMAGE_FETCH_TIMEOUT_MS);
    if (!response.ok) return null;
    const contentLength = Number(response.headers.get('content-length') || '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      console.warn('[export-exam-pdf] Skipping remote image that exceeds size limit');
      return null;
    }
    const contentType = response.headers.get('content-type') || '';
    const ext = detectImageExt(contentType || trimmed);
    if (!isPdflatexImageExt(ext)) {
      console.warn(`[export-exam-pdf] Skipping remote image format unsupported by pdflatex: ${ext}`);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
      console.warn('[export-exam-pdf] Skipping remote image due to size constraints');
      return null;
    }
    const filename = `${baseName}.${ext}`;
    await writeFile(path.join(tempDir, filename), buffer);
    return filename;
  }

  return null;
};

const attachQuestionImageAssets = async (questions: ExportQuestion[], tempDir: string, includeSolutions: boolean) => {
  const enriched: ExportQuestion[] = [];
  const emittedRomanDiagramByBase = new Set<string>();

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const romanBase = getRomanDisplayBase(question.question_number);
    let graphImage: string | null = null;

    if (question.graph_image_data) {
      if (romanBase && emittedRomanDiagramByBase.has(romanBase)) {
        graphImage = null;
      } else {
        graphImage = await writeQuestionImageAsset(tempDir, `q-${index + 1}-diagram`, question.graph_image_data);
        if (romanBase && graphImage) {
          emittedRomanDiagramByBase.add(romanBase);
        }
      }
    }

    const solutionImage = includeSolutions && question.sample_answer_image
      ? await writeQuestionImageAsset(tempDir, `q-${index + 1}-solution`, question.sample_answer_image)
      : null;

    const optionAImage = question.mcq_option_a_image
      ? await writeQuestionImageAsset(tempDir, `q-${index + 1}-opt-a`, question.mcq_option_a_image)
      : null;
    const optionBImage = question.mcq_option_b_image
      ? await writeQuestionImageAsset(tempDir, `q-${index + 1}-opt-b`, question.mcq_option_b_image)
      : null;
    const optionCImage = question.mcq_option_c_image
      ? await writeQuestionImageAsset(tempDir, `q-${index + 1}-opt-c`, question.mcq_option_c_image)
      : null;
    const optionDImage = question.mcq_option_d_image
      ? await writeQuestionImageAsset(tempDir, `q-${index + 1}-opt-d`, question.mcq_option_d_image)
      : null;

    enriched.push({
      ...question,
      graph_image_file: graphImage,
      sample_answer_image_file: solutionImage,
      mcq_option_a_image_file: optionAImage,
      mcq_option_b_image_file: optionBImage,
      mcq_option_c_image_file: optionCImage,
      mcq_option_d_image_file: optionDImage,
    });
  }

  return enriched;
};

const getReferencedAssetFilenames = (questions: ExportQuestion[]) => {
  const filenames = new Set<string>();
  for (const question of questions) {
    const candidates = [
      question.graph_image_file,
      question.sample_answer_image_file,
      question.mcq_option_a_image_file,
      question.mcq_option_b_image_file,
      question.mcq_option_c_image_file,
      question.mcq_option_d_image_file,
    ];
    for (const candidate of candidates) {
      const name = String(candidate || '').trim();
      if (name) filenames.add(name);
    }
  }
  return Array.from(filenames);
};

const buildExamLatex = ({
  title,
  subtitle,
  includeSolutions,
  questions,
  compileSafeMode = false,
}: {
  title: string;
  subtitle: string;
  includeSolutions: boolean;
  questions: ExportQuestion[];
  compileSafeMode?: boolean;
}) => {
  const normalizeBody = compileSafeMode ? normalizePlainBody : normalizeLatexBody;
  const renderBody = (value: string) => {
    const normalized = normalizeBody(String(value || ''));
    return compileSafeMode ? escapeLatexText(normalized) : normalized;
  };
  const body = questions
    .map((question, index) => {
      const questionNumber = String(index + 1);
      const marks = Number(question.marks || 0);
      const questionType = question.question_type || 'written';
      const questionText = renderBody(String(question.question_text || ''));

      const lines: string[] = [];
      lines.push(`\\subsection*{Question ${escapeLatexText(questionNumber)}${marks > 0 ? ` (${marks} marks)` : ''}}`);
      lines.push(questionText || 'No question text provided.');
      lines.push('');
      if (question.graph_image_file) {
        lines.push('\\begin{center}');
        lines.push(`\\includegraphics[width=${imageWidthBySize(question.graph_image_size)}]{${question.graph_image_file}}`);
        lines.push('\\end{center}');
        lines.push('');
      }

      if (questionType === 'multiple_choice') {
        const options: Array<{ label: 'A' | 'B' | 'C' | 'D'; value: string; imageFile?: string | null }> = [
          {
            label: 'A',
            value: renderBody(String(question.mcq_option_a || '').trim()),
            imageFile: question.mcq_option_a_image_file,
          },
          {
            label: 'B',
            value: renderBody(String(question.mcq_option_b || '').trim()),
            imageFile: question.mcq_option_b_image_file,
          },
          {
            label: 'C',
            value: renderBody(String(question.mcq_option_c || '').trim()),
            imageFile: question.mcq_option_c_image_file,
          },
          {
            label: 'D',
            value: renderBody(String(question.mcq_option_d || '').trim()),
            imageFile: question.mcq_option_d_image_file,
          },
        ];
        lines.push('\\begin{enumerate}[label=\\textbf{(\\Alph*)}]');
        for (const option of options) {
          lines.push('\\item');
          if (option.value) {
            lines.push(option.value);
          }
          if (option.imageFile) {
            lines.push('\\begin{center}');
            lines.push(`\\includegraphics[width=0.30\\textwidth]{${option.imageFile}}`);
            lines.push('\\end{center}');
          }
          if (!option.value && !option.imageFile) {
            lines.push(' ');
          }
        }
        lines.push('\\end{enumerate}');
        lines.push('');

        if (includeSolutions) {
          lines.push('\\subsection*{Solution}');
          if (question.mcq_correct_answer) {
            lines.push(`\\textbf{Correct Answer:} ${escapeLatexText(String(question.mcq_correct_answer))}`);
            lines.push('');
          }
          if (question.mcq_explanation) {
            lines.push(renderBody(String(question.mcq_explanation)));
            lines.push('');
          }
        }
      } else if (includeSolutions) {
        lines.push('\\subsection*{Solution}');
        if (question.sample_answer) {
          lines.push(renderBody(String(question.sample_answer)));
          lines.push('');
        }
        if (question.sample_answer_image_file) {
          lines.push('\\begin{center}');
          lines.push(`\\includegraphics[width=${imageWidthBySize(question.sample_answer_image_size)}]{${question.sample_answer_image_file}}`);
          lines.push('\\end{center}');
          lines.push('');
        }
      }

      lines.push('\\vspace{0.6em}');
      lines.push('\\hrule');
      lines.push('\\vspace{0.8em}');
      return lines.join('\n');
    })
    .join('\n\n');

  return `\\documentclass[11pt]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[a4paper,margin=1in]{geometry}
\\usepackage{amsmath,amssymb,mathtools}
\\usepackage{graphicx}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage[strings]{underscore}
\\DeclareUnicodeCharacter{2220}{\\ensuremath{\\angle}}
\\DeclareUnicodeCharacter{2264}{\\ensuremath{\\leq}}
\\DeclareUnicodeCharacter{2265}{\\ensuremath{\\geq}}
\\DeclareUnicodeCharacter{2260}{\\ensuremath{\\neq}}
\\DeclareUnicodeCharacter{21D2}{\\ensuremath{\\Rightarrow}}
\\DeclareUnicodeCharacter{2192}{\\ensuremath{\\to}}
\\DeclareUnicodeCharacter{2194}{\\ensuremath{\\leftrightarrow}}
\\DeclareUnicodeCharacter{00D7}{\\ensuremath{\\times}}
\\DeclareUnicodeCharacter{00F7}{\\ensuremath{\\div}}
\\DeclareUnicodeCharacter{2212}{\\ensuremath{-}}
\\DeclareUnicodeCharacter{03C0}{\\ensuremath{\\pi}}
\\DeclareUnicodeCharacter{03B1}{\\ensuremath{\\alpha}}
\\DeclareUnicodeCharacter{03B2}{\\ensuremath{\\beta}}
\\DeclareUnicodeCharacter{03B3}{\\ensuremath{\\gamma}}
\\DeclareUnicodeCharacter{03B4}{\\ensuremath{\\delta}}
\\DeclareUnicodeCharacter{03B8}{\\ensuremath{\\theta}}
\\DeclareUnicodeCharacter{03BB}{\\ensuremath{\\lambda}}
\\DeclareUnicodeCharacter{03BC}{\\ensuremath{\\mu}}
\\DeclareUnicodeCharacter{03C3}{\\ensuremath{\\sigma}}
\\DeclareUnicodeCharacter{03C6}{\\ensuremath{\\phi}}
\\DeclareUnicodeCharacter{03C9}{\\ensuremath{\\omega}}
\\DeclareUnicodeCharacter{0394}{\\ensuremath{\\Delta}}
\\DeclareUnicodeCharacter{03A3}{\\ensuremath{\\Sigma}}
\\DeclareUnicodeCharacter{03A9}{\\ensuremath{\\Omega}}
\\setlength{\\parskip}{0.6em}
\\setlength{\\parindent}{0pt}

\\begin{document}
\\begin{center}
{\\LARGE \\textbf{${escapeLatexText(title)}}}\\\\[0.35em]
{\\large ${escapeLatexText(subtitle)}}
\\end{center}
\\vspace{0.5em}
\\hrule
\\vspace{1em}

${body}

\\end{document}`;
};

export async function POST(request: Request) {
  let tempDir: string | undefined;

  try {
    const body = await request.json();
    const questions = Array.isArray(body?.questions) ? (body.questions as ExportQuestion[]) : [];
    const includeSolutions = Boolean(body?.includeSolutions);
    const title = String(body?.title || 'Custom Exam').trim();
    const subtitle = String(body?.subtitle || '').trim();
    const downloadNameBase = String(body?.downloadName || 'custom-exam').trim() || 'custom-exam';

    if (!questions.length) {
      return Response.json({ error: 'At least one question is required to export a PDF' }, { status: 400 });
    }

    const hasQuestionImages = questions.some((question) => {
      const hasDiagram = Boolean(String(question.graph_image_data || '').trim());
      const hasSolutionImage = includeSolutions && Boolean(String(question.sample_answer_image || '').trim());
      const hasMcqOptionImage = [
        question.mcq_option_a_image,
        question.mcq_option_b_image,
        question.mcq_option_c_image,
        question.mcq_option_d_image,
      ].some((source) => Boolean(String(source || '').trim()));
      return hasDiagram || hasSolutionImage || hasMcqOptionImage;
    });

    const safeBase = downloadNameBase.replace(/[^a-z0-9\-_.]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const filename = `${safeBase || 'custom-exam'}${includeSolutions ? '-with-solutions' : ''}.pdf`;

    let pdfBuffer: Buffer;
    let imagesOmittedInFallback = false;
    try {
      await access(PDFLATEX_PATH, constants.X_OK);

      tempDir = await mkdtemp(path.join(os.tmpdir(), 'export-exam-'));
      const texPath = path.join(tempDir, 'exam.tex');
      const pdfPath = path.join(tempDir, 'exam.pdf');

      const questionsWithAssets = await attachQuestionImageAssets(questions, tempDir, includeSolutions);
      const tex = buildExamLatex({
        title,
        subtitle,
        includeSolutions,
        questions: questionsWithAssets,
      });

      await writeFile(texPath, tex, 'utf8');

      try {
        await execFileAsync(PDFLATEX_PATH, [
          '-interaction=nonstopmode',
          '-halt-on-error',
          '-output-directory',
          tempDir,
          texPath,
        ]);
      } catch (compileError: any) {
        // Retry once with compile-safe text mode to handle malformed OCR/LaTeX fragments
        const safeTex = buildExamLatex({
          title,
          subtitle,
          includeSolutions,
          questions: questionsWithAssets,
          compileSafeMode: true,
        });
        await writeFile(texPath, safeTex, 'utf8');
        try {
          await execFileAsync(PDFLATEX_PATH, [
            '-interaction=nonstopmode',
            '-halt-on-error',
            '-output-directory',
            tempDir,
            texPath,
          ]);
        } catch {
        const stderr = String(compileError?.stderr || '').trim();
        const stdout = String(compileError?.stdout || '').trim();
        let logTail = '';
        try {
          const logPath = path.join(tempDir, 'exam.log');
          const logRaw = await readFile(logPath, 'utf8');
          const lines = logRaw.split(/\r?\n/);
          logTail = lines.slice(-80).join('\n');
        } catch {
          // ignore log extraction failures
        }
        const details = [stderr, stdout, logTail].filter(Boolean).join('\n\n') || String(compileError);
        throw new Error(`pdflatex failed: ${details.slice(0, 6000)}`);
        }
      }

      pdfBuffer = await readFile(pdfPath);
    } catch (localCompileError: any) {
      console.warn('[export-exam-pdf] Local pdflatex failed, falling back to LATEX_TO_PDF_API_URL when possible', localCompileError);
      const isYtoTechApi = LATEX_TO_PDF_API_MODE === 'ytotech' || LATEX_TO_PDF_API_URL.includes('latex.ytotech.com/builds/sync');
      if (hasQuestionImages && !isYtoTechApi) {
        imagesOmittedInFallback = true;
        console.warn('[export-exam-pdf] Embedded images are omitted in API fallback unless using YtoTech multipart endpoint.');
      }

      let apiQuestions: ExportQuestion[] = questions;
      if (hasQuestionImages && isYtoTechApi) {
        if (!tempDir) {
          tempDir = await mkdtemp(path.join(os.tmpdir(), 'export-exam-'));
        }
        apiQuestions = await attachQuestionImageAssets(questions, tempDir, includeSolutions);
      }

      const compileViaLatexApi = async (texInput: string, questionsWithAssets?: ExportQuestion[]) => {
        const queryParams = new URLSearchParams({
          command: 'pdflatex',
          force: 'true',
          download: filename,
        });
        const postUrlWithQuery = `${LATEX_TO_PDF_API_URL}${LATEX_TO_PDF_API_URL.includes('?') ? '&' : '?'}${queryParams.toString()}`;
        const postUrl = isYtoTechApi ? LATEX_TO_PDF_API_URL : postUrlWithQuery;

        const parsePdfResponse = async (response: Response) => {
          if (!response.ok) {
            const details = await response.text().catch(() => 'LaTeX API request failed');
            throw new Error(`LaTeX API error (${response.status}): ${details}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const pdf = Buffer.from(arrayBuffer);
          if (!isPdfBuffer(pdf)) {
            throw new Error(`LaTeX API returned non-PDF payload: ${safeUtf8Preview(pdf)}`);
          }
          return pdf;
        };

        const postAttempts: Array<{ name: string; init: RequestInit }> = [];

        if (isYtoTechApi) {
          const form = new FormData();
          form.set('compiler', 'pdflatex');
          form.set('main', 'main.tex');
          form.append('resources[]', new Blob([texInput], { type: 'text/plain' }), 'main.tex');

          if (questionsWithAssets && tempDir) {
            const assetNames = getReferencedAssetFilenames(questionsWithAssets);
            for (const assetName of assetNames) {
              try {
                const fullPath = path.join(tempDir, assetName);
                const data = await readFile(fullPath);
                const ext = detectImageExt(assetName);
                const mime = ext === 'jpg' ? 'image/jpeg' : 'image/png';
                form.append('resources[]', new Blob([data], { type: mime }), assetName);
              } catch {
                console.warn(`[export-exam-pdf] Could not attach fallback API image resource: ${assetName}`);
              }
            }
          }

          postAttempts.push({
            name: 'multipart-ytotech',
            init: {
              method: 'POST',
              body: form,
            },
          });
        }

        postAttempts.push(
          {
            name: 'form-urlencoded',
            init: {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ text: texInput }).toString(),
            },
          },
          {
            name: 'json',
            init: {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: texInput, command: 'pdflatex', force: true, download: filename }),
            },
          },
          {
            name: 'text-plain',
            init: {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
              body: texInput,
            },
          }
        );

        const postUnsupportedStatuses = new Set([404, 405, 415]);
        let lastPostError = '';

        for (const attempt of postAttempts) {
          const response = await fetchWithTimeout(postUrl, attempt.init, PDF_COMPILE_TIMEOUT_MS);
          if (response.ok) {
            return parsePdfResponse(response);
          }

          if (postUnsupportedStatuses.has(response.status)) {
            lastPostError = `${attempt.name} unsupported (${response.status})`;
            continue;
          }

          const details = await response.text().catch(() => 'LaTeX API request failed');
          throw new Error(`LaTeX API error (${response.status}) on ${attempt.name}: ${details}`);
        }

        if (texInput.length > MAX_GET_TEX_LENGTH) {
          throw new Error(`LaTeX API POST not supported (${lastPostError || 'unknown'}), and payload is too large for GET fallback (${texInput.length} chars > ${MAX_GET_TEX_LENGTH}). Configure LATEX_TO_PDF_API_URL to a POST-capable compiler endpoint (for example https://latex.ytotech.com/builds/sync with LATEX_TO_PDF_API_MODE=ytotech).`);
        }

        const getParams = new URLSearchParams({
          text: texInput,
          command: 'pdflatex',
          force: 'true',
          download: filename,
        });
        const getResponse = await fetchWithTimeout(`${LATEX_TO_PDF_API_URL}?${getParams.toString()}`, {}, PDF_COMPILE_TIMEOUT_MS);
        return parsePdfResponse(getResponse);
      };

      const tex = buildExamLatex({
        title,
        subtitle,
        includeSolutions,
        questions: apiQuestions,
      });

      try {
        pdfBuffer = await compileViaLatexApi(tex, apiQuestions);
      } catch (apiCompileError: any) {
        console.warn('[export-exam-pdf] API compile failed, retrying compile-safe mode', apiCompileError);
        const safeTex = buildExamLatex({
          title,
          subtitle,
          includeSolutions,
          questions: apiQuestions,
          compileSafeMode: true,
        });
        pdfBuffer = await compileViaLatexApi(safeTex, apiQuestions);
      }
    }

    const pdfBody = new Uint8Array(pdfBuffer);

    return new Response(pdfBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        ...(imagesOmittedInFallback ? { 'X-PDF-Warning': 'Images omitted: local pdflatex unavailable on host runtime' } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[export-exam-pdf] Error:', message);
    const actionable = message.includes('question images/diagrams')
      ? `${message} Set PDFLATEX_PATH to a valid binary (for example /usr/bin/pdflatex) or install TeX Live on the server.`
      : message;
    return Response.json(
      { error: 'Failed to export exam PDF', details: actionable },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
