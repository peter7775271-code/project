"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const winScroll = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      const progress = document.getElementById("progress");
      if (progress) progress.style.width = `${scrolled}%`;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-grid selection:bg-[#dacb7d] selection:text-black">
      <div id="progress" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-[#dacb7d] rounded-xl flex items-center justify-center font-black text-black transition-transform group-hover:rotate-12">
              H
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              HSC<span className="text-[#dacb7d]">AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[11px] font-bold tracking-[0.2em] uppercase">
            <a
              href="#features"
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all hover:text-[#dacb7d] hover:border-[#dacb7d]/40 hover:bg-[#dacb7d]/10"
            >
              Question Bank
            </a>
            <a
              href="#marking"
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all hover:text-[#dacb7d] hover:border-[#dacb7d]/40 hover:bg-[#dacb7d]/10"
            >
              Marking
            </a>
            <a
              href="#papers"
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all hover:text-[#dacb7d] hover:border-[#dacb7d]/40 hover:bg-[#dacb7d]/10"
            >
              Simulations
            </a>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="btn-primary px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden hero-gradient">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#dacb7d] opacity-[0.03] rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#21498a] opacity-[0.03] rounded-full mix-blend-screen filter blur-[120px] animate-blob"
          style={{ animationDelay: "-5s" }}
        />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center relative z-10">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#1e1d18] border border-[#dacb7d]/20 text-[#dacb7d] text-[10px] font-black tracking-[0.2em] mb-8 uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#dacb7d] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#dacb7d]" />
              </span>
              GPT-5 MATHEMATICS SPECIALIST
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-tight mb-8 tracking-tighter">
              Maths Study,<br />
              <span className="gold-shimmer">Decoded.</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-lg leading-relaxed font-light">
              Submit your handwritten working for Extension 1 & 2. Get pinpoint feedback on your proofs and logic instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <Link href="/hsc-generator?view=papers" className="btn-primary px-10 py-5 rounded-2xl text-lg font-black flex items-center justify-center gap-3">
                Attempt a Mathematics Paper
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link href="/hsc-generator" className="glass px-10 py-5 rounded-2xl text-lg font-black border border-white/10 hover:bg-white/5 transition-all text-center">
                Browse HSC Questions
              </Link>
            </div>
          </div>

          {/* Animated Mockup Container */}
          <div className="relative group">
            <div className="animate-float">
              <div className="glass rounded-[2.5rem] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <div className="scanner-line" />
                <div className="bg-black/40 rounded-3xl overflow-hidden border border-white/5">
                  <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                      </div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Grading Engine</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#dacb7d]">Maths Ext. 1 Specialist</span>
                  </div>

                  <div className="p-8">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <p className="text-[10px] font-black text-[#dacb7d] uppercase tracking-widest mb-1">2024 HSC / Q13(B)</p>
                        <h3 className="text-lg font-bold text-white">Further Calculus Skills</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-4xl font-black text-[#47d5a6]">3</span>
                        <span className="text-gray-600 font-bold">/5</span>
                      </div>
                    </div>

                    <div className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 text-[13px] text-gray-300">
                      <p className="mb-2 font-bold text-[#dacb7d]">Question (ii):</p>
                      <span>{`Hence, or otherwise, evaluate $\\int_0^{\\pi/4} (\\cos^4 x + \\sin^4 x) \\,dx$.`}</span>
                    </div>

                    <div className="relative mb-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5 handwritten-container text-2xl shadow-inner overflow-hidden">
                      <div className="handwritten-ink space-y-2">
                        <div>{`$\\int_0^{\\pi/4} \\frac{1 + \\cos^2 2x}{2} \\,dx$`}</div>
                        <div>{`$= \\frac{1}{2} [x + \\frac{1}{2}\\sin 2x]_0^{\\pi/4}$`}</div>
                        <div>{`$= \\frac{1}{2} (\\frac{\\pi}{4} + \\frac{1}{2})$`}</div>
                      </div>
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-[#9c2121] rounded-full blur-[2px] opacity-60" />
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-[#9c2121]/5 border border-[#9c2121]/20">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-[#d94a4a]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <p className="text-[10px] font-black text-[#eb9e9e] uppercase tracking-widest">Marking Feedback</p>
                        </div>
                        <p className="text-[11px] text-gray-400">{`Step 2: You integrated $\\cos^2 2x$ incorrectly. You must use the double angle identity $\\cos^2 \\theta = \\frac{1 + \\cos 2\\theta}{2}$ again. $-2$ marks.`}</p>
                      </div>
                      <button className="w-full py-2 bg-[#1a1a1a] rounded-lg text-[10px] font-black uppercase tracking-widest text-[#dacb7d] border border-[#dacb7d]/20 hover:bg-[#dacb7d]/10 transition-colors">
                        View Full Worked Solution
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#dacb7d]/10 blur-[120px] rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-40 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6">Designed for <span className="gold-shimmer">Maths.</span></h2>
            <p className="text-gray-500 text-xl font-light">The only platform that understands complex algebraic proofs as well as a human tutor.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 mb-32">
            <div className="glass p-10 rounded-[2rem] group">
              <div className="w-16 h-16 bg-[#dacb7d]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-8 h-8 text-[#dacb7d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Step-by-Step Analysis</h3>
              <p className="text-gray-500 leading-relaxed font-light">Our AI doesn't just look at the final answer. It marks every line of your working out against the NESA marking criteria.</p>
            </div>

            <div className="glass p-10 rounded-[2rem] border-t-2 border-t-[#dacb7d] group">
              <div className="w-16 h-16 bg-[#dacb7d]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-8 h-8 text-[#dacb7d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Handwriting Capture</h3>
              <p className="text-gray-500 leading-relaxed font-light">Proprietary math-specialised OCR converts messy student scripts into clean, analysable LaTeX data instantly.</p>
            </div>

            <div className="glass p-10 rounded-[2rem] group">
              <div className="w-16 h-16 bg-[#dacb7d]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-8 h-8 text-[#dacb7d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Worked Samples</h3>
              <p className="text-gray-500 leading-relaxed font-light">Every marking comes with a "Band 6 Standard" sample answer so you can see exactly how a top-tier student would solve it.</p>
            </div>
          </div>

          <div id="marking" className="grid lg:grid-cols-2 gap-20 items-center mb-48">
            <div className="order-2 lg:order-1 relative">
              <div className="glass p-8 rounded-[2.5rem] border-[#dacb7d]/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#dacb7d]/5 to-transparent" />
                <div className="relative space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Live Marking Log</span>
                    <span className="text-[10px] bg-[#47d5a6]/20 text-[#47d5a6] px-2 py-0.5 rounded font-bold">Matching Criteria</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-5 h-5 rounded-full bg-[#47d5a6] flex items-center justify-center text-black font-bold text-[10px] mt-1">✓</div>
                      <p className="text-sm text-gray-300">{`Identity $\\cos^2 x = \\frac{1 + \\cos 2x}{2}$ identified and correctly applied.`}</p>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-5 h-5 rounded-full bg-[#47d5a6] flex items-center justify-center text-black font-bold text-[10px] mt-1">✓</div>
                      <p className="text-sm text-gray-300">{`Integration bounds $[0, \\pi/4]$ handled correctly in Step 1.`}</p>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-5 h-5 rounded-full bg-[#9c2121] flex items-center justify-center text-white font-bold text-[10px] mt-1">!</div>
                      <p className="text-sm text-[#eb9e9e]">{`Calculus chain rule error in nested integration of $\\cos^2 2x$.`}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-400">Marking Precision</span>
                      <span className="text-xs font-bold text-[#dacb7d]">99.4% Accurate</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#dacb7d] w-[99.4%] animate-pulse-slow" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">Precision Marking, <br /><span className="gold-shimmer">Instantly.</span></h2>
              <p className="text-xl text-gray-400 font-light leading-relaxed">
                Upload your working and get feedback aligned to official HSC marking criteria. Our engine identifies every identity used and every logical step taken.
              </p>
              <button className="btn-primary px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest">See Sample Marking</button>
            </div>
          </div>

          <div id="papers" className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">Full Paper <br /><span className="gold-shimmer">Simulations.</span></h2>
              <p className="text-xl text-gray-400 font-light leading-relaxed">
                Attempt complete papers in a focused, exam-style experience. Time your progress and receive a full band-estimate report at the end.
              </p>
              <div className="flex gap-4 pt-4">
                <div className="px-4 py-2 glass rounded-lg border-[#dacb7d]/20 text-[10px] font-bold text-[#dacb7d] uppercase tracking-widest">3 Hour Mode</div>
                <div className="px-4 py-2 glass rounded-lg border-[#dacb7d]/20 text-[10px] font-bold text-[#dacb7d] uppercase tracking-widest">Section II Focus</div>
              </div>
            </div>
            <div className="relative">
              <div className="glass p-1 rounded-[3rem] border-white/10 relative">
                <div className="bg-black/60 rounded-[2.8rem] p-10 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-[#9c2121] animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-[0.3em] text-white">Focus Mode Active</span>
                    </div>
                    <div className="text-3xl font-mono text-white font-bold tracking-tighter">02:44:12</div>
                  </div>
                  <div className="space-y-6 opacity-40 grayscale">
                    <div className="h-4 w-3/4 bg-white/10 rounded-full" />
                    <div className="h-4 w-full bg-white/10 rounded-full" />
                    <div className="h-4 w-5/6 bg-white/10 rounded-full" />
                    <div className="h-4 w-full bg-white/10 rounded-full" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black to-transparent pt-20">
                    <button className="w-full py-5 glass rounded-2xl border-[#dacb7d]/40 text-[#dacb7d] font-black uppercase tracking-widest text-sm hover:bg-[#dacb7d] hover:text-black transition-all">Submit Paper for Marking</button>
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 -bottom-10 left-1/2 -translate-x-1/2 w-4/5 h-20 bg-[#dacb7d]/10 blur-[60px] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 glass mt-40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-2 opacity-50 grayscale">
            <div className="w-6 h-6 bg-[#dacb7d] rounded flex items-center justify-center font-black text-black text-[10px]">H</div>
            <span className="text-lg font-bold tracking-tight text-white uppercase tracking-widest">HSC.AI</span>
          </div>
          <div className="text-xs text-gray-600 font-bold uppercase tracking-widest">
            &copy; 2026 Developed for the Future of Australian Education.
          </div>
        </div>
      </footer>
    </div>
  );
}