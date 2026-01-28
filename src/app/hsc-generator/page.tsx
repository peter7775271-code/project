'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { 
  Undo2, Redo2, Trash2, Send, Upload, ArrowLeft,
  BookOpen, Calculator, Atom, Beaker, ChevronRight,
  RefreshCw, Eye, Download, Bookmark, Settings, Menu, X,
  CheckCircle2, AlertTriangle, XCircle, TrendingUp
} from 'lucide-react';

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
  "HSC Practice Question (15 marks)\n\nAnalyse how language techniques are used to shape the audience's understanding of identity in ONE prescribed text. In your response, refer to specific textual evidence.",
  "HSC Practice Question (10 marks)\n\nExplain the process of photosynthesis and its importance in ecosystems.",
  "HSC Practice Question (12 marks)\n\nDiscuss the causes and effects of climate change on global agriculture.",
  "HSC Practice Question (15 marks)\n\nAnalyse the economic impact of the Industrial Revolution on society.",
  "HSC Practice Question (10 marks)\n\nDescribe the structure and function of the human circulatory system.",
  "HSC Practice Question (12 marks)\n\nEvaluate the role of technology in modern education.",
  "HSC Practice Question (15 marks)\n\nCompare and contrast traditional and digital marketing strategies.",
  "HSC Practice Question (10 marks)\n\nExplain Newton's Laws of Motion and provide real-world examples.",
  "HSC Practice Question (12 marks)\n\nDiscuss the impact of globalisation on developing economies.",
  "HSC Practice Question (15 marks)\n\nAnalyse the themes of identity and belonging in contemporary literature.",
];

const MOCK_FEEDBACK = {
  score: 13,
  maxMarks: 15,
  band: 'E4',
  summary: "Strong conceptual understanding demonstrated. You correctly applied key concepts and provided relevant examples. Minor improvements needed in depth of analysis and explicit reference to marking criteria.",
  breakdown: [
    { type: 'success', text: 'Clear identification of key language techniques used in the text.', mark: '+3' },
    { type: 'success', text: 'Strong analysis of how techniques shape audience understanding.', mark: '+4' },
    { type: 'success', text: 'Appropriate textual evidence provided throughout.', mark: '+4' },
    { type: 'warning', text: 'Could strengthen argument with more sophisticated linkage between techniques and effects.', mark: '+2' }
  ]
};

