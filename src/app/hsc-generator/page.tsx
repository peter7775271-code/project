'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Undo2, Redo2, Trash2, Send, Upload, ArrowLeft,
  BookOpen, Calculator, Atom, Beaker, ChevronRight,
  RefreshCw, Eye, Download, Bookmark, Settings, Menu, X,
  CheckCircle2, AlertTriangle, XCircle, TrendingUp, Edit2
} from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import { LazyBrush } from 'lazy-brush';
// TikzRenderer no longer used in this page

// LaTeX and TikZ renderer component
function LatexText({ text }: { text: string }) {
  const segments = useMemo(() => {
    const segmentList: Array<{
      type: 'html' | 'tikz';
      content: string;
    }> = [];

    const parts = text.split(
      /(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/
    );

    parts.forEach((part) => {
      if (part.includes('\\begin{tikzpicture}')) {
        segmentList.push({
          type: 'tikz',
          content: part,
        });
      } else if (part.trim()) {
        // HTML/LaTeX part
        segmentList.push({
          type: 'html',
          content: part,
        });
      }
    });

    return segmentList;
  }, [text]);

  return (
    <div className="latex-text">
      {segments.map((segment, i) => {
        if (segment.type === 'tikz') {
          return (
            <div key={`tikz-${i}`} className="tikz-output">
              <TikzBlock code={segment.content} />
            </div>
          );
        }
        return <HtmlSegment key={`html-${i}`} html={segment.content} />;
      })}
    </div>
  );
}

function TikzBlock({ code }: { code: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;

    const renderTikz = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/render-tikz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tikzCode: code }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || `Render failed (${response.status})`);
        }

        if (!isActive) return;

        if (data.svg) {
          setSvg(data.svg);
          setDataUrl(null);
        } else if (data.dataUrl) {
          setDataUrl(data.dataUrl);
          setSvg(null);
        } else if (data.url) {
          setDataUrl(data.url);
          setSvg(null);
        } else {
          throw new Error('Invalid render response');
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Render failed');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    renderTikz();

    return () => {
      isActive = false;
    };
  }, [code]);

  if (loading) {
    return <div style={{ opacity: 0.7 }}>Rendering graph...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--clr-warning-a10)' }}>{error}</div>;
  }

  if (svg) {
    return <div dangerouslySetInnerHTML={{ __html: svg }} />;
  }

  if (dataUrl) {
    return <img src={dataUrl} alt="TikZ" className="w-full h-auto" />;
  }

  return null;
}

// Separate component to handle LaTeX rendering for each HTML segment
function HtmlSegment({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapCellLatex = (cell: string) => {
      const trimmed = cell.trim();
      if (!trimmed) return '';
      if (trimmed.includes('$') || trimmed.includes('\\(') || trimmed.includes('\\[')) {
        return trimmed;
      }
      return `\\(${trimmed}\\)`;
    };

    const convertTabularToHtml = (input: string) => {
      let output = input
        .replace(/\\begin\{center\}|\\end\{center\}/g, '')
        .replace(/\\\[[\s\S]*?\\begin\{tabular\}[\s\S]*?\\end\{tabular\}[\s\S]*?\\\]/g, (match) =>
          match.replace(/\\\[/g, '').replace(/\\\]/g, '')
        )
        .replace(/\\\[[\s\S]*?\\begin\{array\}[\s\S]*?\\end\{array\}[\s\S]*?\\\]/g, (match) =>
          match.replace(/\\\[/g, '').replace(/\\\]/g, '')
        );

      output = output.replace(/\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g, (_match, body) => {
        const rows = body
          .split('\\\\')
          .map((row: string) => row.replace(/\\hline/g, '').trim())
          .filter((row: string) => row.length > 0);

        const tableRows = rows
          .map((row: string) => {
            const cells = row.split('&').map((cell) => wrapCellLatex(cell));
            const tds = cells.map((cell) => `<td>${cell}</td>`).join('');
            return `<tr>${tds}</tr>`;
          })
          .join('');

        return `<div class="latex-table"><table>${tableRows}</table></div>`;
      });

      output = output.replace(/\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}/g, (_match, body) => {
        const rows = body
          .split('\\\\')
          .map((row: string) => row.replace(/\\hline/g, '').trim())
          .filter((row: string) => row.length > 0);

        const tableRows = rows
          .map((row: string) => {
            const cells = row.split('&').map((cell) => wrapCellLatex(cell));
            const tds = cells.map((cell) => `<td>${cell}</td>`).join('');
            return `<tr>${tds}</tr>`;
          })
          .join('');

        return `<div class="latex-table"><table>${tableRows}</table></div>`;
      });

      return output;
    };

    const convertItemizeToHtml = (input: string) => {
      return input.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_match, body) => {
        const items = body
          .split(/\\item/g)
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0);

        const listItems = items
          .map((item: string) => {
            const labelMatch = item.match(/^\[([^\]]+)\]\s*/);
            const label = labelMatch ? labelMatch[1] : null;
            const content = labelMatch ? item.replace(/^\[[^\]]+\]\s*/, '') : item;
            const safeContent = content.trim();
            return label
              ? `<li><span class="item-label">${label}</span> ${safeContent}</li>`
              : `<li>${safeContent}</li>`;
          })
          .join('');

        return `<ul class="latex-list">${listItems}</ul>`;
      });
    };

    const ensureKatex = () => {
      return new Promise<void>((resolve, reject) => {
        const loadScript = (id: string, src: string, onLoad: () => void) => {
          const existing = document.getElementById(id) as HTMLScriptElement | null;
          if (existing) {
            if (existing.getAttribute('data-loaded') === 'true') {
              onLoad();
            } else {
              existing.addEventListener('load', onLoad, { once: true });
              existing.addEventListener('error', () => reject(new Error('Failed to load script')));
            }
            return;
          }

          const script = document.createElement('script');
          script.id = id;
          script.src = src;
          script.async = true;
          script.onload = () => {
            script.setAttribute('data-loaded', 'true');
            onLoad();
          };
          script.onerror = () => reject(new Error('Failed to load script'));
          document.head.appendChild(script);
        };

        if (!document.getElementById('katex-css')) {
          const styleLink = document.createElement('link');
          styleLink.id = 'katex-css';
          styleLink.rel = 'stylesheet';
          styleLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
          document.head.appendChild(styleLink);
        }

        if (!(window as any).katex) {
          loadScript('katex-script', 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js', () => {
            loadScript('katex-auto-render', 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js', () => resolve());
          });
          return;
        }

        if (!(window as any).renderMathInElement) {
          loadScript('katex-auto-render', 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js', () => resolve());
          return;
        }

        resolve();
      });
    };

    const renderLatex = async () => {
      if (!containerRef.current) return;

      const normalizeSpacedLetters = (text: string) => {
        const lines = text.split('\n');
        const output: string[] = [];
        let buffer = '';

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed.length === 1 && /[A-Za-z0-9]/.test(trimmed)) {
            buffer += trimmed;
          } else {
            if (buffer) {
              output.push(buffer);
              buffer = '';
            }
            output.push(line);
          }
        });

        if (buffer) output.push(buffer);

        return output.join('\n');
      };

      const applyTextFormatting = (input: string) => {
        return input.replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>');
      };

      const processedWithTables = applyTextFormatting(
        convertItemizeToHtml(convertTabularToHtml(normalizeSpacedLetters(html)))
      );

      const normalizedMath = processedWithTables
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/(\$\$[\s\S]*?\$\$)/g, '\n$1\n')
        .replace(/(\\\[[\s\S]*?\\\])/g, '\n$1\n');
      const parts = normalizedMath.split(/((?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|\\\[[\s\S]*?\\\]|(?<!\\)\$[^\$]*?(?<!\\)\$)/g);
      const wrapBareLatexCommands = (value: string) => {
        return value.replace(/\\+(leq|geq|le|ge|neq|approx|times)\b/g, '$\\$1$');
      };

      const processed = parts
        .map((part, index) => {
          if (index % 2 === 1) {
            return part.replace(/\\+(leq|geq|le|ge|neq|approx|times)\b/g, '\\$1');
          }
          return wrapBareLatexCommands(
            part
              .replace(/\\%/g, '%')
              .replace(/\\\$/g, '$')
              .replace(/\n/g, '<br />')
          );
        })
        .join('');
      containerRef.current.innerHTML = processed;

      try {
        await ensureKatex();
        if ((window as any).renderMathInElement) {
          (window as any).renderMathInElement(containerRef.current, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\[', right: '\\]', display: true },
              { left: '\\(', right: '\\)', display: false },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
          });
        }
      } catch (e) {
        console.error('LaTeX error:', e);
      }
    };

    renderLatex();
  }, [html]);

  return <div ref={containerRef} style={{ whiteSpace: 'pre-wrap' }} />;
}

type Subject = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

type CriteriaDisplayItem = {
  type: 'heading' | 'criteria';
  text: string;
  marks?: string | null;
  subpart?: string | null;
  key: string;
};

const parseCriteriaForDisplay = (criteriaText: string): CriteriaDisplayItem[] => {
  if (!criteriaText) return [];
  const lines = criteriaText.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const items: CriteriaDisplayItem[] = [];

  lines.forEach((line, idx) => {
    const cleaned = line.replace(/^\s*[•\-]\s*/, '').trim();
    if (!cleaned) return;

    if (/^PART\s+/i.test(cleaned)) {
      items.push({
        type: 'heading',
        text: cleaned.replace(/^PART\s+/i, '').trim(),
        key: `part-${idx}`,
      });
      return;
    }

    const subpartMatch = cleaned.match(/^\((i{1,3}|iv|v|vi|vii|viii|ix|x)\)\s+/i);
    const subpart = subpartMatch ? subpartMatch[1].toLowerCase() : null;
    const rest = subpartMatch ? cleaned.slice(subpartMatch[0].length).trim() : cleaned;

    const marksPrefixMatch = rest.match(/^MARKS_([\d.]+)\s+(.*)$/i);
    const underscoreMatch = rest.match(/^(.*)_([\d.]+)$/);
    const markMatch = marksPrefixMatch || underscoreMatch || rest.match(/([\d.]+)\s*marks?\b/i) || rest.match(/\b([\d.]+)\s*$/);

    if (!markMatch) return;

    const markValue = marksPrefixMatch
      ? marksPrefixMatch[1]
      : underscoreMatch
        ? underscoreMatch[2]
        : markMatch[1];

    const criteriaOnly = marksPrefixMatch
      ? marksPrefixMatch[2].trim()
      : underscoreMatch
        ? underscoreMatch[1].trim()
        : rest
            .replace(/[\d.]+\s*marks?/gi, '')
            .replace(/\b[\d.]+\s*$/, '')
            .replace(/:\s*$/, '')
            .trim();

    items.push({
      type: 'criteria',
      text: criteriaOnly,
      marks: markValue,
      subpart,
      key: `crit-${idx}`,
    });
  });

  return items;
};

const SUBJECTS: Subject[] = [
  { id: 'math-adv', name: 'Mathematics Advanced', icon: <Calculator className="w-5 h-5" /> },
  { id: 'math-ext1', name: 'Mathematics Ext 1', icon: <Calculator className="w-5 h-5" /> },
  { id: 'math-ext2', name: 'Mathematics Ext 2', icon: <Calculator className="w-5 h-5" /> },
];

const HSC_QUESTIONS = [
  "HSC Mathematics Ext 2 (4 marks)\n\nThe complex number $z$ is given by $z = \\sqrt{3} + i$.\n\n(i) Find the modulus and argument of $z$.\n\n(ii) Hence, show that $z^{6}$ is real and find its value.\n\n(iii) Find the least positive integer $n$ such that $z^{n}$ is purely imaginary.",
  "HSC Mathematics Advanced (3 marks)\n\nConsider the function $f(x) = x^3 - 6x^2 + 9x$.\n\n(i) Find the coordinates of the stationary points.\n\n(ii) Determine whether each stationary point is a maximum or minimum.",
  "HSC Mathematics Ext 1 (4 marks)\n\nSolve the equation $\\sin(2x) = \\cos(x)$ for $0 \\leq x \\leq 2\\pi$.",
  "HSC Mathematics Advanced (2 marks)\n\nDifferentiate $y = e^{x} \\ln(x)$ with respect to $x$.",
  "HSC Mathematics Ext 2 (5 marks)\n\nFind the area enclosed between the curves $y = x^2$ and $y = 4 - x^2$.",
  "HSC Mathematics Advanced (3 marks)\n\nIf $\\tan(\\theta) = \\frac{3}{4}$ and $\\theta$ is in the second quadrant, find the exact value of $\\sin(\\theta)$.",
  "HSC Mathematics Ext 1 (4 marks)\n\nProve by mathematical induction that $1^2 + 2^2 + 3^2 + \\ldots + n^2 = \\frac{n(n+1)(2n+1)}{6}$ for all positive integers $n$.",
  "HSC Mathematics Advanced (3 marks)\n\nSolve $2^{x} = 5$ for $x$, giving your answer to 2 decimal places.",
  "HSC Mathematics Ext 2 (4 marks)\n\nFind the general solution to the differential equation $\\frac{dy}{dx} = 2xy$ where $y > 0$.",
  "HSC Mathematics Advanced (2 marks)\n\nSimplify $\\frac{\\sqrt{18} + \\sqrt{8}}{\\sqrt{2}}$.",
];

const MOCK_FEEDBACK = {
  score: 3,
  maxMarks: 4,
  band: 'E4',
  summary: "Strong understanding of complex numbers and De Moivre's Theorem demonstrated. Correctly applied the theorem and found all required values. Minor presentation issue prevented full marks.",
  breakdown: [
    { type: 'success', text: 'Correctly calculated modulus $|z| = 2$ and argument $\\arg(z) = \\frac{\\pi}{6}$.', mark: '+1' },
    { type: 'success', text: 'Correct application of De Moivre\'s Theorem for $z^6 = -64$.', mark: '+1' },
    { type: 'success', text: 'Correctly identified that $n = 3$ for $z^n$ to be purely imaginary.', mark: '+1' },
    { type: 'warning', text: 'Working could be clearer in showing intermediate steps for De Moivre\'s application.', mark: '+0' }
  ]
};

