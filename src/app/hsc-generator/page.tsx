'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { 
  Undo2, Redo2, Trash2, Send, Upload, ArrowLeft,
  BookOpen, Calculator, Atom, Beaker, ChevronRight,
  RefreshCw, Eye, Download, Bookmark, Settings, Menu, X,
  CheckCircle2, AlertTriangle, XCircle, TrendingUp, Edit2
} from 'lucide-react';
import TikzGraph from '@/components/TikzGraph';

// LaTeX and TikZ renderer component
function LatexText({ text }: { text: string }) {
  const [segments, setSegments] = useState<
    Array<{
      type: 'html' | 'tikz';
      content: string;
    }>
  >([]);

  useEffect(() => {
    const parseTextIntoSegments = () => {
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
      
      setSegments(segmentList);
    };

    parseTextIntoSegments();
  }, [text]);

  return (
    <div className="latex-text">
      {segments.map((segment, i) => {
        if (segment.type === 'tikz') {
          return (
            <div key={`tikz-${i}`} className="tikz-output">
              <TikzGraph code={segment.content} />
            </div>
          );
        }
        return <HtmlSegment key={`html-${i}`} html={segment.content} />;
      })}
    </div>
  );
}

// Separate component to handle LaTeX rendering for each HTML segment
function HtmlSegment({ html }: { html: string }) {
  const [rendered, setRendered] = useState<string>(html);

  useEffect(() => {
    const renderLatex = () => {
      if (!(window as any).katex) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
        script.async = true;
        
        script.onload = () => {
          processLatex();
        };
        
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
        document.head.appendChild(styleLink);
        
        document.head.appendChild(script);
      } else {
        processLatex();
      }
    };

    const processLatex = () => {
      if (!(window as any).katex) return;
      
      try {
        let result = html;
        
        // Process display mode LaTeX ($$...$$)
        result = result.replace(/\$\$([^\$]+)\$\$/g, (match, latex) => {
          try {
            const rendered = (window as any).katex.renderToString(latex, { 
              throwOnError: false,
              displayMode: true 
            });
            return `<div class="katex-wrapper">${rendered}</div>`;
          } catch (e) {
            return match;
          }
        });
        
        // Process inline LaTeX ($...$)
        result = result.replace(/\$([^\$]+)\$/g, (match, latex) => {
          try {
            const rendered = (window as any).katex.renderToString(latex, { throwOnError: false });
            return `<span class="katex-wrapper">${rendered}</span>`;
          } catch (e) {
            return match;
          }
        });
        
        // Convert newlines to <br> tags
        result = result.replace(/\n/g, '<br />');
        
        setRendered(result);
      } catch (e) {
        console.error('LaTeX error:', e);
        setRendered(html);
      }
    };

    renderLatex();
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />;
}

type Subject = {
  id: string;
  name: string;
  icon: React.ReactNode;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);

  const historyRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  // Question data from database
  type Question = {
    id: string;
    grade: string;
    year: number;
    subject: string;
    topic: string;
    marks: number;
    question_text: string;
    marking_criteria: string;
    sample_answer: string;
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
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [savedAttempts, setSavedAttempts] = useState<any[]>([]);
  const [showSavedAttempts, setShowSavedAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'generator' | 'saved' | 'settings' | 'dev-questions'>('generator');
  const [isSaving, setIsSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userCreatedAt, setUserCreatedAt] = useState<string>('');

  // Dev mode state
  const [isDevMode, setIsDevMode] = useState(false);
  const [devTab, setDevTab] = useState<'add' | 'manage'>('add');
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    grade: 'Year 12',
    year: new Date().getFullYear().toString(),
    subject: 'Mathematics Advanced',
    topic: 'Complex Numbers',
    marks: 4,
    questionText: '',
    markingCriteria: '',
    sampleAnswer: '',
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Filter state
  const [filterGrade, setFilterGrade] = useState<string>(yearLevel);
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterTopic, setFilterTopic] = useState<string>('');

  // Available filter options
  const YEARS = ['2020', '2021', '2022', '2023', '2024'];
  const SUBJECTS = ['Mathematics Advanced', 'Mathematics Extension 1', 'Mathematics Extension 2'];
  const TOPICS = ['Complex Numbers', 'Calculus - Differentiation', 'Trigonometric Equations', 'Integration', 'Logarithms and Exponentials', 'Trigonometry', 'Mathematical Induction', 'Surds and Radicals', 'Quadratic Functions'];

  // Check user auth and dev mode on mount
  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
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
    }
  }, []);

  // Fetch questions when entering dev mode
  useEffect(() => {
    if (viewMode === 'dev-questions' && devTab === 'manage') {
      fetchAllQuestions();
    }
  }, [viewMode, devTab]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const oldImageData = canvas.toDataURL();
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'white';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctxRef.current = ctx;

    // Only restore previous content if we have history and it's not empty
    if (historyRef.current.length > 0) {
      const img = new Image();
      img.src = oldImageData;
      img.onload = () => {
        redrawBackground();
        ctxRef.current?.drawImage(img, 0, 0);
        saveState();
      };
    } else {
      // Fresh canvas - just draw the background
      redrawBackground();
      // Initialize with first state
      setTimeout(() => {
        if (canvasRef.current && ctxRef.current) {
          historyRef.current = [canvasRef.current.toDataURL()];
        }
      }, 0);
    }
  }, [canvasHeight, brushSize]);

  // Draw exam-style ruled lines
  const drawLines = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !canvas) return;

    const spacing = 34;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;

    for (let y = spacing; y < canvas.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(canvas.width - 10, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Redraw background before strokes (so lines never disappear)
  const redrawBackground = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLines();
  };

  // History handling
  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    historyRef.current.push(canvas.toDataURL());
    if (historyRef.current.length > 50) historyRef.current.shift();

    redoStackRef.current = [];
    setCanRedo(false);
    setCanUndo(historyRef.current.length > 1);
  };

  const restoreState = (src: string) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      redrawBackground();
      ctxRef.current?.drawImage(img, 0, 0);
    };
  };

  // Drawing - optimized for pen input with Pointer Events API
  const lastPosRef = useRef<[number, number]>([0, 0]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return [0, 0];
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    return [x, y];
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) canvas.setPointerCapture(e.pointerId);
    
    drawingRef.current = true;
    const [x, y] = getPos(e);
    lastPosRef.current = [x, y];
    ctxRef.current?.beginPath();
    ctxRef.current?.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const [x, y] = getPos(e);
    const [lastX, lastY] = lastPosRef.current;

    // Use quadratic curve for smoother lines
    if (ctxRef.current) {
      ctxRef.current.quadraticCurveTo(lastX, lastY, (x + lastX) / 2, (y + lastY) / 2);
      ctxRef.current.stroke();
    }

    lastPosRef.current = [x, y];
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    
    if (!drawingRef.current) return;
    drawingRef.current = false;
    saveState();
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
        marks: question.marks,
        subject: question.subject,
        topic: question.topic,
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
          questionText: '',
          markingCriteria: '',
          sampleAnswer: '',
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

  const clearCanvas = () => {
    // Clear all history and redo stacks
    historyRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    
    // Clear the canvas
    redrawBackground();
    saveState();
  };

  const submitAnswer = async () => {
    if (!question) return;
    
    setAppState('marking');
    
    try {
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
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI marking');
      }
      
      const data = await response.json();
      
      setFeedback({
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
      // Also display it on the canvas
      restoreState(dataUrl);
      saveState();
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

      const response = await fetch(`/api/hsc/questions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }

      const data = await response.json();
      setQuestion(data.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question');
      console.error('Error fetching question:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const extendCanvas = () => {
    setCanvasHeight((prev) => prev + 300);
  };

  // Initial load
  useEffect(() => {
    const loadInitialQuestion = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hsc/questions?grade=${yearLevel}`);
        if (response.ok) {
          const data = await response.json();
          setQuestion(data.question);
        }
      } catch (err) {
        console.error('Error loading initial question:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialQuestion();
  }, []);

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
      `}</style>

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
            
            {viewMode === 'generator' ? (
              <>
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 
                  className="text-4xl font-bold mb-2"
                  style={{ color: 'var(--clr-primary-a50)' }}
                >HSC Practice Generator</h1>
                <p 
                  className="text-lg"
                  style={{ color: 'var(--clr-surface-a40)' }}
                >Practice exam-style questions and handwrite your answers.</p>
              </div>
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
            </div>

            {/* Filters Bar */}
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
                {SUBJECTS.map((subject) => (
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
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>

            {/* Question Card */}
            <div className="relative">
              <div 
                className="absolute top-2 left-2 w-full h-full rounded-2xl -z-10"
                style={{ backgroundColor: 'var(--clr-surface-a20)' }}
              />
              
              <div 
                className={`text-zinc-100 rounded-2xl p-8 lg:p-12 shadow-2xl border transition-all duration-500 ${isGenerating ? 'blur-sm scale-[0.99] opacity-80' : 'blur-0 scale-100 opacity-100'}`}
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
                        onClick={generateQuestion}
                        className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : question ? (
                  <>
                    <div className="flex justify-between items-start border-b border-zinc-700 pb-6 mb-8">
                      <div>
                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-1 block">{question.year} HSC</span>
                        <span className="text-2xl font-bold text-zinc-100">{question.subject}</span>
                        <span className="text-zinc-400 text-sm block mt-1">{question.topic}</span>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-lg text-zinc-100">Question</span>
                        <span className="text-zinc-400 font-semibold">{question.marks} Marks</span>
                      </div>
                    </div>

                    <div 
                      className="text-lg leading-relaxed space-y-4 font-serif whitespace-pre-wrap"
                      style={{ color: 'var(--clr-light-a0)' }}
                    >
                      <LatexText text={question.question_text} />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center min-h-[300px]">
                    <p style={{ color: 'var(--clr-surface-a40)' }}>Click "Generate" to load a question</p>
                  </div>
                )}
              </div>
            </div>

            {/* Drawing Canvas */}
            {appState === 'idle' && (
              <div 
                className="border rounded-2xl shadow-2xl p-4"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                }}
              >
                <label 
                  className="block text-sm font-semibold mb-3 uppercase tracking-wide"
                  style={{ color: 'var(--clr-surface-a40)' }}
                >Answer Area</label>
                <div 
                  className="max-h-[600px] overflow-y-auto rounded-xl"
                  style={{ backgroundColor: 'var(--clr-surface-a0)' }}
                >
                  <canvas
                    ref={canvasRef}
                    className="w-full cursor-crosshair block"
                    style={{ touchAction: 'none', height: `${canvasHeight}px` }}
                    onPointerDown={startDraw}
                    onPointerMove={draw}
                    onPointerUp={endDraw}
                    onPointerLeave={endDraw}
                    onPointerCancel={endDraw}
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
            {appState === 'idle' && (
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
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition text-sm flex-1 sm:flex-none justify-center cursor-pointer"
                    style={{
                      backgroundColor: 'var(--clr-success-a0)',
                      color: 'var(--clr-light-a0)',
                    }}
                  >
                    <Send className="w-4 h-4" />
                    Submit
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
                  {question?.sample_answer ? (
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

            {/* Marking Feedback Section */}
            {appState === 'marking' && (
              <div 
                className="border rounded-2xl p-8 shadow-2xl"
                style={{
                  backgroundColor: 'var(--clr-surface-a10)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                }}
              >
                <div className="flex flex-col items-center justify-center min-h-[300px]">
                  <RefreshCw className="w-12 h-12 animate-spin mb-4" style={{ color: 'var(--clr-surface-a40)' }} />
                  <h3 className="text-xl font-bold" style={{ color: 'var(--clr-primary-a50)' }}>AI is marking your response...</h3>
                  <p className="mt-2" style={{ color: 'var(--clr-surface-a40)' }}>Checking against NESA Marking Guidelines</p>
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
                                <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--clr-success-a10)' }} />
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
                                >Max Score</span>
                                <div className="flex items-baseline gap-1 justify-end">
                                    <span 
                                      className="text-4xl font-bold"
                                      style={{ color: 'var(--clr-primary-a50)' }}
                                    >{feedback.maxMarks}</span>
                                    <span 
                                      className="text-xl font-medium"
                                      style={{ color: 'var(--clr-surface-a50)' }}
                                    >marks</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Feedback Section */}
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
                            AI Feedback
                        </h4>
                        <div 
                          className="text-base leading-relaxed space-y-3"
                          style={{ color: 'var(--clr-primary-a40)' }}
                        >
                            {feedback.ai_evaluation ? (
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
                                        // Parse marking criteria by splitting on "mark" or "marks"
                                        const criteriaText = feedback.marking_criteria;
                                        const lines = criteriaText.split(/\n/).filter((line: string) => line.trim());
                                        
                                        return lines.map((line: string, idx: number) => {
                                          // Try to extract marks value (e.g., "1.5 marks" or "2 mark")
                                          const markMatch = line.match(/([\d.]+)\s*marks?/i);
                                          if (markMatch) {
                                            const markValue = markMatch[1];
                                            // Remove the mark portion from the criteria text
                                            const criteriaOnly = line.replace(/[\d.]+\s*marks?/gi, '').replace(/:\s*$/, '').trim();
                                            
                                            return (
                                              <tr 
                                                key={idx} 
                                                className="border-b transition-colors"
                                                style={{ 
                                                  borderColor: 'var(--clr-surface-tonal-a20)',
                                                }}
                                              >
                                                <td 
                                                  className="py-3 px-3"
                                                  style={{ color: 'var(--clr-light-a0)' }}
                                                >
                                                  <LatexText text={criteriaOnly} />
                                                </td>
                                                <td 
                                                  className="py-3 px-3 text-right font-mono font-bold"
                                                  style={{ color: 'var(--clr-success-a10)' }}
                                                >
                                                  {markValue}
                                                </td>
                                              </tr>
                                            );
                                          }
                                          return null;
                                        }).filter(Boolean);
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sample Answer Section */}
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
                            Sample Solution
                        </h3>
                        
                        <div 
                          className="font-serif text-base leading-relaxed space-y-3 pl-4 border-l-2"
                          style={{
                            color: 'var(--clr-light-a0)',
                            borderColor: 'var(--clr-success-a10)',
                          }}
                        >
                            <LatexText text={feedback.sample_answer} />
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
                          <img src={submittedAnswer} alt="Student answer" className="w-full rounded" style={{ borderColor: 'var(--clr-surface-tonal-a20)', border: '1px solid var(--clr-surface-tonal-a20)' }} />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div 
                      className="border-t p-6 flex gap-3"
                      style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                    >
                        <button
                            onClick={() => generateQuestion()}
                            className="flex-1 px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                          <img 
                            src={selectedAttempt.submittedAnswer} 
                            alt="Student answer" 
                            className="w-full rounded-lg border"
                            style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                          />
                        </div>
                      )}

                      {/* AI Feedback */}
                      {selectedAttempt.feedback?.ai_evaluation && (
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
                          >AI Feedback</h3>
                          <div 
                            className="space-y-2"
                            style={{ color: 'var(--clr-primary-a40)' }}
                          >
                            <LatexText text={selectedAttempt.feedback.ai_evaluation} />
                          </div>
                        </div>
                      )}

                      {/* Marking Criteria */}
                      {selectedAttempt.feedback?.marking_criteria && (
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
                                  const lines = criteriaText.split(/\n/).filter((line: string) => line.trim());
                                  
                                  return lines.map((line: string, idx: number) => {
                                    const markMatch = line.match(/([\d.]+)\s*marks?/i);
                                    if (markMatch) {
                                      const markValue = markMatch[1];
                                      const criteriaOnly = line.replace(/[\d.]+\s*marks?/gi, '').replace(/:\s*$/, '').trim();
                                      
                                      return (
                                        <tr 
                                          key={idx} 
                                          className="border-b transition-colors"
                                          style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}
                                        >
                                          <td 
                                            className="py-3 px-3"
                                            style={{ color: 'var(--clr-light-a0)' }}
                                          >
                                            <LatexText text={criteriaOnly} />
                                          </td>
                                          <td 
                                            className="py-3 px-3 text-right font-mono font-bold"
                                            style={{ color: 'var(--clr-success-a10)' }}
                                          >
                                            {markValue}
                                          </td>
                                        </tr>
                                      );
                                    }
                                    return null;
                                  }).filter(Boolean);
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
                            {attempt.feedback?.ai_evaluation && (
                              <div className="pt-2">
                                <p className="text-xs text-zinc-500 line-clamp-1">{attempt.feedback.ai_evaluation.split('\n')[0]}</p>
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
                      onChange={(e) => setNewQuestion({...newQuestion, grade: e.target.value})}
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
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Subject</label>
                    <select 
                      value={newQuestion.subject}
                      onChange={(e) => setNewQuestion({...newQuestion, subject: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--clr-surface-a0)',
                        borderColor: 'var(--clr-surface-tonal-a20)',
                        color: 'var(--clr-primary-a50)',
                      }}
                    >
                      <option>Mathematics Advanced</option>
                      <option>Mathematics Extension 1</option>
                      <option>Mathematics Extension 2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-primary-a50)' }}>Topic</label>
                    <input 
                      type="text" 
                      value={newQuestion.topic}
                      onChange={(e) => setNewQuestion({...newQuestion, topic: e.target.value})}
                      placeholder="e.g., Complex Numbers"
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
              <div className="max-w-4xl">
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
                  <div className="space-y-3">
                    {allQuestions.map((q) => (
                      <div 
                        key={q.id}
                        className="p-4 rounded-lg border flex items-center justify-between"
                        style={{
                          backgroundColor: 'var(--clr-surface-a10)',
                          borderColor: 'var(--clr-surface-tonal-a20)',
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: 'var(--clr-primary-a50)' }}>{q.subject}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--clr-surface-a20)', color: 'var(--clr-surface-a50)' }}>{q.year}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--clr-surface-a20)', color: 'var(--clr-surface-a50)' }}>{q.marks}m</span>
                          </div>
                          <p style={{ color: 'var(--clr-surface-a40)' }} className="text-sm">{q.topic}</p>
                          <p style={{ color: 'var(--clr-primary-a40)' }} className="text-xs mt-1 line-clamp-1">{q.question_text}</p>
                        </div>
                        <button 
                          onClick={() => deleteQuestion(q.id)}
                          disabled={deletingQuestionId === q.id}
                          className="ml-4 px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--clr-danger-a0)',
                            color: 'var(--clr-light-a0)',
                          }}
                        >
                          {deletingQuestionId === q.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    ))}
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
    </div>
  );
}