export default function HSCGeneratorPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);

  const historyRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  const [question, setQuestion] = useState(HSC_QUESTIONS[0]);
  const [brushSize, setBrushSize] = useState(2);
  const [canRedo, setCanRedo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [yearLevel, setYearLevel] = useState<'Year 11' | 'Year 12'>('Year 12');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appState, setAppState] = useState<'idle' | 'marking' | 'reviewed'>('idle');

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

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
    saveState();
  }, []);

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

  const clearCanvas = () => {
    redrawBackground();
    saveState();
  };

  const submitAnswer = () => {
    setAppState('marking');
    setTimeout(() => setAppState('reviewed'), 2000);
  };

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      restoreState(reader.result as string);
      saveState();
    };
    reader.readAsDataURL(file);
  };

  const generateQuestion = () => {
    const randomIndex = Math.floor(Math.random() * HSC_QUESTIONS.length);
    setQuestion(HSC_QUESTIONS[randomIndex]);
    setIsGenerating(true);
    setShowAnswer(false);
    clearCanvas();
    setTimeout(() => setIsGenerating(false), 800);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-serif selection:bg-white/20">
      <style jsx global>{`
        body { font-family: 'CMU Serif', serif; }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-100 text-zinc-950 rounded-lg flex items-center justify-center font-bold text-xl">
            ∑
          </div>
          <span className="font-bold text-lg">HSC Forge</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:h-auto
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 h-full flex flex-col">
            <div className="hidden lg:flex items-center gap-3 mb-10">
              <div className="w-8 h-8 bg-zinc-100 text-zinc-950 rounded-lg flex items-center justify-center font-bold text-xl">
                ∑
              </div>
              <span className="font-bold text-xl tracking-tight">HSC Forge</span>
            </div>

            <div className="space-y-1 flex-1">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 px-2">Subjects</p>
              {SUBJECTS.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => { setSelectedSubject(subject); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    selectedSubject.id === subject.id 
                      ? 'bg-zinc-100 text-zinc-950 shadow-lg' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {subject.icon}
                    <span className="font-medium text-sm">{subject.name}</span>
                  </div>
                  {selectedSubject.id === subject.id && (
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-zinc-800">
              <button className="flex items-center gap-3 p-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl w-full transition-colors">
                <Settings className="w-5 h-5" />
                <span className="font-medium text-sm">Settings</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 p-4 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">{selectedSubject.name}</h1>
                <p className="text-zinc-400 text-lg">Practice exam-style questions and handwrite your answers.</p>
              </div>
              <button 
                onClick={generateQuestion}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 bg-zinc-100 text-zinc-950 px-6 py-3 rounded-xl font-bold hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-70 disabled:hover:scale-100 whitespace-nowrap"
              >
                <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap gap-3 pb-4 border-b border-zinc-800">
              <select className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-700 text-sm">
                <option>All Topics</option>
              </select>
              <select className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-700 text-sm">
                <option>Any Difficulty</option>
                <option>Band 4</option>
                <option>Band 5</option>
                <option>Band 6</option>
              </select>
              <select className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-700 text-sm">
                <option>All Years</option>
                <option>2023</option>
                <option>2022</option>
                <option>2021</option>
              </select>
            </div>

            {/* Year Level Selector */}
            <div className="flex items-center gap-4">
              <span className="text-zinc-400 text-sm font-medium">Year Level:</span>
              <div className="flex gap-2">
                {(['Year 11', 'Year 12'] as const).map((year) => (
                  <button
                    key={year}
                    onClick={() => setYearLevel(year)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      yearLevel === year
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Card */}
            <div className="relative">
              <div className="absolute top-2 left-2 w-full h-full bg-zinc-800 rounded-2xl -z-10" />
              
              <div className={`bg-zinc-900 text-zinc-100 rounded-2xl p-8 lg:p-12 shadow-2xl border border-zinc-800 transition-all duration-500 ${isGenerating ? 'blur-sm scale-[0.99] opacity-80' : 'blur-0 scale-100 opacity-100'}`}>
                <div className="flex justify-between items-start border-b border-zinc-700 pb-6 mb-8">
                  <div>
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-1 block">2024 HSC</span>
                    <span className="text-2xl font-bold text-zinc-100">{selectedSubject.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-lg text-zinc-100">Question</span>
                    <span className="text-zinc-400 font-semibold">15 Marks</span>
                  </div>
                </div>

                <div className="text-lg leading-relaxed space-y-4 font-serif whitespace-pre-wrap text-zinc-200">
                  {question}
                </div>
              </div>
            </div>

            {/* Drawing Canvas */}
            {appState === 'idle' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-4">
                <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Answer Area</label>
                <canvas
                  ref={canvasRef}
                  className="w-full h-[400px] rounded-xl bg-zinc-950 cursor-crosshair block"
                  style={{ touchAction: 'none' }}
                  onPointerDown={startDraw}
                  onPointerMove={draw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                  onPointerCancel={endDraw}
                />
              </div>
            )}

            {/* Canvas Controls */}
            {appState === 'idle' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 rounded-lg font-semibold transition text-sm text-zinc-100"
                  >
                    <Undo2 className="w-4 h-4" />
                    Undo
                  </button>

                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 rounded-lg font-semibold transition text-sm text-zinc-100"
                  >
                    <Redo2 className="w-4 h-4" />
                    Redo
                  </button>

                  <button
                    onClick={clearCanvas}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold transition text-sm text-zinc-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </button>
                </div>

                <div className="flex gap-2 sm:ml-auto">
                  <button
                    onClick={submitAnswer}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition text-sm text-white flex-1 sm:flex-none justify-center"
                  >
                    <Send className="w-4 h-4" />
                    Submit
                  </button>

                  <label className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold transition cursor-pointer text-sm text-zinc-100">
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
              <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/50 backdrop-blur-md p-4 rounded-2xl border border-zinc-800">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors font-medium text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    {showAnswer ? 'Hide' : 'Show'} Solution
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors font-medium text-sm">
                    <Bookmark className="w-4 h-4" />
                    Save
                  </button>
                </div>
                
                <button className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-zinc-100 transition-colors font-medium text-sm">
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            )}

            {/* Solution Panel */}
            {showAnswer && appState === 'idle' && (
              <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <h3 className="text-emerald-400 font-bold text-xl mb-4">Sample Solution</h3>
                <div className="text-zinc-300 font-serif text-lg leading-relaxed space-y-4">
                  <p>A detailed solution will appear here. Use this as a guide to check your working and understanding.</p>
                  <p className="text-sm text-zinc-500 italic">Generate a new question to see different solutions.</p>
                </div>
              </div>
            )}

            {/* Marking Feedback Section */}
            {appState === 'marking' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center justify-center min-h-[300px]">
                  <RefreshCw className="w-12 h-12 text-zinc-400 animate-spin mb-4" />
                  <h3 className="text-xl font-bold text-zinc-100">AI is marking your response...</h3>
                  <p className="text-zinc-400 mt-2">Checking against NESA Marking Guidelines</p>
                </div>
              </div>
            )}

            {/* Reviewed Feedback */}
            {appState === 'reviewed' && (
              <div className="animate-fade-in space-y-4">
                
                {/* Marking Report Card */}
                <div className="bg-zinc-900 text-zinc-100 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                    
                    {/* Report Header */}
                    <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-6">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                Marking Complete
                            </h3>
                            <p className="text-zinc-400 text-sm mt-1">Assessed against 2024 HSC Guidelines</p>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Est. Band</span>
                                <span className="text-2xl font-bold text-emerald-400">{MOCK_FEEDBACK.band}</span>
                            </div>
                            <div className="h-16 w-px bg-zinc-800 hidden sm:block"></div>
                            <div className="text-right">
                                <span className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Score</span>
                                <div className="flex items-baseline gap-1 justify-end">
                                    <span className="text-4xl font-bold text-white">{MOCK_FEEDBACK.score}</span>
                                    <span className="text-xl text-zinc-500 font-medium">/{MOCK_FEEDBACK.maxMarks}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* General Feedback */}
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Examiner's Comment
                        </h4>
                        <p className="text-lg leading-relaxed text-zinc-300 font-serif italic">
                            "{MOCK_FEEDBACK.summary}"
                        </p>
                    </div>

                    {/* Breakdown List */}
                    <div className="p-6 space-y-1">
                        {MOCK_FEEDBACK.breakdown.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-lg hover:bg-zinc-800/50 transition-colors">
                                <div className="mt-1 flex-shrink-0">
                                    {item.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    {item.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                                    {item.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-zinc-200">{item.text}</p>
                                </div>
                                <div className={`font-mono font-bold ${
                                    item.type === 'success' ? 'text-emerald-500' : 'text-amber-500'
                                }`}>
                                    {item.mark}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sample Answer Section */}
                    <div className="bg-zinc-950 p-8 border-t border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Sample Solution
                            </h3>
                            <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                                View Full Working
                            </button>
                        </div>
                        
                        <div className="text-zinc-300 font-serif text-lg leading-relaxed space-y-3 pl-4 border-l-2 border-zinc-800">
                            <p>A strong response would systematically analyse the techniques, explain their effects, and link them to the overall message.</p>
                            <p className="text-sm text-zinc-400">Key strategies: Select 2-3 techniques, analyse their individual effects, then explain the cumulative impact on the audience.</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-zinc-800 p-6 flex gap-3">
                        <button
                            onClick={() => { setAppState('idle'); clearCanvas(); }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-all"
                        >
                            Try Next Question
                        </button>
                        <button
                            onClick={() => setAppState('idle')}
                            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors"
                        >
                            Review Answer
                        </button>
                    </div>

                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