export default function HSCGeneratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  type StrokePoint = [number, number, number];
  type Stroke = StrokePoint[];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const dprRef = useRef(1);
  const activeInputRef = useRef<'pointer' | 'mouse' | 'touch' | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const lazyBrushRef = useRef(
    new LazyBrush({ radius: 0, enabled: false, initialPoint: { x: 0, y: 0 } })
  );
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const examFolderInputRef = useRef<HTMLInputElement | null>(null);

  const historyRef = useRef<Stroke[][]>([]);
  const redoStackRef = useRef<Stroke[][]>([]);

  // Question data from database
  type Question = {
    id: string;
    grade: string;
    year: number;
    subject: string;
    topic: string;
    marks: number;
    question_number?: string | null;
    question_text: string;
    question_type?: 'written' | 'multiple_choice' | null;
    marking_criteria?: string | null;
    sample_answer?: string | null;
    graph_image_data?: string | null;
    graph_image_size?: 'small' | 'medium' | 'large' | null;
    mcq_option_a?: string | null;
    mcq_option_b?: string | null;
    mcq_option_c?: string | null;
    mcq_option_d?: string | null;
    mcq_correct_answer?: 'A' | 'B' | 'C' | 'D' | null;
    mcq_explanation?: string | null;
  };

  const fetchWithTimeout = async (url: string, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const [question, setQuestion] = useState<Question | null>(null);
  const [brushSize, setBrushSize] = useState(2);
  const [canRedo, setCanRedo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [yearLevel, setYearLevel] = useState<'Year 11' | 'Year 12'>('Year 12');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appState, setAppState] = useState<'idle' | 'marking' | 'reviewed'>('idle');
  const [canvasHeight, setCanvasHeight] = useState(400);
  const [loading, setLoading] = useState(true);
  const [isPenDrawing, setIsPenDrawing] = useState(false);
  const [isIpad, setIsIpad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [selectedMcqAnswer, setSelectedMcqAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [savedAttempts, setSavedAttempts] = useState<any[]>([]);
  const [showSavedAttempts, setShowSavedAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [showLatexModal, setShowLatexModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isUpdatingQuestion, setIsUpdatingQuestion] = useState(false);
  const [examImageFiles, setExamImageFiles] = useState<File[]>([]);
  const [criteriaPdfFile, setCriteriaPdfFile] = useState<File | null>(null);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle');
  const [pdfMessage, setPdfMessage] = useState<string>('');
  const [pdfChatGptResponse, setPdfChatGptResponse] = useState<string>('');
  const [pdfGrade, setPdfGrade] = useState<'Year 11' | 'Year 12'>('Year 12');
  const [pdfYear, setPdfYear] = useState<string>(new Date().getFullYear().toString());
  const [pdfSubject, setPdfSubject] = useState<string>('Mathematics Advanced');
  const [pdfOverwrite, setPdfOverwrite] = useState(false);
  const [viewMode, setViewMode] = useState<'generator' | 'saved' | 'settings' | 'dev-questions' | 'papers' | 'paper'>('generator');
  const [isSaving, setIsSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userCreatedAt, setUserCreatedAt] = useState<string>('');
  const [paperQuestions, setPaperQuestions] = useState<Question[]>([]);
  const [paperIndex, setPaperIndex] = useState(0);
  const [activePaper, setActivePaper] = useState<{ year: string; subject: string; grade: string; count: number } | null>(null);

  const fallbackQuestion: Question = {
    id: 'fallback-001',
    grade: yearLevel,
    year: new Date().getFullYear(),
    subject: 'Mathematics',
    topic: 'General',
    marks: 4,
    question_number: null,
    question_text: HSC_QUESTIONS[0],
    question_type: 'written',
    marking_criteria: 'Sample question (fallback mode).',
    sample_answer: 'Sample answer (fallback mode).',
    graph_image_data: null,
    graph_image_size: 'medium',
    mcq_option_a: null,
    mcq_option_b: null,
    mcq_option_c: null,
    mcq_option_d: null,
    mcq_correct_answer: null,
    mcq_explanation: null,
  };

  // Dev mode state
  const [isDevMode, setIsDevMode] = useState(false);
  const [devTab, setDevTab] = useState<'add' | 'manage'>('add');
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [selectedManageQuestionId, setSelectedManageQuestionId] = useState<string | null>(null);
  const [manageQuestionDraft, setManageQuestionDraft] = useState<any | null>(null);
  const [manageQuestionEditMode, setManageQuestionEditMode] = useState(false);
  const [selectedManageQuestionIds, setSelectedManageQuestionIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [manageMissingImagesOnly, setManageMissingImagesOnly] = useState(false);
  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const [manageFilterGrade, setManageFilterGrade] = useState<string>('');
  const [manageFilterYear, setManageFilterYear] = useState<string>('');
  const [manageFilterSubject, setManageFilterSubject] = useState<string>('');
  const [manageFilterTopic, setManageFilterTopic] = useState<string>('');
  const [manageFilterType, setManageFilterType] = useState<'all' | 'written' | 'multiple_choice'>('all');
  const [manageSortKey, setManageSortKey] = useState<'question_number' | 'year' | 'subject' | 'grade' | 'marks' | 'topic'>('question_number');
  const [manageSortDirection, setManageSortDirection] = useState<'asc' | 'desc'>('asc');
  const [newQuestion, setNewQuestion] = useState({
    grade: 'Year 12',
    year: new Date().getFullYear().toString(),
    subject: 'Mathematics Advanced',
    topic: 'Complex Numbers',
    marks: 4,
    questionType: 'written',
    questionNumber: '',
    questionText: '',
    markingCriteria: '',
    sampleAnswer: '',
    mcqOptionA: '',
    mcqOptionB: '',
    mcqOptionC: '',
    mcqOptionD: '',
    mcqCorrectAnswer: 'A',
    mcqExplanation: '',
    graphImageData: '',
    graphImageSize: 'medium',
  });
  const [editQuestion, setEditQuestion] = useState({
    grade: 'Year 12',
    year: new Date().getFullYear().toString(),
    subject: 'Mathematics Advanced',
    topic: 'Complex Numbers',
    marks: 4,
    questionType: 'written',
    questionNumber: '',
    questionText: '',
    markingCriteria: '',
    sampleAnswer: '',
    mcqOptionA: '',
    mcqOptionB: '',
    mcqOptionC: '',
    mcqOptionD: '',
    mcqCorrectAnswer: 'A',
    mcqExplanation: '',
    graphImageData: '',
    graphImageSize: 'medium',
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Filter state
  const [filterGrade, setFilterGrade] = useState<string>(yearLevel);
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterTopic, setFilterTopic] = useState<string>('');

  // Available filter options
  const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025'];

  const SUBJECTS_BY_YEAR: Record<'Year 11' | 'Year 12', string[]> = {
    'Year 11': ['Mathematics Advanced', 'Mathematics Extension 1'],
    'Year 12': ['Mathematics Advanced', 'Mathematics Extension 1', 'Mathematics Extension 2'],
  };

  const TOPICS_BY_YEAR_SUBJECT: Record<'Year 11' | 'Year 12', Record<string, string[]>> = {
    'Year 12': {
      'Mathematics Advanced': [
        'Further graph transformations',
        'Sequences and series',
        'Differential calculus',
        'Integral calculus',
        'Applications of calculus',
        'Random variables',
        'Financial mathematics',
      ],
      'Mathematics Extension 1': [
        'Proof by mathematical induction',
        'Vectors',
        'Inverse trigonometric functions',
        'Further calculus skills',
        'Further applications of calculus',
        'The binomial distribution and sampling distribution of the mean',
      ],
      'Mathematics Extension 2': [
        'The nature of proof',
        'Further work with vectors',
        'Introduction to complex numbers',
        'Further integration',
        'Applications of calculus to mechanics',
      ],
    },
    'Year 11': {
      'Mathematics Advanced': [
        'Working with functions',
        'Trigonometry and measure of angles',
        'Trigonometric identities and equations',
        'Differentiation',
        'Exponential and logarithmic functions',
        'Graph transformations',
        'Probability and data',
      ],
      'Mathematics Extension 1': [
        'Further work with functions',
        'Polynomials',
        'Further trigonometry',
        'Permutations and combinations',
        'The binomial theorem',
      ],
    },
  };

  const getTopics = (gradeValue: string, subjectValue: string) => {
    if (gradeValue !== 'Year 11' && gradeValue !== 'Year 12') return [];
    return TOPICS_BY_YEAR_SUBJECT[gradeValue]?.[subjectValue] || [];
  };

  const parseQuestionNumberForSort = (value: string | null | undefined) => {
    const raw = String(value || '').toLowerCase().trim();
    if (!raw) {
      return { number: Number.POSITIVE_INFINITY, part: '', subpart: 0, raw };
    }
    const match = raw.match(/(\d+)\s*(?:\(?([a-z])\)?)?\s*(?:\(?((?:ix|iv|v?i{0,3}|x))\)?)?/i);
    const number = match?.[1] ? parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
    const part = match?.[2] ? match[2].toLowerCase() : '';
    const roman = match?.[3] ? match[3].toLowerCase() : '';
    const romanMap: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
    const subpart = roman ? (romanMap[roman] || 0) : 0;
    return { number, part, subpart, raw };
  };

  const manageFilterOptions = useMemo(() => {
    const grades = new Set<string>();
    const years = new Set<string>();
    const subjects = new Set<string>();
    const topics = new Set<string>();
    allQuestions.forEach((q) => {
      if (q?.grade) grades.add(String(q.grade));
      if (q?.year) years.add(String(q.year));
      if (q?.subject) subjects.add(String(q.subject));
      if (q?.topic) topics.add(String(q.topic));
    });

    const sortAlpha = (values: Set<string>) => Array.from(values).sort((a, b) => a.localeCompare(b));
    const sortNumeric = (values: Set<string>) => Array.from(values).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    return {
      grades: sortAlpha(grades),
      years: sortNumeric(years),
      subjects: sortAlpha(subjects),
      topics: sortAlpha(topics),
    };
  }, [allQuestions]);

  const availablePapers = useMemo(() => {
    const map = new Map<string, { year: string; subject: string; grade: string; count: number }>();
    allQuestions.forEach((q) => {
      if (!q?.year || !q?.subject || !q?.grade) return;
      const year = String(q.year);
      const subject = String(q.subject);
      const grade = String(q.grade);
      const key = `${year}__${grade}__${subject}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { year, subject, grade, count: 1 });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const yearCompare = Number(b.year) - Number(a.year);
      if (yearCompare !== 0) return yearCompare;
      const gradeCompare = a.grade.localeCompare(b.grade);
      if (gradeCompare !== 0) return gradeCompare;
      return a.subject.localeCompare(b.subject);
    });
  }, [allQuestions]);

  const filteredManageQuestions = useMemo(() => {
    const search = manageSearchQuery.trim().toLowerCase();
    const filtered = allQuestions.filter((q) => {
      if (manageMissingImagesOnly && (q.graph_image_data || q.graph_image_size !== 'missing')) return false;
      if (manageFilterGrade && String(q.grade) !== manageFilterGrade) return false;
      if (manageFilterYear && String(q.year) !== manageFilterYear) return false;
      if (manageFilterSubject && String(q.subject) !== manageFilterSubject) return false;
      if (manageFilterTopic && String(q.topic) !== manageFilterTopic) return false;
      if (manageFilterType !== 'all' && String(q.question_type) !== manageFilterType) return false;
      if (search) {
        const haystack = [q.question_number, q.subject, q.topic, q.question_text, q.grade, q.year]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (manageSortKey === 'question_number') {
        const left = parseQuestionNumberForSort(a.question_number);
        const right = parseQuestionNumberForSort(b.question_number);
        comparison = left.number - right.number || left.part.localeCompare(right.part) || left.subpart - right.subpart || left.raw.localeCompare(right.raw);
      } else if (manageSortKey === 'year') {
        comparison = Number(a.year || 0) - Number(b.year || 0);
      } else if (manageSortKey === 'marks') {
        comparison = Number(a.marks || 0) - Number(b.marks || 0);
      } else if (manageSortKey === 'grade') {
        const left = String(a.grade || '').match(/\d+/)?.[0] || '';
        const right = String(b.grade || '').match(/\d+/)?.[0] || '';
        comparison = Number(left || 0) - Number(right || 0);
      } else if (manageSortKey === 'subject') {
        comparison = String(a.subject || '').localeCompare(String(b.subject || ''));
      } else if (manageSortKey === 'topic') {
        comparison = String(a.topic || '').localeCompare(String(b.topic || ''));
      }

      return manageSortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [
    allQuestions,
    manageSearchQuery,
    manageFilterGrade,
    manageFilterYear,
    manageFilterSubject,
    manageFilterTopic,
    manageFilterType,
    manageSortKey,
    manageSortDirection,
  ]);

  const filteredManageQuestionIds = useMemo(
    () => filteredManageQuestions.map((q) => q.id),
    [filteredManageQuestions]
  );

  // Check user auth and dev mode on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const userJson = localStorage.getItem('user');
      if (!userJson) return;

      const user = JSON.parse(userJson);
      setUserEmail(user.email);
      setUserCreatedAt(user.created_at);

      // Check if user is dev
      if (user.email === 'peter7775271@gmail.com') {
        setIsDevMode(true);
      }
    } catch (e) {
      console.error('Error parsing user:', e);
    }
  }, []);

  useEffect(() => {
    const view = searchParams?.get('view');
    if (view === 'papers') {
      setViewMode('papers');
    } else if (view === 'generator') {
      setViewMode('generator');
    }
  }, [searchParams]);

  // Fetch questions when entering dev mode
  useEffect(() => {
    if (viewMode === 'dev-questions' && devTab === 'manage') {
      fetchAllQuestions();
    }
  }, [viewMode, devTab]);

  useEffect(() => {
    if (viewMode === 'papers' || viewMode === 'paper') {
      if (!allQuestions.length && !loadingQuestions) {
        fetchAllQuestions();
      }
    }
  }, [viewMode, allQuestions.length, loadingQuestions]);

  useEffect(() => {
    if (!allQuestions.length) return;
    const hasMissingImages = allQuestions.some(
      (q) => !q.graph_image_data && q.graph_image_size === 'missing'
    );
    if (hasMissingImages) {
      setIsDevMode(true);
    }
  }, [allQuestions]);

  useEffect(() => {
    if (devTab !== 'manage') return;
    if (!allQuestions.length) {
      setSelectedManageQuestionId(null);
      setManageQuestionDraft(null);
      setManageQuestionEditMode(false);
      setSelectedManageQuestionIds([]);
      return;
    }
    if (!selectedManageQuestionId) {
      setManageQuestionDraft(null);
      setManageQuestionEditMode(false);
    }
  }, [allQuestions, devTab, selectedManageQuestionId]);

  useEffect(() => {
    if (!selectedManageQuestionIds.length) return;
    const availableIds = new Set(allQuestions.map((q) => q.id));
    setSelectedManageQuestionIds((prev) => prev.filter((id) => availableIds.has(id)));
  }, [allQuestions, selectedManageQuestionIds.length]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const cssWidth = canvas.offsetWidth;
    const cssHeight = canvasHeight;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'white';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctxRef.current = ctx;

    if (historyRef.current.length > 0) {
      const latest = historyRef.current[historyRef.current.length - 1];
      strokesRef.current = latest.map((stroke) => stroke.map((p) => [...p] as StrokePoint));
    } else {
      strokesRef.current = [];
      historyRef.current = [[]];
    }

    renderAllStrokes(false);
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(redoStackRef.current.length > 0);
  }, [canvasHeight, brushSize]);

  useEffect(() => {
    if (!examFolderInputRef.current) return;
    examFolderInputRef.current.setAttribute('webkitdirectory', '');
    examFolderInputRef.current.setAttribute('directory', '');
  }, []);

  // Draw exam-style ruled lines
  const drawLines = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !canvas) return;

    const spacing = 34;
    const dpr = dprRef.current || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;

    for (let y = spacing; y < logicalHeight; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(logicalWidth - 10, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Redraw background before strokes (so lines never disappear)
  const redrawBackground = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !canvas) return;

    const dpr = dprRef.current || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    drawLines();
  };

  const drawStrokePath = (stroke: Stroke) => {
    if (!stroke.length) return;
    const outline = getStroke(stroke, {
      size: Math.max(2, brushSize * 2),
      thinning: 0.3,
      smoothing: 0.3,
      streamline: 0.2,
      simulatePressure: false,
    });
    if (!outline.length) return;
    const path = new Path2D();
    outline.forEach(([x, y], i) => {
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    path.closePath();
    ctxRef.current?.fill(path);
  };

  const renderAllStrokes = (includeCurrent = true) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    redrawBackground();

    if (backgroundImageRef.current) {
      const dpr = dprRef.current || 1;
      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;
      ctx.drawImage(backgroundImageRef.current, 0, 0, logicalWidth, logicalHeight);
    }

    ctx.fillStyle = 'white';
    strokesRef.current.forEach(drawStrokePath);
    if (includeCurrent && currentStrokeRef.current) {
      drawStrokePath(currentStrokeRef.current);
    }
  };

  // History handling
  const cloneStrokes = (strokes: Stroke[]) =>
    strokes.map((stroke) => stroke.map((p) => [...p] as StrokePoint));

  const saveState = () => {
    historyRef.current.push(cloneStrokes(strokesRef.current));
    if (historyRef.current.length > 50) historyRef.current.shift();

    redoStackRef.current = [];
    setCanRedo(false);
    setCanUndo(historyRef.current.length > 1);
  };

  const restoreState = (strokes: Stroke[]) => {
    strokesRef.current = cloneStrokes(strokes);
    renderAllStrokes(false);
  };

  // Drawing - optimized for pen + touch
  const lastPosRef = useRef<[number, number]>([0, 0]);


  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return [0, 0];
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    return [x, y];
  };

  const beginStroke = (clientX: number, clientY: number, pressure = 0.5) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    drawingRef.current = true;
    const point: StrokePoint = [x, y, Math.max(0.1, pressure)];
    currentStrokeRef.current = [point];
    lastPosRef.current = [x, y];
    renderAllStrokes(true);
  };

  const moveStroke = (clientX: number, clientY: number, pressure = 0.5) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const point: StrokePoint = [x, y, Math.max(0.1, pressure)];
    if (!currentStrokeRef.current) currentStrokeRef.current = [];
    currentStrokeRef.current.push(point);
    lastPosRef.current = [x, y];
    renderAllStrokes(true);
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setIsPenDrawing(false);
    if (currentStrokeRef.current && currentStrokeRef.current.length) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
      renderAllStrokes(false);
      saveState();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeInputRef.current === 'pointer') return;
    e.preventDefault();
    activeInputRef.current = 'mouse';
    beginStroke(e.clientX, e.clientY, 0.5);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    if (activeInputRef.current === 'pointer') return;
    e.preventDefault();
    moveStroke(e.clientX, e.clientY, 0.5);
  };

  const handleMouseUp = () => {
    endStroke();
    if (activeInputRef.current === 'mouse') {
      activeInputRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.pointerType === 'pen') {
      e.currentTarget.style.touchAction = 'none';
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    activeInputRef.current = 'pointer';
    if (e.pointerType === 'pen') {
      setIsPenDrawing(true);
    }
    const pressure = Math.max(0.1, e.pressure || 0.4);
    beginStroke(e.clientX, e.clientY, pressure);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    if (activeInputRef.current !== 'pointer') return;
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    e.stopPropagation();
    const pressure = Math.max(0.1, e.pressure || 0.4);
    moveStroke(e.clientX, e.clientY, pressure);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeInputRef.current !== 'pointer') return;
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (e.pointerType === 'pen') {
      e.currentTarget.style.touchAction = 'pan-y';
    }
    endStroke();
    if (e.pointerType === 'pen') {
      setIsPenDrawing(false);
    }
    activeInputRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (activeInputRef.current === 'pointer') return;
    if (e.touches.length >= 2) return;
    const touch = e.touches[0];
    const isStylus = (touch as any).touchType === 'stylus';
    if (isIpad && !isStylus) return;
    e.preventDefault();
    if (isStylus) {
      e.currentTarget.style.touchAction = 'none';
    }
    activeInputRef.current = 'touch';
    setIsPenDrawing(true);
    const pressure = Math.max(0.1, (touch as any).force || 0.5);
    beginStroke(touch.clientX, touch.clientY, pressure);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    if (activeInputRef.current === 'pointer') return;
    if (e.touches.length >= 2) return;
    const touch = e.touches[0];
    const isStylus = (touch as any).touchType === 'stylus';
    if (isIpad && !isStylus) return;
    e.preventDefault();
    const pressure = Math.max(0.1, (touch as any).force || 0.5);
    moveStroke(touch.clientX, touch.clientY, pressure);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length >= 2) return;
    e.preventDefault();
    e.currentTarget.style.touchAction = 'pan-y';
    endStroke();
    if (activeInputRef.current === 'touch') {
      activeInputRef.current = null;
    }
  };

  // Controls
  const undo = () => {
    if (historyRef.current.length <= 1) return;
    redoStackRef.current.push(historyRef.current.pop()!);
    restoreState(historyRef.current[historyRef.current.length - 1]);
    setCanRedo(true);
    setCanUndo(historyRef.current.length > 1);
  };

  const redo = () => {
    if (!redoStackRef.current.length) return;
    const state = redoStackRef.current.pop()!;
    historyRef.current.push(state);
    restoreState(state);
    setCanRedo(redoStackRef.current.length > 0);
    setCanUndo(true);
  };

  const saveAttempt = async () => {
    if (!question || !feedback) return;
    
    try {
      // For now, we'll store attempts in localStorage since we don't have user auth
      const attempt = {
        id: Date.now(),
        questionId: question.id,
        questionText: question.question_text,
        questionType: question.question_type || 'written',
        marks: question.marks,
        subject: question.subject,
        topic: question.topic,
        questionNumber: question.question_number || null,
        graphImageData: question.graph_image_data || null,
        graphImageSize: question.graph_image_size || 'medium',
        mcqOptionA: question.mcq_option_a || null,
        mcqOptionB: question.mcq_option_b || null,
        mcqOptionC: question.mcq_option_c || null,
        mcqOptionD: question.mcq_option_d || null,
        mcqCorrectAnswer: question.mcq_correct_answer || null,
        mcqExplanation: question.mcq_explanation || null,
        submittedAnswer: submittedAnswer,
        feedback: feedback,
        sampleAnswer: question.sample_answer,
        savedAt: new Date().toISOString(),
      };
      
      const existingAttempts = JSON.parse(localStorage.getItem('savedAttempts') || '[]');
      existingAttempts.push(attempt);
      localStorage.setItem('savedAttempts', JSON.stringify(existingAttempts));
      
      setSavedAttempts(existingAttempts);
      setError(null);
      setIsSaving(true);
      setTimeout(() => setIsSaving(false), 1500);
    } catch (err) {
      console.error('Error saving attempt:', err);
      setError('Failed to save answer');
    }
  };

  const loadSavedAttempts = () => {
    try {
      const attempts = JSON.parse(localStorage.getItem('savedAttempts') || '[]');
      setSavedAttempts(attempts);
      setViewMode('saved');
      setSelectedAttempt(null);
    } catch (err) {
      console.error('Error loading attempts:', err);
    }
  };

  const addQuestionToDatabase = async () => {
    try {
      setIsAddingQuestion(true);
      const response = await fetch('/api/hsc/add-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion),
      });

      if (response.ok) {
        alert('Question added successfully!');
        setNewQuestion({
          grade: 'Year 12',
          year: new Date().getFullYear().toString(),
          subject: 'Mathematics Advanced',
          topic: 'Complex Numbers',
          marks: 4,
          questionType: 'written',
          questionNumber: '',
          questionText: '',
          markingCriteria: '',
          sampleAnswer: '',
          mcqOptionA: '',
          mcqOptionB: '',
          mcqOptionC: '',
          mcqOptionD: '',
          mcqCorrectAnswer: 'A',
          mcqExplanation: '',
          graphImageData: '',
          graphImageSize: 'medium',
        });
        // Reload questions list
        fetchAllQuestions();
      } else {
        alert('Failed to add question');
      }
    } catch (err) {
      console.error('Error adding question:', err);
      alert('Error adding question');
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const openEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setEditQuestion({
      grade: q.grade,
      year: String(q.year),
      subject: q.subject,
      topic: q.topic,
      marks: q.marks,
      questionType: q.question_type || 'written',
      questionNumber: q.question_number || '',
      questionText: q.question_text,
      markingCriteria: q.marking_criteria,
      sampleAnswer: q.sample_answer,
      mcqOptionA: q.mcq_option_a || '',
      mcqOptionB: q.mcq_option_b || '',
      mcqOptionC: q.mcq_option_c || '',
      mcqOptionD: q.mcq_option_d || '',
      mcqCorrectAnswer: q.mcq_correct_answer || 'A',
      mcqExplanation: q.mcq_explanation || '',
      graphImageData: q.graph_image_data || '',
      graphImageSize: q.graph_image_size || 'medium',
    });
    setShowEditModal(true);
  };

  const updateQuestionInDatabase = async () => {
    if (!editingQuestionId) return;

    try {
      setIsUpdatingQuestion(true);
      const response = await fetch('/api/hsc/update-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: editingQuestionId,
          ...editQuestion,
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        const updated = Array.isArray(data) ? data[0] : null;
        setAllQuestions(
          allQuestions.map((q) => (q.id === editingQuestionId && updated ? updated : q))
        );
        setShowEditModal(false);
        setEditingQuestionId(null);
      } else {
        alert('Failed to update question');
      }
    } catch (err) {
      console.error('Error updating question:', err);
      alert('Error updating question');
    } finally {
      setIsUpdatingQuestion(false);
    }
  };

  const submitPdfPair = async () => {
    if (!examImageFiles.length && !criteriaPdfFile) {
      setPdfStatus('error');
      setPdfMessage('Please select exam images or a criteria PDF.');
      return;
    }

    if (!pdfYear || !pdfSubject) {
      setPdfStatus('error');
      setPdfMessage('Please select a year and subject.');
      return;
    }

    const sendPdf = async (payload: FormData, label: string) => {
      setPdfStatus('uploading');
      setPdfMessage(`Uploading ${label}...`);

      const response = await fetch('/api/hsc/pdf-ingest', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Failed to upload ${label}`);
      }
      if (data?.chatgpt) {
        setPdfChatGptResponse((prev) => (prev ? `${prev}\n\n${data.chatgpt}` : data.chatgpt));
      }
      return data;
    };

    try {
      setPdfChatGptResponse('');
      if (examImageFiles.length && criteriaPdfFile) {
        const examData = new FormData();
        examImageFiles.forEach((file) => examData.append('examImages', file));
        examData.append('grade', pdfGrade);
        examData.append('year', pdfYear);
        examData.append('subject', pdfSubject);
        examData.append('overwrite', pdfOverwrite ? 'true' : 'false');
        await sendPdf(examData, 'exam images');

        const criteriaData = new FormData();
        criteriaData.append('criteria', criteriaPdfFile);
        criteriaData.append('grade', pdfGrade);
        criteriaData.append('year', pdfYear);
        criteriaData.append('subject', pdfSubject);
        criteriaData.append('overwrite', pdfOverwrite ? 'true' : 'false');
        const criteriaResponse = await sendPdf(criteriaData, 'criteria PDF');

        setPdfStatus('ready');
        setPdfMessage(criteriaResponse?.message || 'Files received.');
        return;
      }

      const singleData = new FormData();
      examImageFiles.forEach((file) => singleData.append('examImages', file));
      if (criteriaPdfFile) {
        singleData.append('criteria', criteriaPdfFile);
      }
      singleData.append('grade', pdfGrade);
      singleData.append('year', pdfYear);
      singleData.append('subject', pdfSubject);
      singleData.append('overwrite', pdfOverwrite ? 'true' : 'false');

      const data = await sendPdf(singleData, examImageFiles.length ? 'exam images' : 'criteria PDF');
      setPdfStatus('ready');
      setPdfMessage(data?.message || 'Files received.');
    } catch (err) {
      setPdfStatus('error');
      setPdfMessage(err instanceof Error ? err.message : 'Failed to submit intake');
    }
  };

  const extractMarksAwarded = (evaluation: string, maxMarks: number) => {
    if (!evaluation) return null;
    const match = evaluation.match(/Marks\s*Awarded:\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return null;
    const awarded = parseFloat(match[1]);
    if (Number.isNaN(awarded)) return null;
    return Math.min(Math.max(awarded, 0), maxMarks);
  };

  const analyzeAnswerImage = (dataUrl: string) => {
    return new Promise<{ lowInk: boolean; inkRatio: number; darkPixels: number }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.floor(img.width * scale));
        const h = Math.max(1, Math.floor(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ lowInk: false, inkRatio: 1, darkPixels: 0 });
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const totalPixels = w * h;
        let opaquePixels = 0;
        let transparentPixels = 0;
        let darkPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 10) {
            transparentPixels += 1;
            continue;
          }

          if (a > 200) {
            opaquePixels += 1;
          }

          const gray = (r + g + b) / 3;
          if (gray < 220 && a > 20) {
            darkPixels += 1;
          }
        }

        const transparentRatio = totalPixels ? transparentPixels / totalPixels : 0;
        const opaqueRatio = totalPixels ? opaquePixels / totalPixels : 0;
        const opaqueInkRatio = totalPixels ? opaquePixels / totalPixels : 0;
        const darkInkRatio = totalPixels ? darkPixels / totalPixels : 0;

        const inkRatio = Math.max(opaqueInkRatio, darkInkRatio);
        const lowInk = transparentRatio > 0.4
          ? (opaquePixels < 40 && inkRatio < 0.0002)
          : (darkPixels < 40 && inkRatio < 0.0002 && opaqueRatio > 0.99);

        resolve({ lowInk, inkRatio, darkPixels });
      };
      img.onerror = () => resolve({ lowInk: false, inkRatio: 1, darkPixels: 0 });
      img.src = dataUrl;
    });
  };

  const handleGraphUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNewQuestion({ ...newQuestion, graphImageData: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleGraphPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;

        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setNewQuestion({ ...newQuestion, graphImageData: dataUrl });
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  const handleEditGraphUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setEditQuestion({ ...editQuestion, graphImageData: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleEditGraphPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;

        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setEditQuestion({ ...editQuestion, graphImageData: dataUrl });
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  const fetchAllQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const response = await fetch('/api/hsc/all-questions');
      if (response.ok) {
        const data = await response.json();
        setAllQuestions(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch questions');
        setAllQuestions([]);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setAllQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      setDeletingQuestionId(questionId);
      const response = await fetch('/api/hsc/delete-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });

      if (response.ok) {
        alert('Question deleted successfully!');
        // Remove from local list
        setAllQuestions(allQuestions.filter(q => q.id !== questionId));
      } else {
        alert('Failed to delete question');
      }
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Error deleting question');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const toggleManageSelection = (questionId: string, shouldSelect?: boolean) => {
    setSelectedManageQuestionIds((prev) => {
      const alreadySelected = prev.includes(questionId);
      if (shouldSelect === true && alreadySelected) return prev;
      if (shouldSelect === false && !alreadySelected) return prev;
      if (alreadySelected) {
        return prev.filter((id) => id !== questionId);
      }
      return [...prev, questionId];
    });
  };

  const setAllManageSelections = (selectAll: boolean, ids?: string[]) => {
    const targetIds = ids && ids.length ? ids : allQuestions.map((q) => q.id);
    if (!selectAll) {
      setSelectedManageQuestionIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      return;
    }
    setSelectedManageQuestionIds((prev) => {
      const next = new Set(prev);
      targetIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const deleteSelectedQuestions = async () => {
    if (!selectedManageQuestionIds.length) return;
    if (!confirm(`Delete ${selectedManageQuestionIds.length} selected question(s)?`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      for (const questionId of selectedManageQuestionIds) {
        await fetch('/api/hsc/delete-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId }),
        });
      }

      const remaining = allQuestions.filter((q) => !selectedManageQuestionIds.includes(q.id));
      setAllQuestions(remaining);
      setSelectedManageQuestionIds([]);
      if (selectedManageQuestionId && selectedManageQuestionIds.includes(selectedManageQuestionId)) {
        setSelectedManageQuestionId(null);
        setManageQuestionDraft(null);
        setManageQuestionEditMode(false);
      }
    } catch (err) {
      console.error('Error deleting selected questions:', err);
      alert('Failed to delete selected questions');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const clearSelectedMarkingCriteria = async () => {
    if (!selectedManageQuestionIds.length) return;
    if (!confirm(`Clear marking criteria for ${selectedManageQuestionIds.length} selected question(s)?`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const selectedSet = new Set(selectedManageQuestionIds);
      const updates = allQuestions.filter((q) => selectedSet.has(q.id));

      for (const q of updates) {
        await fetch('/api/hsc/update-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: q.id,
            grade: q.grade,
            year: String(q.year),
            subject: q.subject,
            topic: q.topic,
            marks: q.marks,
            questionNumber: q.question_number,
            questionText: q.question_text,
            markingCriteria: null,
            sampleAnswer: q.sample_answer,
            graphImageData: q.graph_image_data,
            graphImageSize: q.graph_image_size,
            questionType: q.question_type,
            mcqOptionA: q.mcq_option_a,
            mcqOptionB: q.mcq_option_b,
            mcqOptionC: q.mcq_option_c,
            mcqOptionD: q.mcq_option_d,
            mcqCorrectAnswer: q.mcq_correct_answer,
            mcqExplanation: q.mcq_explanation,
          }),
        });
      }

      setAllQuestions((prev) =>
        prev.map((q) => (selectedSet.has(q.id) ? { ...q, marking_criteria: null } : q))
      );

      if (manageQuestionDraft && selectedSet.has(manageQuestionDraft.id)) {
        setManageQuestionDraft({ ...manageQuestionDraft, marking_criteria: null });
      }
    } catch (err) {
      console.error('Error clearing marking criteria:', err);
      alert('Failed to clear marking criteria');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const clearAllQuestions = async () => {
    if (!confirm('This will permanently delete ALL questions. Continue?')) {
      return;
    }

    try {
      setLoadingQuestions(true);
      const response = await fetch('/api/hsc/clear-questions', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to clear questions');
      }
      setAllQuestions([]);
      setSelectedManageQuestionId(null);
      setManageQuestionDraft(null);
    } catch (err) {
      console.error('Error clearing questions:', err);
      alert(err instanceof Error ? err.message : 'Failed to clear questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const saveManageQuestion = async () => {
    if (!manageQuestionDraft?.id) return;

    try {
      const response = await fetch('/api/hsc/update-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: manageQuestionDraft.id,
          grade: manageQuestionDraft.grade,
          year: manageQuestionDraft.year,
          subject: manageQuestionDraft.subject,
          topic: manageQuestionDraft.topic,
          marks: manageQuestionDraft.marks,
          questionNumber: manageQuestionDraft.question_number,
          questionText: manageQuestionDraft.question_text,
          markingCriteria: manageQuestionDraft.marking_criteria,
          sampleAnswer: manageQuestionDraft.sample_answer,
          graphImageData: manageQuestionDraft.graph_image_data,
          graphImageSize: manageQuestionDraft.graph_image_size,
          questionType: manageQuestionDraft.question_type,
          mcqOptionA: manageQuestionDraft.mcq_option_a,
          mcqOptionB: manageQuestionDraft.mcq_option_b,
          mcqOptionC: manageQuestionDraft.mcq_option_c,
          mcqOptionD: manageQuestionDraft.mcq_option_d,
          mcqCorrectAnswer: manageQuestionDraft.mcq_correct_answer,
          mcqExplanation: manageQuestionDraft.mcq_explanation,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update question');
      }

      const updated = Array.isArray(result.data) ? result.data[0] : result.data;
      if (updated) {
        setAllQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
        setManageQuestionDraft(updated);
      }
    } catch (err) {
      console.error('Error updating question:', err);
      alert(err instanceof Error ? err.message : 'Failed to update question');
    }
  };

  const clearCanvas = () => {
    // Clear all history and redo stacks
    historyRef.current = [[]];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    strokesRef.current = [];
    currentStrokeRef.current = null;
    backgroundImageRef.current = null;
    
    // Clear the canvas
    renderAllStrokes(false);
  };

  const submitAnswer = async () => {
    if (!question) return;

    if (question.question_type === 'multiple_choice') {
      if (!selectedMcqAnswer) {
        setError('Please select an answer option before submitting.');
        return;
      }

      const correctAnswer = question.mcq_correct_answer ? question.mcq_correct_answer.toUpperCase() : null;
      const isCorrect = correctAnswer === selectedMcqAnswer;
      const score = isCorrect ? question.marks : 0;

      setSubmittedAnswer(selectedMcqAnswer);
      setError(null);
      setFeedback({
        score,
        maxMarks: question.marks,
        marking_criteria: null,
        sample_answer: question.sample_answer,
        ai_evaluation: null,
        mcq_correct_answer: correctAnswer,
        mcq_explanation: question.mcq_explanation || null,
        mcq_selected_answer: selectedMcqAnswer,
      });
      setAppState('reviewed');
      return;
    }

    if (!question.marking_criteria || !question.sample_answer) {
      setError('Marking is unavailable for this question (missing criteria or sample answer).');
      setTimeout(() => setAppState('idle'), 300);
      return;
    }
    
    try {
      setAppState('marking');
      let imageDataUrl: string;
      
      // Use uploaded file if available, otherwise use canvas drawing
      if (uploadedFile) {
        imageDataUrl = uploadedFile;
      } else {
        // Get the canvas image as base64
        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error('Canvas not found');
        }
        imageDataUrl = canvas.toDataURL('image/png');
      }
      
      const { lowInk } = await analyzeAnswerImage(imageDataUrl);

      // Save the submitted answer for review
      setSubmittedAnswer(imageDataUrl);
      
      // Send to AI for marking
      const response = await fetch('/api/hsc/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionText: question.question_text,
          markingCriteria: question.marking_criteria,
          sampleAnswer: question.sample_answer,
          maxMarks: question.marks,
          userAnswerImage: imageDataUrl,
          answerQualityHint: lowInk ? 'low_ink' : 'normal',
        }),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to get AI marking');
      }
      
      const data = await response.json();

      const awardedMarks = extractMarksAwarded(data.evaluation, question.marks);
      
      setFeedback({
        score: awardedMarks,
        maxMarks: question.marks,
        marking_criteria: question.marking_criteria,
        sample_answer: question.sample_answer,
        ai_evaluation: data.evaluation,
      });
      setAppState('reviewed');
      
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
      setAppState('idle');
    }
  };

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Store the uploaded file for submission
      setUploadedFile(dataUrl);
      // Also display it on the canvas as background
      const img = new Image();
      img.onload = () => {
        backgroundImageRef.current = img;
        renderAllStrokes(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const generateQuestion = async () => {
    setIsGenerating(true);
    setError(null);
    setShowAnswer(false);
    setCanvasHeight(400);
    setAppState('idle');
    setFeedback(null);
    setUploadedFile(null);
    setSubmittedAnswer(null);
    setSelectedMcqAnswer(null);
    setTimeout(() => resetCanvas(400), 0);
    
    // Clear history
    historyRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);

    try {
      const params = new URLSearchParams();
      if (filterGrade) params.append('grade', filterGrade);
      if (filterYear) params.append('year', filterYear);
      if (filterSubject) params.append('subject', filterSubject);
      if (filterTopic) params.append('topic', filterTopic);

      const response = await fetchWithTimeout(`/api/hsc/questions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch question (${response.status})`);
      }

      const data = await response.json();
      setQuestion(data.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question');
      setQuestion(fallbackQuestion);
      console.error('Error fetching question:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetCanvas = (height?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const targetHeight = height ?? canvasHeight;
    canvas.width = canvas.offsetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'white';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctxRef.current = ctx;
    redrawBackground();

    strokesRef.current = [];
    currentStrokeRef.current = null;
    backgroundImageRef.current = null;
    historyRef.current = [[]];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  };

  const extendCanvas = () => {
    setCanvasHeight((prev) => prev + 300);
  };

  const resetForQuestion = (nextQuestion: Question | null) => {
    setQuestion(nextQuestion);
    setAppState('idle');
    setFeedback(null);
    setError(null);
    setShowAnswer(false);
    setUploadedFile(null);
    setSubmittedAnswer(null);
    setSelectedMcqAnswer(null);
    setCanvasHeight(400);
    setTimeout(() => resetCanvas(400), 0);

    historyRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  };

  const clearPaperState = () => {
    setActivePaper(null);
    setPaperQuestions([]);
    setPaperIndex(0);
  };

  const startPaperAttempt = (paper: { year: string; subject: string; grade: string; count: number }) => {
    const matching = allQuestions
      .filter(
        (q) =>
          String(q.year) === paper.year &&
          String(q.subject) === paper.subject &&
          String(q.grade) === paper.grade
      )
      .sort((a, b) => {
        const left = parseQuestionNumberForSort(a.question_number);
        const right = parseQuestionNumberForSort(b.question_number);
        return left.number - right.number || left.part.localeCompare(right.part) || left.subpart - right.subpart || left.raw.localeCompare(right.raw);
      });

    if (!matching.length) {
      alert('No questions found for this paper yet.');
      return;
    }

    setActivePaper(paper);
    setPaperQuestions(matching as Question[]);
    setPaperIndex(0);
    setViewMode('paper');
    resetForQuestion(matching[0] as Question);
  };

  const goToPaperQuestion = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= paperQuestions.length) return;
    setPaperIndex(nextIndex);
    resetForQuestion(paperQuestions[nextIndex]);
  };

  // Initial load
  useEffect(() => {
    const loadInitialQuestion = async () => {
      try {
        setLoading(true);
        const response = await fetchWithTimeout(`/api/hsc/questions?grade=${yearLevel}`);
        if (!response.ok) {
          throw new Error(`Failed to load question (${response.status})`);
        }
        const data = await response.json();
        setQuestion(data.question);
      } catch (err) {
        console.error('Error loading initial question:', err);
        setError(err instanceof Error ? err.message : 'Failed to load question');
        setQuestion(fallbackQuestion);
      } finally {
        setLoading(false);
      }
    };

    loadInitialQuestion();
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isiPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
    setIsIpad(isiPad);
  }, []);

  const awardedMarks = typeof feedback?.score === 'number' ? feedback.score : null;
  const maxMarks = feedback?.maxMarks ?? 0;
  const isMultipleChoiceReview = question?.question_type === 'multiple_choice' || feedback?.mcq_correct_answer;
  const isMarking = appState === 'marking';
  const isPaperMode = viewMode === 'paper';
  const paperProgress = paperQuestions.length ? (paperIndex + 1) / paperQuestions.length : 0;

  return (
    <div 
      className="min-h-screen font-serif selection:bg-white/20 flex flex-col"
      style={{
        backgroundColor: 'var(--clr-surface-a0)',
        color: 'var(--clr-primary-a50)'
      }}
    >
      <style jsx global>{`
        body { 
          font-family: 'CMU Serif', serif; 
          background-color: var(--clr-surface-a0);
          color: var(--clr-primary-a50);
        }
        .latex-list {
          list-style: none;
          padding-left: 0;
          margin: 0.25rem 0;
        }
        .latex-list li {
          margin: 0.25rem 0;
        }
        .latex-list .item-label {
          font-weight: 600;
          margin-right: 0.5rem;
        }
      `}</style>

      {isMarking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div
            className="rounded-2xl border shadow-2xl px-8 py-6 text-center"
            style={{
              backgroundColor: 'var(--clr-surface-a0)',
              borderColor: 'var(--clr-surface-tonal-a20)',
            }}
          >
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--clr-surface-a40)' }} />
            <div className="text-lg font-semibold" style={{ color: 'var(--clr-primary-a50)' }}>
              Marking your response…
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--clr-surface-a50)' }}>
              Please wait while we assess your work.
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div 
        className="lg:hidden flex items-center justify-between p-4 border-b sticky top-0 z-50 backdrop-blur-md"
        style={{
          backgroundColor: 'var(--clr-surface-a10)',
          borderColor: 'var(--clr-surface-tonal-a20)',
        }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl"
            style={{
              backgroundColor: 'var(--clr-primary-a0)',
              color: 'var(--clr-dark-a0)',
            }}
          >
            ∑
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--clr-primary-a50)' }}>HSC Forge</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 cursor-pointer">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-40 w-72 border-r transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:h-auto
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{
            backgroundColor: 'var(--clr-surface-a10)',
            borderColor: 'var(--clr-surface-tonal-a20)',
          }}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="hidden lg:flex items-center gap-3 mb-10">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xl"
                style={{
                  backgroundColor: 'var(--clr-primary-a0)',
                  color: 'var(--clr-dark-a0)',
                }}
              >
                ∑
              </div>
              <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--clr-primary-a50)' }}>HSC Forge</span>
            </div>

            <div className="space-y-2 mb-6">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2 px-2"
                style={{ color: 'var(--clr-surface-a40)' }}
              >Navigation</p>
              <button
                onClick={() => {
                  setViewMode('generator');
                  clearPaperState();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  viewMode === 'generator' ? 'shadow-lg' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: viewMode === 'generator' ? 'var(--clr-primary-a0)' : 'transparent',
                  color: viewMode === 'generator' ? 'var(--clr-dark-a0)' : 'var(--clr-surface-a40)',
                }}
              >
                <span className="font-medium text-sm">Browse HSC Questions</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('papers');
                  clearPaperState();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  viewMode === 'papers' || viewMode === 'paper' ? 'shadow-lg' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: viewMode === 'papers' || viewMode === 'paper' ? 'var(--clr-primary-a0)' : 'transparent',
                  color: viewMode === 'papers' || viewMode === 'paper' ? 'var(--clr-dark-a0)' : 'var(--clr-surface-a40)',
                }}
              >
                <span className="font-medium text-sm">Browse HSC Papers</span>
              </button>
            </div>

            {viewMode === 'generator' && (
              <div className="space-y-1 flex-1">
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-4 px-2"
                  style={{ color: 'var(--clr-surface-a40)' }}
                >Quick Filters</p>
                <button
                  onClick={() => { setFilterGrade('Year 11'); setViewMode('generator'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    filterGrade === 'Year 11'
                      ? 'shadow-lg'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: filterGrade === 'Year 11' ? 'var(--clr-primary-a0)' : 'transparent',
                    color: filterGrade === 'Year 11' ? 'var(--clr-dark-a0)' : 'var(--clr-surface-a40)',
                  }}
                >
                  <span className="font-medium text-sm">Year 11</span>
                </button>
                <button
                  onClick={() => { setFilterGrade('Year 12'); setViewMode('generator'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    filterGrade === 'Year 12'
                      ? 'shadow-lg'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: filterGrade === 'Year 12' ? 'var(--clr-primary-a0)' : 'transparent',
                    color: filterGrade === 'Year 12' ? 'var(--clr-dark-a0)' : 'var(--clr-surface-a40)',
                  }}
                >
                  <span className="font-medium text-sm">Year 12</span>
                </button>
              </div>
            )}

            {/* Saved Answers Section */}
            <div 
              className="border-t pt-6 space-y-3"
              style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
            >
              <p 
                className="text-xs font-bold uppercase tracking-widest mb-4 px-2"
                style={{ color: 'var(--clr-surface-a40)' }}
              >Saved Answers</p>
              <button
                onClick={() => loadSavedAttempts()}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors font-medium text-sm border cursor-pointer"
                style={{
                  backgroundColor: 'var(--clr-info-a0)',
                  color: 'var(--clr-info-a20)',
                  borderColor: 'var(--clr-info-a10)',
                }}
              >
                <Bookmark className="w-4 h-4" />
                <span>View Saved ({savedAttempts.length})</span>
              </button>
              
              {viewMode === 'saved' && savedAttempts.length > 0 && (
                <div className="space-y-2">
                  {savedAttempts.map((attempt) => (
                    <button
                      key={attempt.id}
                      onClick={() => {
                        setSelectedAttempt(attempt);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors text-sm border`}
                      style={{
                        backgroundColor: selectedAttempt?.id === attempt.id ? 'var(--clr-surface-a20)' : 'var(--clr-surface-a10)',
                        borderColor: selectedAttempt?.id === attempt.id ? 'var(--clr-surface-tonal-a20)' : 'var(--clr-surface-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      <div className="font-medium truncate">{attempt.subject}</div>
                      <div 
                        className="text-xs truncate"
                        style={{ color: 'var(--clr-surface-a40)' }}
                      >{attempt.topic}</div>
                      <div 
                        className="text-xs mt-1"
                        style={{ color: 'var(--clr-surface-a50)' }}
                      >{attempt.marks}m • {new Date(attempt.savedAt).toLocaleDateString()}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div 
              className="mt-auto pt-6 border-t space-y-3"
              style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
            >
              {isDevMode && (
                <button 
                  onClick={() => setViewMode('dev-questions')}
                  className="flex items-center gap-3 p-3 rounded-xl w-full transition-colors cursor-pointer font-medium text-sm"
                  style={{
                    backgroundColor: 'var(--clr-warning-a0)',
                    color: 'var(--clr-light-a0)',
                  }}
                >
                  <span>Dev Mode ON</span>
                </button>
              )}
              <button 
                onClick={() => setViewMode('settings')}
                className="flex items-center gap-3 p-3 rounded-xl w-full transition-colors cursor-pointer"
                style={{
                  color: 'var(--clr-surface-a40)',
                }}
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium text-sm">Settings</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main 
          className="flex-1 p-4 lg:p-8 overflow-y-auto"
          style={{ backgroundColor: 'var(--clr-surface-a0)' }}
        >
          <div className="max-w-5xl mx-auto space-y-8">
            
            {(viewMode === 'generator' || viewMode === 'paper') ? (
              <>
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 
                  className="text-4xl font-bold mb-2"
                  style={{ color: 'var(--clr-primary-a50)' }}
                >{isPaperMode ? 'HSC Paper Attempt' : 'HSC Practice Generator'}</h1>
                <p 
                  className="text-lg"
                  style={{ color: 'var(--clr-surface-a40)' }}
                >{isPaperMode
                  ? `${activePaper?.year || ''} ${activePaper?.subject || ''} • ${activePaper?.grade || ''}`
                  : 'Practice exam-style questions and handwrite your answers.'}
                </p>
              </div>
              {!isPaperMode && (
                <button 
                  onClick={generateQuestion}
                  disabled={isGenerating || loading}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-70 disabled:hover:scale-100 whitespace-nowrap cursor-pointer"
                  style={{
                    backgroundColor: 'var(--clr-primary-a0)',
                    color: 'var(--clr-dark-a0)',
                  }}
                >
                  <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Loading...' : 'Generate'}
                </button>
              )}
            </div>

            {isPaperMode && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setViewMode('papers');
                      clearPaperState();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-surface-a10)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Papers
                  </button>
                  <div className="text-sm" style={{ color: 'var(--clr-surface-a40)' }}>
                    Question {paperIndex + 1} of {paperQuestions.length}
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--clr-surface-a20)' }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${Math.round(paperProgress * 100)}%`,
                      backgroundColor: 'var(--clr-primary-a0)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => goToPaperQuestion(paperIndex - 1)}
                    disabled={paperIndex === 0}
                    className="px-4 py-2 rounded-lg border text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-surface-a10)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >Previous Question</button>
                  <button
                    onClick={() => goToPaperQuestion(paperIndex + 1)}
                    disabled={paperIndex >= paperQuestions.length - 1}
                    className="px-4 py-2 rounded-lg border text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-primary-a0)',
                      borderColor: 'var(--clr-primary-a0)',
                      color: 'var(--clr-dark-a0)',
                    }}
                  >Next Question</button>
                </div>
              </div>
            )}

            {/* Filters Bar */}
            {!isPaperMode && (
              <div 
                className="flex flex-wrap gap-3 pb-4 border-b"
                style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
              >
                <select 
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="rounded-lg px-4 py-2 focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: 'var(--clr-surface-a10)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                    border: `1px solid var(--clr-surface-tonal-a20)`,
                  }}
                >
                  <option value="Year 11">Year 11</option>
                  <option value="Year 12">Year 12</option>
                </select>

                <select 
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="rounded-lg px-4 py-2 focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: 'var(--clr-surface-a10)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                    border: `1px solid var(--clr-surface-tonal-a20)`,
                  }}
                >
                  <option value="">All Years</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <select 
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="rounded-lg px-4 py-2 focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: 'var(--clr-surface-a10)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                    border: `1px solid var(--clr-surface-tonal-a20)`,
                  }}
                >
                  <option value="">All Subjects</option>
                  {SUBJECTS_BY_YEAR[filterGrade as 'Year 11' | 'Year 12']?.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>

                <select 
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  className="rounded-lg px-4 py-2 focus:outline-none focus:ring-2 text-sm"
                  style={{
                    backgroundColor: 'var(--clr-surface-a10)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                    border: `1px solid var(--clr-surface-tonal-a20)`,
                  }}
                >
                  <option value="">All Topics</option>
                  {getTopics(filterGrade, filterSubject).map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Question Card */}
            <div className="relative">
              <div 
                className="absolute top-2 left-2 w-full h-full rounded-2xl -z-10"
                style={{ backgroundColor: 'var(--clr-surface-a20)' }}
              />
              
              <div 
                className={`text-zinc-100 rounded-2xl p-6 lg:p-10 shadow-2xl border transition-all duration-500 ${isGenerating ? 'blur-sm scale-[0.99] opacity-80' : 'blur-0 scale-100 opacity-100'}`}
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center min-h-[300px]">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin mx-auto mb-2" />
                      <p className="text-zinc-400">Loading question...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center min-h-[300px]">
                    <div className="text-center">
                      <p className="text-red-400 font-medium">Error: {error}</p>
                      <button 
                        onClick={() => (isPaperMode ? goToPaperQuestion(paperIndex) : generateQuestion())}
                        className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : question ? (
                  <>
                    <div className="flex flex-col gap-4 border-b border-zinc-700 pb-6 mb-8">
                      <div className="flex justify-between items-start gap-6">
                        <div>
                          <span className="block font-bold text-2xl text-zinc-100">Question {question.question_number || ''}</span>
                          <span className="text-zinc-200 font-semibold text-lg block">{question.marks} Marks</span>
                          <span className="text-zinc-300 text-base block mt-1">{question.topic}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-zinc-300 block">{question.subject}</span>
                          <span className="text-zinc-500 font-medium uppercase tracking-widest text-xs block mt-1">
                            {question.year} HSC
                          </span>
                        </div>
                      </div>
                    </div>

                    <div 
                      className="text-lg leading-relaxed space-y-4 font-serif whitespace-pre-wrap"
                      style={{ color: 'var(--clr-light-a0)' }}
                    >
                      <LatexText text={question.question_text} />
                      {question.graph_image_data && (
                        <div className="my-4">
                          <img
                            src={question.graph_image_data}
                            alt="Question graph"
                            className={`rounded-lg border graph-image graph-image--${question.graph_image_size || 'medium'}`}
                            style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                          />
                        </div>
                      )}
                      {question.question_type === 'multiple_choice' && (
                        <div className="mt-6 space-y-3">
                          {([
                            { label: 'A', text: question.mcq_option_a },
                            { label: 'B', text: question.mcq_option_b },
                            { label: 'C', text: question.mcq_option_c },
                            { label: 'D', text: question.mcq_option_d },
                          ]).map((option) => (
                            <div
                              key={option.label}
                              className="rounded-lg border px-4 py-3"
                              style={{
                                backgroundColor: 'var(--clr-surface-a0)',
                                borderColor: 'var(--clr-surface-tonal-a20)',
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className="font-bold text-sm"
                                  style={{ color: 'var(--clr-primary-a50)' }}
                                >
                                  {option.label}.
                                </span>
                                <div className="flex-1 font-serif" style={{ color: 'var(--clr-light-a0)' }}>
                                  <LatexText text={option.text || ''} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center min-h-[300px]">
                    <p style={{ color: 'var(--clr-surface-a40)' }}>Click "Generate" to load a question</p>
                  </div>
                )}
              </div>
            </div>

            {/* Multiple Choice Answer */}
            {appState === 'idle' && question?.question_type === 'multiple_choice' && (
              <div
                className="border rounded-2xl shadow-2xl p-6"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                }}
              >
                <label
                  className="block text-sm font-semibold mb-3 uppercase tracking-wide"
                  style={{ color: 'var(--clr-surface-a40)' }}
                >Answer Options</label>
                <div className="space-y-3">
                  {([
                    { label: 'A', text: question.mcq_option_a },
                    { label: 'B', text: question.mcq_option_b },
                    { label: 'C', text: question.mcq_option_c },
                    { label: 'D', text: question.mcq_option_d },
                  ]).map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setSelectedMcqAnswer(option.label as 'A' | 'B' | 'C' | 'D')}
                      className="w-full text-left rounded-xl border px-4 py-3 transition-all cursor-pointer"
                      style={{
                        backgroundColor: selectedMcqAnswer === option.label
                          ? 'var(--clr-primary-a0)'
                          : 'var(--clr-surface-a0)',
                        borderColor: selectedMcqAnswer === option.label
                          ? 'var(--clr-primary-a0)'
                          : 'var(--clr-surface-tonal-a20)',
                        color: selectedMcqAnswer === option.label
                          ? 'var(--clr-dark-a0)'
                          : 'var(--clr-primary-a50)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-sm">{option.label}.</span>
                        <div className="flex-1 font-serif">
                          <LatexText text={option.text || ''} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={submitAnswer}
                  disabled={isMarking}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    backgroundColor: isMarking ? 'var(--clr-surface-a30)' : 'var(--clr-success-a0)',
                    color: isMarking ? 'var(--clr-surface-a50)' : 'var(--clr-light-a0)',
                  }}
                >
                  {isMarking ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isMarking ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            )}

            {/* Drawing Canvas */}
            {appState === 'idle' && question?.question_type !== 'multiple_choice' && (
              <div 
                className="border rounded-2xl shadow-2xl p-4"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <label 
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--clr-surface-a40)' }}
                  >Answer Area</label>
                  {isIpad && (
                    <span className="text-xs" style={{ color: 'var(--clr-surface-a50)' }}>
                      Use two fingers to scroll.
                    </span>
                  )}
                </div>
                <div 
                  className="max-h-[420px] md:max-h-[600px] overflow-y-auto rounded-xl"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    touchAction: 'none',
                  }}
                  onTouchMove={(e) => {
                    if (isIpad && e.touches.length < 2) {
                      e.preventDefault();
                    }
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    className="w-full cursor-crosshair block"
                    style={{
                      touchAction: 'none',
                      height: `${canvasHeight}px`,
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  />
                </div>
                <button
                  onClick={extendCanvas}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition text-sm cursor-pointer"
                  style={{
                    backgroundColor: 'var(--clr-surface-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                >
                  <ChevronRight className="w-4 h-4 rotate-90" />
                  Add More Space
                </button>
              </div>
            )}

            {/* Canvas Controls */}
            {appState === 'idle' && question?.question_type !== 'multiple_choice' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition text-sm disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-surface-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <Undo2 className="w-4 h-4" />
                    Undo
                  </button>

                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition text-sm disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-surface-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <Redo2 className="w-4 h-4" />
                    Redo
                  </button>

                  <button
                    onClick={clearCanvas}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition text-sm cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-surface-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </button>
                </div>

                <div className="flex gap-2 sm:ml-auto">
                  <button
                    onClick={submitAnswer}
                    disabled={isMarking}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition text-sm flex-1 sm:flex-none justify-center disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      backgroundColor: isMarking ? 'var(--clr-surface-a30)' : 'var(--clr-success-a0)',
                      color: isMarking ? 'var(--clr-surface-a50)' : 'var(--clr-light-a0)',
                    }}
                  >
                    {isMarking ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isMarking ? 'Submitting...' : 'Submit'}
                  </button>

                  <label 
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition cursor-pointer text-sm"
                    style={{
                      backgroundColor: 'var(--clr-surface-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={uploadImage}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Action Toolbar */}
            {appState === 'idle' && (
              <div 
                className="flex flex-wrap items-center justify-between gap-4 backdrop-blur-md p-4 rounded-2xl border"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                }}
              >
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-surface-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    {showAnswer ? 'Hide' : 'Show'} Solution
                  </button>
                </div>
                
                <button 
                  className="flex items-center gap-2 px-4 py-2 transition-colors font-medium text-sm cursor-pointer"
                  style={{
                    color: 'var(--clr-surface-a40)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            )}

            {/* Marking State */}
            {appState === 'marking' && (
              <div
                className="rounded-2xl p-8 shadow-2xl border flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                }}
              >
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: 'var(--clr-surface-a40)' }} />
                  <p className="text-lg" style={{ color: 'var(--clr-surface-a40)' }}>
                    Submitting for marking...
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--clr-surface-a50)' }}>
                    Please wait while we assess your response.
                  </p>
                </div>
              </div>
            )}

            {/* Solution Panel */}
            {showAnswer && appState === 'idle' && (
              <div 
                className="rounded-2xl p-8 shadow-2xl relative overflow-hidden border"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-success-a10)',
                }}
              >
                <div 
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: 'var(--clr-success-a10)' }}
                />
                <h3 
                  className="font-bold text-xl mb-4"
                  style={{ color: 'var(--clr-success-a20)' }}
                >Sample Solution</h3>
                <div 
                  className="font-serif text-lg leading-relaxed space-y-4"
                  style={{ color: 'var(--clr-light-a0)' }}
                >
                  {question?.question_type === 'multiple_choice' ? (
                    <>
                      {question.mcq_correct_answer && (
                        <p className="font-semibold">Correct Answer: {question.mcq_correct_answer}</p>
                      )}
                      {question.mcq_explanation ? (
                        <LatexText text={question.mcq_explanation} />
                      ) : (
                        <p className="text-sm italic" style={{ color: 'var(--clr-surface-a40)' }}>
                          Explanation not available.
                        </p>
                      )}
                    </>
                  ) : question?.sample_answer ? (
                    <LatexText text={question.sample_answer} />
                  ) : (
                    <>
                      <p>A detailed solution will appear here. Use this as a guide to check your working and understanding.</p>
                      <p 
                        className="text-sm italic"
                        style={{ color: 'var(--clr-surface-a40)' }}
                      >Generate a new question to see different solutions.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Reviewed Feedback */}
            {appState === 'reviewed' && feedback && (
              <div className="animate-fade-in space-y-4">
                
                {/* Marking Report Card */}
                <div 
                  className="text-zinc-100 rounded-2xl overflow-hidden border shadow-2xl"
                  style={{
                    backgroundColor: 'var(--clr-surface-a10)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                  }}
                >
                    
                    {/* Report Header */}
                    <div 
                      className="p-6 border-b flex flex-wrap items-center justify-between gap-6"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                      }}
                    >
                        <div>
                            <h3 
                              className="text-xl font-bold flex items-center gap-2"
                              style={{ color: 'var(--clr-primary-a50)' }}
                            >
                                {awardedMarks === 0 ? (
                                  <XCircle className="w-6 h-6" style={{ color: 'var(--clr-danger-a10)' }} />
                                ) : awardedMarks !== null && awardedMarks < maxMarks ? (
                                  <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--clr-warning-a10)' }} />
                                ) : (
                                  <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--clr-success-a10)' }} />
                                )}
                                Marking Complete
                            </h3>
                            <p 
                              className="text-sm mt-1"
                              style={{ color: 'var(--clr-surface-a40)' }}
                            >Assessed against NESA Guidelines</p>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span 
                                  className="block text-xs font-bold uppercase tracking-widest"
                                  style={{ color: 'var(--clr-surface-a50)' }}
                                >Score</span>
                                <div className="flex items-baseline gap-1 justify-end">
                                    <span 
                                      className="text-4xl font-bold"
                                      style={{ color: 'var(--clr-primary-a50)' }}
                                    >{awardedMarks === null ? '--' : awardedMarks}</span>
                                    <span 
                                      className="text-xl font-medium"
                                      style={{ color: 'var(--clr-surface-a50)' }}
                                    >/{maxMarks}</span>
                                </div>
                                {isMultipleChoiceReview && (
                                  <div className="mt-2 text-xs" style={{ color: 'var(--clr-surface-a40)' }}>
                                    <div>Selected: <strong style={{ color: 'var(--clr-light-a0)' }}>{feedback?.mcq_selected_answer || submittedAnswer || '-'}</strong></div>
                                    <div>Correct: <strong style={{ color: 'var(--clr-success-a10)' }}>{feedback?.mcq_correct_answer || question?.mcq_correct_answer || '-'}</strong></div>
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Feedback / MCQ Explanation Section */}
                    <div 
                      className="p-6 border-b"
                      style={{
                        backgroundColor: 'var(--clr-surface-a10)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                      }}
                    >
                        <h4 
                          className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                          style={{ color: 'var(--clr-surface-a40)' }}
                        >
                            <TrendingUp className="w-4 h-4" />
                            {isMultipleChoiceReview ? 'Answer Explanation' : 'AI Feedback'}
                        </h4>
                        <div 
                          className="text-base leading-relaxed space-y-3"
                          style={{ color: 'var(--clr-primary-a40)' }}
                        >
                            {isMultipleChoiceReview ? (
                              feedback?.mcq_explanation ? (
                                <LatexText text={feedback.mcq_explanation} />
                              ) : (
                                <p className="italic" style={{ color: 'var(--clr-surface-a40)' }}>Explanation not available.</p>
                              )
                            ) : feedback.ai_evaluation ? (
                              <LatexText text={feedback.ai_evaluation} />
                            ) : (
                              <p 
                                className="italic"
                                style={{ color: 'var(--clr-surface-a40)' }}
                              >AI evaluation is being processed...</p>
                            )}
                        </div>
                    </div>

                    {/* Marking Criteria Section */}
                    {!isMultipleChoiceReview && (
                      <div 
                        className="p-6 border-b"
                        style={{
                          backgroundColor: 'var(--clr-surface-a10)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                        }}
                      >
                          <h4 
                            className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                            style={{ color: 'var(--clr-surface-a40)' }}
                          >
                              <CheckCircle2 className="w-4 h-4" />
                              Marking Criteria
                          </h4>
                          <div className="overflow-x-auto">
                              <table className="w-full">
                                  <thead>
                                      <tr 
                                        className="border-b"
                                        style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                                      >
                                          <th 
                                            className="text-left py-2 px-3 text-xs font-bold uppercase tracking-wider"
                                            style={{ color: 'var(--clr-surface-a40)' }}
                                          >Criteria</th>
                                          <th 
                                            className="text-right py-2 px-3 text-xs font-bold uppercase tracking-wider w-24"
                                            style={{ color: 'var(--clr-surface-a40)' }}
                                          >Marks</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {(() => {
                                          const criteriaText = feedback.marking_criteria;
                                          const items = parseCriteriaForDisplay(criteriaText);
                                          const rows: React.ReactNode[] = [];
                                          let lastSubpart: string | null = null;

                                          items.forEach((item, idx) => {
                                            if (item.type === 'heading') {
                                              lastSubpart = null;
                                              rows.push(
                                                <tr key={`part-${item.key}-${idx}`} className="border-b" style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}>
                                                  <td colSpan={2} className="py-3 px-3 font-semibold" style={{ color: 'var(--clr-primary-a50)' }}>
                                                    {item.text}
                                                  </td>
                                                </tr>
                                              );
                                              return;
                                            }

                                            if (item.subpart && item.subpart !== lastSubpart) {
                                              lastSubpart = item.subpart;
                                              rows.push(
                                                <tr key={`subpart-${item.subpart}-${idx}`} className="border-b" style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}>
                                                  <td colSpan={2} className="py-2 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--clr-surface-a40)' }}>
                                                    Part ({item.subpart})
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            rows.push(
                                              <tr 
                                                key={`${item.key}-${idx}`} 
                                                className="border-b transition-colors"
                                                style={{ 
                                                  borderColor: 'var(--clr-surface-tonal-a20)',
                                                }}
                                              >
                                                <td 
                                                  className="py-3 px-3"
                                                  style={{ color: 'var(--clr-light-a0)' }}
                                                >
                                                  <LatexText text={item.text} />
                                                </td>
                                                <td 
                                                  className="py-3 px-3 text-right font-mono font-bold"
                                                  style={{ color: 'var(--clr-success-a10)' }}
                                                >
                                                  {item.marks}
                                                </td>
                                              </tr>
                                            );
                                          });

                                          return rows;
                                      })()}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                    )}

                    {/* Sample Answer / Explanation Section */}
                    <div 
                      className="p-8 border-t space-y-4"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                      }}
                    >
                        <h3 
                          className="font-bold text-lg flex items-center gap-2"
                          style={{ color: 'var(--clr-success-a20)' }}
                        >
                            <BookOpen className="w-5 h-5" />
                            {isMultipleChoiceReview ? 'Answer Explanation' : 'Sample Solution'}
                        </h3>
                        
                        <div 
                          className="font-serif text-base leading-relaxed space-y-3 pl-4 border-l-2"
                          style={{
                            color: 'var(--clr-light-a0)',
                            borderColor: 'var(--clr-success-a10)',
                          }}
                        >
                            {isMultipleChoiceReview ? (
                              feedback?.mcq_explanation ? (
                                <LatexText text={feedback.mcq_explanation} />
                              ) : (
                                <p style={{ color: 'var(--clr-surface-a40)' }}>Explanation not available.</p>
                              )
                            ) : (
                              <LatexText text={feedback.sample_answer} />
                            )}
                        </div>
                    </div>

                    {/* Submitted Answer Section */}
                    {submittedAnswer && (
                      <div 
                        className="p-8 border-t space-y-4"
                        style={{
                          backgroundColor: 'var(--clr-surface-a0)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                        }}
                      >
                        <h3 
                          className="font-bold text-lg flex items-center gap-2"
                          style={{ color: 'var(--clr-info-a20)' }}
                        >
                          <Eye className="w-5 h-5" />
                          Your Submitted Answer
                        </h3>
                        <div 
                          className="rounded-lg p-4 border"
                          style={{
                            backgroundColor: 'var(--clr-surface-a10)',
                            borderColor: 'var(--clr-surface-tonal-a20)',
                          }}
                        >
                          {isMultipleChoiceReview ? (
                            <p className="font-semibold">Selected Answer: {submittedAnswer}</p>
                          ) : (
                            <img src={submittedAnswer} alt="Student answer" className="w-full rounded" style={{ borderColor: 'var(--clr-surface-tonal-a20)', border: '1px solid var(--clr-surface-tonal-a20)' }} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div 
                      className="border-t p-6 flex gap-3"
                      style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                    >
                        <button
                            onClick={() => (isPaperMode ? goToPaperQuestion(paperIndex + 1) : generateQuestion())}
                            disabled={isPaperMode && paperIndex >= paperQuestions.length - 1}
                            className="flex-1 px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: 'var(--clr-primary-a0)',
                              color: 'var(--clr-dark-a0)',
                            }}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Next Question
                        </button>
                        <button
                            onClick={() => {
                              setAppState('idle');
                              setFeedback(null);
                            }}
                            className="px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--clr-surface-a20)',
                              color: 'var(--clr-primary-a50)',
                            }}
                        >
                            <Edit2 className="w-4 h-4" />
                            Review & Try Again
                        </button>
                        <button
                            onClick={saveAttempt}
                            disabled={isSaving}
                            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer`}
                            style={{
                              backgroundColor: isSaving ? 'var(--clr-surface-a30)' : 'var(--clr-primary-a10)',
                              color: isSaving ? 'var(--clr-surface-a40)' : 'var(--clr-dark-a0)',
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              opacity: isSaving ? 0.7 : 1,
                            }}
                        >
                            <Bookmark className={`w-4 h-4 transition-all ${
                              isSaving ? 'fill-zinc-300' : ''
                            }`} />
                            {isSaving ? 'Saving...' : 'Save Answer'}
                        </button>
                    </div>

                </div>
              </div>
            )}
              </>
            ) : viewMode === 'papers' ? (
              <>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                  <div>
                    <h1
                      className="text-4xl font-bold mb-2"
                      style={{ color: 'var(--clr-primary-a50)' }}
                    >Browse HSC Papers</h1>
                    <p
                      className="text-lg"
                      style={{ color: 'var(--clr-surface-a40)' }}
                    >Select a paper to start a full exam attempt.</p>
                  </div>
                </div>

                {loadingQuestions ? (
                  <div className="flex items-center justify-center min-h-[240px]">
                    <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--clr-surface-a40)' }} />
                  </div>
                ) : availablePapers.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-lg" style={{ color: 'var(--clr-surface-a40)' }}>No papers available yet.</p>
                    <p className="text-sm mt-2" style={{ color: 'var(--clr-surface-a50)' }}>Upload exam questions to create papers.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {availablePapers.map((paper) => (
                      <button
                        key={`${paper.year}-${paper.grade}-${paper.subject}`}
                        onClick={() => startPaperAttempt(paper)}
                        className="text-left border rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl cursor-pointer"
                        style={{
                          backgroundColor: 'var(--clr-surface-a10)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                        }}
                      >
                        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--clr-surface-a40)' }}>
                          {paper.year}
                        </div>
                        <div className="text-xl font-semibold mt-2" style={{ color: 'var(--clr-primary-a50)' }}>
                          {paper.subject}
                        </div>
                        <div className="text-sm mt-1" style={{ color: 'var(--clr-surface-a50)' }}>
                          {paper.grade}
                        </div>
                        <div className="text-xs mt-4" style={{ color: 'var(--clr-surface-a40)' }}>
                          {paper.count} question{paper.count === 1 ? '' : 's'} available
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Saved Attempts View */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                  <div>
                    <h1 
                      className="text-4xl font-bold mb-2"
                      style={{ color: 'var(--clr-primary-a50)' }}
                    >My Saved Answers</h1>
                    <p 
                      className="text-lg"
                      style={{ color: 'var(--clr-surface-a40)' }}
                    >{savedAttempts.length} answer{savedAttempts.length !== 1 ? 's' : ''} saved</p>
                  </div>
                  <button 
                    onClick={() => setViewMode('generator')}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-primary-a0)',
                      color: 'var(--clr-dark-a0)',
                    }}
                  >
                    <RefreshCw className="w-5 h-5" />
                    Back to Generator
                  </button>
                </div>

                {selectedAttempt ? (
                  <>
                    {/* Selected Attempt Full View */}
                    <button 
                      onClick={() => setSelectedAttempt(null)}
                      className="flex items-center gap-2 px-4 py-2 transition-colors mb-6 cursor-pointer"
                      style={{ color: 'var(--clr-surface-a40)' }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to list
                    </button>

                    <div 
                      className="rounded-2xl border overflow-hidden shadow-2xl space-y-6 p-8"
                      style={{
                        backgroundColor: 'var(--clr-surface-a10)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                      }}
                    >
                      {/* Question */}
                      <div className="space-y-2">
                        <h3 
                          className="text-sm font-bold uppercase tracking-widest"
                          style={{ color: 'var(--clr-surface-a40)' }}
                        >Question ({selectedAttempt.marks} marks)</h3>
                        <div 
                          className="font-serif text-lg"
                          style={{ color: 'var(--clr-light-a0)' }}
                        >
                          <LatexText text={selectedAttempt.questionText} />
                          {selectedAttempt.graphImageData && (
                            <div className="my-4">
                              <img
                                src={selectedAttempt.graphImageData}
                                alt="Question graph"
                                className={`rounded-lg border graph-image graph-image--${selectedAttempt.graphImageSize || 'medium'}`}
                                style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                              />
                            </div>
                          )}
                        </div>
                        <div 
                          className="text-sm mt-2"
                          style={{ color: 'var(--clr-surface-a50)' }}
                        >{selectedAttempt.subject} • {selectedAttempt.topic}</div>
                      </div>

                      {/* Divider */}
                      <div 
                        className="border-t"
                        style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                      />

                      {/* Student's Answer */}
                      {selectedAttempt.submittedAnswer && (
                        <div className="space-y-2">
                          <h3 
                            className="text-sm font-bold uppercase tracking-widest"
                            style={{ color: 'var(--clr-info-a20)' }}
                          >Your Answer</h3>
                          {selectedAttempt.questionType === 'multiple_choice' ? (
                            <div 
                              className="rounded-lg border px-4 py-3"
                              style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                            >
                              <span className="font-semibold">Selected: {selectedAttempt.submittedAnswer}</span>
                            </div>
                          ) : (
                            <img 
                              src={selectedAttempt.submittedAnswer} 
                              alt="Student answer" 
                              className="w-full rounded-lg border"
                              style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                            />
                          )}
                        </div>
                      )}

                      {/* AI Feedback / Explanation */}
                      {(selectedAttempt.feedback?.ai_evaluation || selectedAttempt.feedback?.mcq_explanation) && (
                        <div 
                          className="space-y-3 p-6 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--clr-surface-a10)',
                            borderColor: 'var(--clr-surface-tonal-a20)',
                          }}
                        >
                          <h3 
                            className="text-sm font-bold uppercase tracking-widest"
                            style={{ color: 'var(--clr-info-a20)' }}
                          >{selectedAttempt.questionType === 'multiple_choice' ? 'Answer Explanation' : 'AI Feedback'}</h3>
                          <div 
                            className="space-y-2"
                            style={{ color: 'var(--clr-primary-a40)' }}
                          >
                            <LatexText text={selectedAttempt.feedback.ai_evaluation || selectedAttempt.feedback.mcq_explanation} />
                          </div>
                        </div>
                      )}

                      {/* Marking Criteria */}
                      {selectedAttempt.questionType !== 'multiple_choice' && selectedAttempt.feedback?.marking_criteria && (
                        <div className="space-y-3">
                          <h3 
                            className="text-sm font-bold uppercase tracking-widest"
                            style={{ color: 'var(--clr-surface-a40)' }}
                          >Marking Criteria</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr 
                                  className="border-b"
                                  style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                                >
                                  <th 
                                    className="text-left py-2 px-3 text-xs font-bold uppercase tracking-wider"
                                    style={{ color: 'var(--clr-surface-a40)' }}
                                  >Criteria</th>
                                  <th 
                                    className="text-right py-2 px-3 text-xs font-bold uppercase tracking-wider w-24"
                                    style={{ color: 'var(--clr-surface-a40)' }}
                                  >Marks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const criteriaText = selectedAttempt.feedback.marking_criteria;
                                  const items = parseCriteriaForDisplay(criteriaText);
                                  const rows: React.ReactNode[] = [];
                                  let lastSubpart: string | null = null;

                                  items.forEach((item, idx) => {
                                    if (item.type === 'heading') {
                                      lastSubpart = null;
                                      rows.push(
                                        <tr key={`part-${item.key}-${idx}`} className="border-b" style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}>
                                          <td colSpan={2} className="py-3 px-3 font-semibold" style={{ color: 'var(--clr-primary-a50)' }}>
                                            {item.text}
                                          </td>
                                        </tr>
                                      );
                                      return;
                                    }

                                    if (item.subpart && item.subpart !== lastSubpart) {
                                      lastSubpart = item.subpart;
                                      rows.push(
                                        <tr key={`subpart-${item.subpart}-${idx}`} className="border-b" style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}>
                                          <td colSpan={2} className="py-2 px-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--clr-surface-a40)' }}>
                                            Part ({item.subpart})
                                          </td>
                                        </tr>
                                      );
                                    }

                                    rows.push(
                                      <tr 
                                        key={`${item.key}-${idx}`} 
                                        className="border-b transition-colors"
                                        style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                                      >
                                        <td 
                                          className="py-3 px-3"
                                          style={{ color: 'var(--clr-light-a0)' }}
                                        >
                                          <LatexText text={item.text} />
                                        </td>
                                        <td 
                                          className="py-3 px-3 text-right font-mono font-bold"
                                          style={{ color: 'var(--clr-success-a10)' }}
                                        >
                                          {item.marks}
                                        </td>
                                      </tr>
                                    );
                                  });

                                  return rows;
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Sample Solution */}
                      {selectedAttempt.sampleAnswer && (
                        <div 
                          className="space-y-3 p-6 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--clr-surface-a10)',
                            borderColor: 'var(--clr-success-a10)',
                          }}
                        >
                          <h3 
                            className="text-sm font-bold uppercase tracking-widest"
                            style={{ color: 'var(--clr-success-a20)' }}
                          >Sample Solution</h3>
                          <div 
                            className="font-serif"
                            style={{ color: 'var(--clr-light-a0)' }}
                          >
                            <LatexText text={selectedAttempt.sampleAnswer} />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Attempts List */}
                    {savedAttempts.length === 0 ? (
                      <div className="text-center py-16">
                        <Bookmark 
                          className="w-16 h-16 mx-auto mb-4"
                          style={{ color: 'var(--clr-surface-a30)' }}
                        />
                        <p 
                          className="text-lg"
                          style={{ color: 'var(--clr-surface-a40)' }}
                        >No saved answers yet</p>
                        <p 
                          className="text-sm mt-2"
                          style={{ color: 'var(--clr-surface-a50)' }}
                        >Submit and save an answer to see it here</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {savedAttempts.map((attempt) => (
                          <button
                            key={attempt.id}
                            onClick={() => setSelectedAttempt(attempt)}
                            className="text-left border rounded-xl p-6 transition-colors space-y-3 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--clr-surface-a10)',
                              borderColor: 'var(--clr-surface-tonal-a20)',
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 
                                  className="font-bold text-lg"
                                  style={{ color: 'var(--clr-primary-a50)' }}
                                >{attempt.subject}</h3>
                                <p 
                                  className="text-sm"
                                  style={{ color: 'var(--clr-surface-a40)' }}
                                >{attempt.topic}</p>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <div 
                                  className="text-2xl font-bold"
                                  style={{ color: 'var(--clr-success-a10)' }}
                                >{attempt.marks}m</div>
                                <div 
                                  className="text-xs"
                                  style={{ color: 'var(--clr-surface-a50)' }}
                                >{new Date(attempt.savedAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div 
                              className="pt-2 border-t"
                              style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                            >
                              <p 
                                className="text-sm line-clamp-2"
                                style={{ color: 'var(--clr-primary-a40)' }}
                              >{attempt.questionText}</p>
                            </div>
                            {(attempt.feedback?.ai_evaluation || attempt.feedback?.mcq_explanation) && (
                              <div className="pt-2">
                                <p className="text-xs text-zinc-500 line-clamp-1">
                                  {(attempt.feedback.ai_evaluation || attempt.feedback.mcq_explanation).split('\n')[0]}
                                </p>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Saved Attempts Modal - Removed, now using inline sidebar view */}

      {/* Settings Page */}
      {viewMode === 'settings' && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--clr-primary-a50)' }}>Settings</h1>
            <button 
              onClick={() => setViewMode('generator')}
              className="p-2 rounded-lg cursor-pointer"
              style={{ color: 'var(--clr-surface-a40)' }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-2xl">
              <div 
                className="p-6 rounded-2xl border"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                }}
              >
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--clr-primary-a50)' }}>Account Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>Email</label>
                    <p className="mt-1 text-lg" style={{ color: 'var(--clr-light-a0)' }}>{userEmail}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>Date Joined</label>
                    <p className="mt-1 text-lg" style={{ color: 'var(--clr-light-a0)' }}>
                      {userCreatedAt ? new Date(userCreatedAt).toLocaleDateString('en-AU', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-6 rounded-2xl border mt-6"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                }}
              >
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--clr-primary-a50)' }}>PDF Intake</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--clr-surface-a40)' }}>
                  Upload a folder of exam images (JPEG/PNG) or the marking criteria PDF. The response will be used to create new questions automatically.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>Grade</label>
                      <select
                        value={pdfGrade}
                        onChange={(e) => {
                          const nextGrade = e.target.value as 'Year 11' | 'Year 12';
                          const nextSubjects = SUBJECTS_BY_YEAR[nextGrade];
                          setPdfGrade(nextGrade);
                          if (!nextSubjects.includes(pdfSubject)) {
                            setPdfSubject(nextSubjects[0]);
                          }
                        }}
                        className="mt-2 w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--clr-surface-a0)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                          color: 'var(--clr-primary-a50)',
                        }}
                      >
                        <option value="Year 11">Year 11</option>
                        <option value="Year 12">Year 12</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>Exam Year</label>
                      <select
                        value={pdfYear}
                        onChange={(e) => setPdfYear(e.target.value)}
                        className="mt-2 w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--clr-surface-a0)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                          color: 'var(--clr-primary-a50)',
                        }}
                      >
                        {YEARS.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>Subject</label>
                      <select
                        value={pdfSubject}
                        onChange={(e) => setPdfSubject(e.target.value)}
                        className="mt-2 w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--clr-surface-a0)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                          color: 'var(--clr-primary-a50)',
                        }}
                      >
                        {SUBJECTS_BY_YEAR[pdfGrade].map((subject) => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>Exam Images Folder</label>
                    <input
                      ref={examFolderInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      onChange={(e) => setExamImageFiles(Array.from(e.target.files || []))}
                      className="mt-2 w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                    {examImageFiles.length > 0 && (
                      <p className="mt-2 text-xs" style={{ color: 'var(--clr-surface-a50)' }}>
                        {examImageFiles.length} image{examImageFiles.length === 1 ? '' : 's'} selected
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>Marking Criteria PDF</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setCriteriaPdfFile(e.target.files?.[0] || null)}
                      className="mt-2 w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--clr-surface-a50)' }}>
                    <input
                      type="checkbox"
                      checked={pdfOverwrite}
                      onChange={(e) => setPdfOverwrite(e.target.checked)}
                    />
                    Overwrite existing questions and marking criteria for this grade/year/subject
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={submitPdfPair}
                      disabled={pdfStatus === 'uploading'}
                      className="px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--clr-primary-a0)',
                        color: 'var(--clr-dark-a0)',
                      }}
                    >
                      {pdfStatus === 'uploading' ? 'Uploading...' : 'Upload Files'}
                    </button>
                    {pdfMessage && (
                      <span
                        className="text-sm"
                        style={{ color: pdfStatus === 'error' ? 'var(--clr-danger-a10)' : 'var(--clr-surface-a50)' }}
                      >
                        {pdfMessage}
                      </span>
                    )}
                  </div>

                  {pdfChatGptResponse && (
                    <div className="mt-4">
                      <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>
                        ChatGPT Response
                      </label>
                      <textarea
                        readOnly
                        value={pdfChatGptResponse}
                        rows={12}
                        className="mt-2 w-full px-4 py-2 rounded-lg border font-mono text-sm"
                        style={{
                          backgroundColor: 'var(--clr-surface-a0)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                          color: 'var(--clr-primary-a50)',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dev Mode - Question Management Page */}
      {viewMode === 'dev-questions' && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--clr-primary-a50)' }}>Developer Tools</h1>
            <button 
              onClick={() => setViewMode('generator')}
              className="p-2 rounded-lg cursor-pointer"
              style={{ color: 'var(--clr-surface-a40)' }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 p-6 border-b" style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}>
            <button
              onClick={() => setDevTab('add')}
              className="px-4 py-2 rounded-lg font-medium transition cursor-pointer"
              style={{
                backgroundColor: devTab === 'add' ? 'var(--clr-primary-a0)' : 'transparent',
                color: devTab === 'add' ? 'var(--clr-dark-a0)' : 'var(--clr-surface-a40)',
                borderBottom: devTab === 'add' ? `2px solid var(--clr-primary-a0)` : 'none',
              }}
            >
              Add Question
            </button>
            <button
              onClick={() => setDevTab('manage')}
              className="px-4 py-2 rounded-lg font-medium transition cursor-pointer"
              style={{
                backgroundColor: devTab === 'manage' ? 'var(--clr-primary-a0)' : 'transparent',
                color: devTab === 'manage' ? 'var(--clr-dark-a0)' : 'var(--clr-surface-a40)',
                borderBottom: devTab === 'manage' ? `2px solid var(--clr-primary-a0)` : 'none',
              }}
            >
              Manage Questions ({allQuestions.length})
            </button>
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            {devTab === 'add' && (
              <div className="max-w-2xl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Grade</label>
                    <select 
                      value={newQuestion.grade}
                      onChange={(e) => {
                        const nextGrade = e.target.value as 'Year 11' | 'Year 12';
                        const nextSubject = SUBJECTS_BY_YEAR[nextGrade][0];
                        const nextTopic = getTopics(nextGrade, nextSubject)[0] || '';
                        setNewQuestion({
                          ...newQuestion,
                          grade: nextGrade,
                          subject: nextSubject,
                          topic: nextTopic,
                        });
                      }}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      <option>Year 11</option>
                      <option>Year 12</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Year</label>
                      <input 
                        type="number" 
                        value={newQuestion.year}
                        onChange={(e) => setNewQuestion({...newQuestion, year: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--clr-surface-a0)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                          color: 'var(--clr-primary-a50)',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Marks</label>
                      <input 
                        type="number" 
                        value={newQuestion.marks}
                        onChange={(e) => setNewQuestion({...newQuestion, marks: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--clr-surface-a0)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                          color: 'var(--clr-primary-a50)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Question Type</label>
                    <select
                      value={newQuestion.questionType}
                      onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      <option value="written">Written Response</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Subject</label>
                    <select 
                      value={newQuestion.subject}
                      onChange={(e) => {
                        const nextSubject = e.target.value;
                        const nextTopics = getTopics(newQuestion.grade, nextSubject);
                        setNewQuestion({
                          ...newQuestion,
                          subject: nextSubject,
                          topic: nextTopics[0] || '',
                        });
                      }}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      {SUBJECTS_BY_YEAR[newQuestion.grade as 'Year 11' | 'Year 12']?.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Topic</label>
                    <select
                      value={newQuestion.topic}
                      onChange={(e) => setNewQuestion({...newQuestion, topic: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      {getTopics(newQuestion.grade, newQuestion.subject).map((topic) => (
                        <option key={topic} value={topic}>{topic}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Question Number</label>
                    <input 
                      type="text" 
                      value={newQuestion.questionNumber}
                      onChange={(e) => setNewQuestion({...newQuestion, questionNumber: e.target.value})}
                      placeholder="e.g., 11 or 11a)"
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Question Text</label>
                    <textarea 
                      value={newQuestion.questionText}
                      onChange={(e) => setNewQuestion({...newQuestion, questionText: e.target.value})}
                      placeholder="Enter question (use $ for LaTeX)"
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                  </div>

                  {newQuestion.questionType === 'multiple_choice' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Option A</label>
                          <input
                            type="text"
                            value={newQuestion.mcqOptionA}
                            onChange={(e) => setNewQuestion({ ...newQuestion, mcqOptionA: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--clr-surface-a0)',
                              borderColor: 'var(--clr-surface-tonal-a20)',
                              color: 'var(--clr-primary-a50)',
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Option B</label>
                          <input
                            type="text"
                            value={newQuestion.mcqOptionB}
                            onChange={(e) => setNewQuestion({ ...newQuestion, mcqOptionB: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--clr-surface-a0)',
                              borderColor: 'var(--clr-surface-tonal-a20)',
                              color: 'var(--clr-primary-a50)',
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Option C</label>
                          <input
                            type="text"
                            value={newQuestion.mcqOptionC}
                            onChange={(e) => setNewQuestion({ ...newQuestion, mcqOptionC: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--clr-surface-a0)',
                              borderColor: 'var(--clr-surface-tonal-a20)',
                              color: 'var(--clr-primary-a50)',
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Option D</label>
                          <input
                            type="text"
                            value={newQuestion.mcqOptionD}
                            onChange={(e) => setNewQuestion({ ...newQuestion, mcqOptionD: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--clr-surface-a0)',
                              borderColor: 'var(--clr-surface-tonal-a20)',
                              color: 'var(--clr-primary-a50)',
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Correct Answer</label>
                          <select
                            value={newQuestion.mcqCorrectAnswer}
                            onChange={(e) => setNewQuestion({ ...newQuestion, mcqCorrectAnswer: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--clr-surface-a0)',
                              borderColor: 'var(--clr-surface-tonal-a20)',
                              color: 'var(--clr-primary-a50)',
                            }}
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Answer Explanation</label>
                        <textarea
                          value={newQuestion.mcqExplanation}
                          onChange={(e) => setNewQuestion({ ...newQuestion, mcqExplanation: e.target.value })}
                          placeholder="Enter explanation (use $ for LaTeX)"
                          rows={4}
                          className="w-full px-4 py-2 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--clr-surface-a0)',
                            borderColor: 'var(--clr-surface-tonal-a20)',
                            color: 'var(--clr-primary-a50)',
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Marking Criteria</label>
                        <textarea 
                          value={newQuestion.markingCriteria}
                          onChange={(e) => setNewQuestion({...newQuestion, markingCriteria: e.target.value})}
                          placeholder="Enter marking criteria (format: criteria - X marks)"
                          rows={3}
                          className="w-full px-4 py-2 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--clr-surface-a0)',
                            borderColor: 'var(--clr-surface-tonal-a20)',
                            color: 'var(--clr-primary-a50)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Sample Answer</label>
                        <textarea 
                          value={newQuestion.sampleAnswer}
                          onChange={(e) => setNewQuestion({...newQuestion, sampleAnswer: e.target.value})}
                          placeholder="Enter sample answer (use $ for LaTeX)"
                          rows={4}
                          className="w-full px-4 py-2 rounded-lg border"
                          style={{
                            backgroundColor: 'var(--clr-surface-a0)',
                            borderColor: 'var(--clr-surface-tonal-a20)',
                            color: 'var(--clr-primary-a50)',
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Graph Image (data URL)</label>
                    <textarea 
                      value={newQuestion.graphImageData}
                      onChange={(e) => setNewQuestion({...newQuestion, graphImageData: e.target.value})}
                      onPaste={handleGraphPaste}
                      placeholder="Paste a data:image/png;base64,... URL (optional)"
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Graph Size</label>
                      <select
                        value={newQuestion.graphImageSize}
                        onChange={(e) => setNewQuestion({ ...newQuestion, graphImageSize: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--clr-surface-a0)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                          color: 'var(--clr-primary-a50)',
                        }}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <label
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--clr-surface-a20)',
                          color: 'var(--clr-primary-a50)',
                        }}
                      >
                        Upload PNG
                        <input type="file" accept="image/png" hidden onChange={handleGraphUpload} />
                      </label>
                      {newQuestion.graphImageData && (
                        <span className="text-xs" style={{ color: 'var(--clr-surface-a40)' }}>
                          Image loaded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={addQuestionToDatabase}
                      disabled={isAddingQuestion}
                      className="flex-1 px-4 py-3 rounded-lg font-medium cursor-pointer disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--clr-success-a0)',
                        color: 'var(--clr-light-a0)',
                      }}
                    >
                      {isAddingQuestion ? 'Adding...' : 'Add Question'}
                    </button>
                    <button 
                      onClick={() => setViewMode('generator')}
                      className="flex-1 px-4 py-3 rounded-lg font-medium cursor-pointer"
                      style={{
                        backgroundColor: 'var(--clr-surface-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            )}

            {devTab === 'manage' && (
              <div className="max-w-6xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--clr-primary-a50)' }}>Manage Questions</h2>
                  <button
                    onClick={clearAllQuestions}
                    className="px-4 py-2 rounded-lg font-medium cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-danger-a0)',
                      color: 'var(--clr-light-a0)',
                    }}
                  >
                    Clear All Questions
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--clr-surface-a50)' }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredManageQuestionIds.length > 0 &&
                        filteredManageQuestionIds.every((id) => selectedManageQuestionIds.includes(id))
                      }
                      onChange={(e) => setAllManageSelections(e.target.checked, filteredManageQuestionIds)}
                    />
                    Select all (filtered)
                  </label>
                  <span className="text-xs" style={{ color: 'var(--clr-surface-a40)' }}>
                    {selectedManageQuestionIds.length} selected • {filteredManageQuestions.length} showing of {allQuestions.length}
                  </span>
                  <button
                    onClick={deleteSelectedQuestions}
                    disabled={!selectedManageQuestionIds.length || bulkActionLoading}
                    className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--clr-danger-a0)', color: 'var(--clr-light-a0)' }}
                  >
                    {bulkActionLoading ? 'Working...' : 'Delete Selected'}
                  </button>
                  <button
                    onClick={clearSelectedMarkingCriteria}
                    disabled={!selectedManageQuestionIds.length || bulkActionLoading}
                    className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--clr-surface-a20)', color: 'var(--clr-primary-a50)' }}
                  >
                    {bulkActionLoading ? 'Working...' : 'Clear Marking Criteria'}
                  </button>
                  <button
                    onClick={() => setManageMissingImagesOnly((prev) => !prev)}
                    className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: manageMissingImagesOnly ? 'var(--clr-warning-a0)' : 'var(--clr-surface-a20)',
                      color: manageMissingImagesOnly ? 'var(--clr-light-a0)' : 'var(--clr-primary-a50)',
                    }}
                  >
                    {manageMissingImagesOnly ? 'Showing Missing Images' : 'Show Missing Images'}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 mb-6">
                  <input
                    type="text"
                    value={manageSearchQuery}
                    onChange={(e) => setManageSearchQuery(e.target.value)}
                    placeholder="Search question number, topic, text..."
                    className="lg:col-span-2 px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  />
                  <select
                    value={manageFilterGrade}
                    onChange={(e) => setManageFilterGrade(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <option value="">All Grades</option>
                    {manageFilterOptions.grades.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  <select
                    value={manageFilterYear}
                    onChange={(e) => setManageFilterYear(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <option value="">All Years</option>
                    {manageFilterOptions.years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <select
                    value={manageFilterSubject}
                    onChange={(e) => setManageFilterSubject(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <option value="">All Subjects</option>
                    {manageFilterOptions.subjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  <select
                    value={manageFilterTopic}
                    onChange={(e) => setManageFilterTopic(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <option value="">All Topics</option>
                    {manageFilterOptions.topics.map((topic) => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                  <select
                    value={manageFilterType}
                    onChange={(e) => setManageFilterType(e.target.value as 'all' | 'written' | 'multiple_choice')}
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="written">Written Response</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                  <div className="flex gap-2">
                    <select
                      value={manageSortKey}
                      onChange={(e) => setManageSortKey(e.target.value as typeof manageSortKey)}
                      className="flex-1 px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      <option value="question_number">Sort by Question #</option>
                      <option value="year">Sort by Year</option>
                      <option value="grade">Sort by Grade</option>
                      <option value="subject">Sort by Subject</option>
                      <option value="topic">Sort by Topic</option>
                      <option value="marks">Sort by Marks</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setManageSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="px-3 py-2 rounded-lg border text-sm font-medium"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      {manageSortDirection === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                {loadingQuestions ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: 'var(--clr-primary-a50)' }} />
                      <p style={{ color: 'var(--clr-surface-a40)' }}>Loading questions...</p>
                    </div>
                  </div>
                ) : allQuestions.length === 0 ? (
                  <div className="text-center py-12">
                    <p style={{ color: 'var(--clr-surface-a40)' }}>No questions found</p>
                  </div>
                ) : (
                  <div>
                    {!manageQuestionDraft ? (
                      <div className="space-y-3">
                        {filteredManageQuestions.length === 0 ? (
                          <div className="text-center py-10">
                            <p style={{ color: 'var(--clr-surface-a40)' }}>No questions match the current filters</p>
                          </div>
                        ) : (
                          filteredManageQuestions.map((q) => {
                            const isSelected = selectedManageQuestionIds.includes(q.id);
                            return (
                              <button
                                key={q.id}
                                onClick={() => {
                                  setSelectedManageQuestionId(q.id);
                                  setManageQuestionDraft(q);
                                  setManageQuestionEditMode(false);
                                }}
                                className="w-full text-left p-4 rounded-lg border transition-colors"
                                style={{
                                  backgroundColor: isSelected ? 'var(--clr-surface-a20)' : 'var(--clr-surface-a10)',
                                  borderColor: 'var(--clr-surface-tonal-a20)',
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleManageSelection(q.id, e.target.checked);
                                    }}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold" style={{ color: 'var(--clr-primary-a50)' }}>{q.subject}</span>
                                      {q.question_number && (
                                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--clr-surface-a20)', color: 'var(--clr-surface-a50)' }}>{q.question_number}</span>
                                      )}
                                      {!q.graph_image_data && q.graph_image_size === 'missing' && (
                                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--clr-warning-a0)', color: 'var(--clr-light-a0)' }}>Missing Image</span>
                                      )}
                                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--clr-surface-a20)', color: 'var(--clr-surface-a50)' }}>{q.year}</span>
                                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--clr-surface-a20)', color: 'var(--clr-surface-a50)' }}>{q.marks}m</span>
                                    </div>
                                    <p style={{ color: 'var(--clr-surface-a40)' }} className="text-sm">{q.topic}</p>
                                    <p style={{ color: 'var(--clr-primary-a40)' }} className="text-xs mt-1 line-clamp-1">{q.question_text}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <button
                          onClick={() => {
                            setManageQuestionDraft(null);
                            setSelectedManageQuestionId(null);
                            setManageQuestionEditMode(false);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer"
                          style={{ backgroundColor: 'var(--clr-surface-a20)', color: 'var(--clr-primary-a50)' }}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to list
                        </button>

                        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--clr-surface-a10)', borderColor: 'var(--clr-surface-tonal-a20)' }}>
                          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                            <div className="space-y-6">
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--clr-surface-a40)' }}>{manageQuestionDraft.year} HSC</span>
                                  <h3 className="text-2xl font-bold" style={{ color: 'var(--clr-primary-a50)' }}>{manageQuestionDraft.subject}</h3>
                                  <p className="text-sm" style={{ color: 'var(--clr-surface-a40)' }}>{manageQuestionDraft.topic}</p>
                                </div>
                                <div className="text-right">
                                  <span className="block font-bold text-lg" style={{ color: 'var(--clr-primary-a50)' }}>Question {manageQuestionDraft.question_number || ''}</span>
                                  <span className="text-sm" style={{ color: 'var(--clr-surface-a50)' }}>{manageQuestionDraft.marks} Marks</span>
                                </div>
                              </div>

                              <div className="text-lg leading-relaxed space-y-4 font-serif" style={{ color: 'var(--clr-light-a0)' }}>
                                <LatexText text={manageQuestionDraft.question_text || ''} />
                                {manageQuestionDraft.graph_image_data && (
                                  <div className="my-4">
                                    <img
                                      src={manageQuestionDraft.graph_image_data}
                                      alt="Question graph"
                                      className={`rounded-lg border graph-image graph-image--${manageQuestionDraft.graph_image_size || 'medium'}`}
                                      style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                                    />
                                  </div>
                                )}
                              </div>

                              {manageQuestionDraft.marking_criteria && (
                                <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)' }}>
                                  <h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--clr-surface-a40)' }}>Marking Criteria</h4>
                                  <div className="font-serif text-base leading-relaxed space-y-2" style={{ color: 'var(--clr-light-a0)' }}>
                                    <LatexText text={manageQuestionDraft.marking_criteria} />
                                  </div>
                                </div>
                              )}

                              {manageQuestionDraft.sample_answer && (
                                <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-success-a10)' }}>
                                  <h4 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--clr-success-a20)' }}>Sample Answer</h4>
                                  <div className="font-serif text-base leading-relaxed space-y-2" style={{ color: 'var(--clr-light-a0)' }}>
                                    <LatexText text={manageQuestionDraft.sample_answer} />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <button
                                onClick={() => setManageQuestionEditMode((prev) => !prev)}
                                className="w-full px-4 py-2 rounded-lg font-medium cursor-pointer"
                                style={{ backgroundColor: 'var(--clr-primary-a0)', color: 'var(--clr-dark-a0)' }}
                              >
                                {manageQuestionEditMode ? 'Hide LaTeX Editor' : 'Edit LaTeX'}
                              </button>
                              <button
                                onClick={saveManageQuestion}
                                className="w-full px-4 py-2 rounded-lg font-medium cursor-pointer"
                                style={{ backgroundColor: 'var(--clr-success-a0)', color: 'var(--clr-light-a0)' }}
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => deleteQuestion(manageQuestionDraft.id)}
                                disabled={deletingQuestionId === manageQuestionDraft.id}
                                className="w-full px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
                                style={{ backgroundColor: 'var(--clr-danger-a0)', color: 'var(--clr-light-a0)' }}
                              >
                                {deletingQuestionId === manageQuestionDraft.id ? 'Deleting...' : 'Delete'}
                              </button>

                              {manageQuestionEditMode && (
                                <div className="mt-4">
                                  <label className="text-sm font-medium" style={{ color: 'var(--clr-surface-a50)' }}>Question (LaTeX)</label>
                                  <textarea
                                    value={manageQuestionDraft.question_text || ''}
                                    onChange={(e) => setManageQuestionDraft({ ...manageQuestionDraft, question_text: e.target.value })}
                                    rows={10}
                                    className="mt-2 w-full px-4 py-2 rounded-lg border font-mono text-sm"
                                    style={{
                                      backgroundColor: 'var(--clr-surface-a0)',
                                      borderColor: 'var(--clr-surface-tonal-a20)',
                                      color: 'var(--clr-primary-a50)',
                                    }}
                                  />
                                  <label className="text-sm font-medium mt-4 block" style={{ color: 'var(--clr-surface-a50)' }}>Marking Criteria (LaTeX)</label>
                                  <textarea
                                    value={manageQuestionDraft.marking_criteria || ''}
                                    onChange={(e) => setManageQuestionDraft({ ...manageQuestionDraft, marking_criteria: e.target.value })}
                                    rows={6}
                                    className="mt-2 w-full px-4 py-2 rounded-lg border font-mono text-sm"
                                    style={{
                                      backgroundColor: 'var(--clr-surface-a0)',
                                      borderColor: 'var(--clr-surface-tonal-a20)',
                                      color: 'var(--clr-primary-a50)',
                                    }}
                                  />
                                  <label className="text-sm font-medium mt-4 block" style={{ color: 'var(--clr-surface-a50)' }}>Sample Answer (LaTeX)</label>
                                  <textarea
                                    value={manageQuestionDraft.sample_answer || ''}
                                    onChange={(e) => setManageQuestionDraft({ ...manageQuestionDraft, sample_answer: e.target.value })}
                                    rows={6}
                                    className="mt-2 w-full px-4 py-2 rounded-lg border font-mono text-sm"
                                    style={{
                                      backgroundColor: 'var(--clr-surface-a0)',
                                      borderColor: 'var(--clr-surface-tonal-a20)',
                                      color: 'var(--clr-primary-a50)',
                                    }}
                                  />
                                  <label className="text-sm font-medium mt-4 block" style={{ color: 'var(--clr-surface-a50)' }}>Graph Image URL</label>
                                  <input
                                    type="text"
                                    value={manageQuestionDraft.graph_image_data || ''}
                                    onChange={(e) => {
                                      const nextUrl = e.target.value;
                                      setManageQuestionDraft({
                                        ...manageQuestionDraft,
                                        graph_image_data: nextUrl,
                                        graph_image_size: nextUrl ? (manageQuestionDraft.graph_image_size || 'medium') : manageQuestionDraft.graph_image_size,
                                      });
                                    }}
                                    placeholder="https://... or data:image/png;base64,..."
                                    className="mt-2 w-full px-4 py-2 rounded-lg border text-sm"
                                    style={{
                                      backgroundColor: 'var(--clr-surface-a0)',
                                      borderColor: 'var(--clr-surface-tonal-a20)',
                                      color: 'var(--clr-primary-a50)',
                                    }}
                                  />
                                  <label className="text-sm font-medium mt-4 block" style={{ color: 'var(--clr-surface-a50)' }}>Graph Image Size</label>
                                  <select
                                    value={manageQuestionDraft.graph_image_size || 'medium'}
                                    onChange={(e) => setManageQuestionDraft({ ...manageQuestionDraft, graph_image_size: e.target.value })}
                                    className="mt-2 w-full px-4 py-2 rounded-lg border text-sm"
                                    style={{
                                      backgroundColor: 'var(--clr-surface-a0)',
                                      borderColor: 'var(--clr-surface-tonal-a20)',
                                      color: 'var(--clr-primary-a50)',
                                    }}
                                  >
                                    <option value="small">Small</option>
                                    <option value="medium">Medium</option>
                                    <option value="large">Large</option>
                                    <option value="missing">Missing</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


          </div>
        </main>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowEditModal(false)}
          />
          <div
            className="relative w-full max-w-3xl rounded-2xl border p-6 shadow-2xl overflow-y-auto"
            style={{
              backgroundColor: 'var(--clr-surface-a10)',
              borderColor: 'var(--clr-surface-tonal-a20)',
              color: 'var(--clr-primary-a50)',
              maxHeight: '85vh',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Edit Question</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg cursor-pointer"
                style={{ backgroundColor: 'var(--clr-surface-a20)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Grade</label>
                <select
                  value={editQuestion.grade}
                  onChange={(e) => {
                    const nextGrade = e.target.value as 'Year 11' | 'Year 12';
                    const nextSubject = SUBJECTS_BY_YEAR[nextGrade][0];
                    const nextTopic = getTopics(nextGrade, nextSubject)[0] || '';
                    setEditQuestion({
                      ...editQuestion,
                      grade: nextGrade,
                      subject: nextSubject,
                      topic: nextTopic,
                    });
                  }}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                >
                  <option>Year 11</option>
                  <option>Year 12</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <input
                  type="number"
                  value={editQuestion.year}
                  onChange={(e) => setEditQuestion({ ...editQuestion, year: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <select
                  value={editQuestion.subject}
                  onChange={(e) => {
                    const nextSubject = e.target.value;
                    const nextTopics = getTopics(editQuestion.grade, nextSubject);
                    setEditQuestion({
                      ...editQuestion,
                      subject: nextSubject,
                      topic: nextTopics[0] || '',
                    });
                  }}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                >
                  {SUBJECTS_BY_YEAR[editQuestion.grade as 'Year 11' | 'Year 12']?.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <select
                  value={editQuestion.topic}
                  onChange={(e) => setEditQuestion({ ...editQuestion, topic: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                >
                  {getTopics(editQuestion.grade, editQuestion.subject).map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Marks</label>
                <input
                  type="number"
                  value={editQuestion.marks}
                  onChange={(e) => setEditQuestion({ ...editQuestion, marks: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Question Type</label>
                <select
                  value={editQuestion.questionType}
                  onChange={(e) => setEditQuestion({ ...editQuestion, questionType: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                >
                  <option value="written">Written Response</option>
                  <option value="multiple_choice">Multiple Choice</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Question Text</label>
              <textarea
                value={editQuestion.questionText}
                onChange={(e) => setEditQuestion({ ...editQuestion, questionText: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>

            {editQuestion.questionType === 'multiple_choice' ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Option A</label>
                    <input
                      type="text"
                      value={editQuestion.mcqOptionA}
                      onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionA: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Option B</label>
                    <input
                      type="text"
                      value={editQuestion.mcqOptionB}
                      onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionB: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Option C</label>
                    <input
                      type="text"
                      value={editQuestion.mcqOptionC}
                      onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionC: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Option D</label>
                    <input
                      type="text"
                      value={editQuestion.mcqOptionD}
                      onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionD: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Correct Answer</label>
                    <select
                      value={editQuestion.mcqCorrectAnswer}
                      onChange={(e) => setEditQuestion({ ...editQuestion, mcqCorrectAnswer: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Answer Explanation</label>
                  <textarea
                    value={editQuestion.mcqExplanation}
                    onChange={(e) => setEditQuestion({ ...editQuestion, mcqExplanation: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Marking Criteria</label>
                  <textarea
                    value={editQuestion.markingCriteria}
                    onChange={(e) => setEditQuestion({ ...editQuestion, markingCriteria: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Sample Answer</label>
                  <textarea
                    value={editQuestion.sampleAnswer}
                    onChange={(e) => setEditQuestion({ ...editQuestion, sampleAnswer: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--clr-surface-a0)',
                      borderColor: 'var(--clr-surface-tonal-a20)',
                      color: 'var(--clr-primary-a50)',
                    }}
                  />
                </div>
              </>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Graph Image (data URL)</label>
              <textarea
                value={editQuestion.graphImageData}
                onChange={(e) => setEditQuestion({ ...editQuestion, graphImageData: e.target.value })}
                onPaste={handleEditGraphPaste}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2">Graph Size</label>
                <select
                  value={editQuestion.graphImageSize}
                  onChange={(e) => setEditQuestion({ ...editQuestion, graphImageSize: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--clr-surface-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                >
                  Upload PNG
                  <input type="file" accept="image/png" hidden onChange={handleEditGraphUpload} />
                </label>
                {editQuestion.graphImageData && (
                  <span className="text-xs" style={{ color: 'var(--clr-surface-a40)' }}>
                    Image loaded
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--clr-surface-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={updateQuestionInDatabase}
                disabled={isUpdatingQuestion}
                className="px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--clr-success-a0)',
                  color: 'var(--clr-light-a0)',
                }}
              >
                {isUpdatingQuestion ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLatexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowLatexModal(false)}
          />
          <div
            className="relative w-full max-w-3xl rounded-2xl border p-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--clr-surface-a10)',
              borderColor: 'var(--clr-surface-tonal-a20)',
              color: 'var(--clr-primary-a50)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">LaTeX Source</h2>
              <button
                onClick={() => setShowLatexModal(false)}
                className="p-2 rounded-lg cursor-pointer"
                style={{ backgroundColor: 'var(--clr-surface-a20)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              readOnly
              value={question?.question_text || ''}
              className="w-full h-64 rounded-lg p-3 text-sm font-mono"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                color: 'var(--clr-primary-a50)',
                border: '1px solid var(--clr-surface-tonal-a20)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
