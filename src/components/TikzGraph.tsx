'use client';

import { useEffect, useRef } from 'react';

export default function TikzGraph({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // clear old content
    containerRef.current.innerHTML = '';

    // create REAL script tag (not React one)
    const script = document.createElement('script');
    script.type = 'text/tikz';
    script.text = code;

    containerRef.current.appendChild(script);

    // Wait for TikZJax to load, then process
    const checkAndProcess = () => {
      if ((window as any).tikzjax?.process) {
        (window as any).tikzjax.process();
      } else {
        // If not loaded yet, try again in 100ms
        setTimeout(checkAndProcess, 100);
      }
    };

    checkAndProcess();
  }, [code]);

  return <div ref={containerRef} />;
}
