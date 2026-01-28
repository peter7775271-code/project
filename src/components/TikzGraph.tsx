'use client';

import { useEffect, useRef, useState } from 'react';

export default function TikzGraph({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setStatus('loading');
    setError(null);

    // clear old content
    containerRef.current.innerHTML = '';

    const sanitized = code.includes('\\begin{tikzpicture}')
      ? code
      : `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`;

    // create REAL script tag (not React one)
    const script = document.createElement('script');
    script.type = 'text/tikz';
    script.text = sanitized;

    containerRef.current.appendChild(script);

    let attempts = 0;
    const maxAttempts = 50; // ~5s

    // Wait for TikZJax to load, then process
    const checkAndProcess = () => {
      attempts += 1;

      if ((window as any).tikzjax?.process) {
        try {
          (window as any).tikzjax.process();
          setStatus('ready');
        } catch (err) {
          setStatus('error');
          setError('TikZJax failed to render the diagram.');
        }
      } else if (attempts >= maxAttempts) {
        setStatus('error');
        setError('TikZJax did not load.');
      } else {
        setTimeout(checkAndProcess, 100);
      }
    };

    checkAndProcess();
  }, [code]);

  return (
    <div>
      {status === 'loading' && (
        <div style={{ opacity: 0.7 }}>Rendering graph...</div>
      )}
      {status === 'error' && (
        <div style={{ color: 'var(--clr-warning-a10)' }}>{error}</div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
