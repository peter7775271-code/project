'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

export default function TikzRenderer({ code }: { code: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded || !elementRef.current) return;

    try {
      elementRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.type = 'text/tikz';
      script.textContent = code;
      elementRef.current.appendChild(script);

      if ((window as any).tikzjax?.process) {
        (window as any).tikzjax.process(elementRef.current);
      }
    } catch (err) {
      setError('TikZJax failed to render.');
    }
  }, [code, isLoaded]);

  return (
    <div>
      <Script
        src="https://tikzjax.com/v1/tikzjax.js"
        strategy="lazyOnload"
        onLoad={() => setIsLoaded(true)}
        onError={() => setError('TikZJax failed to load.')}
      />
      <div className="tikz-container" ref={elementRef}>
        <script type="text/tikz" dangerouslySetInnerHTML={{ __html: code }} />
      </div>
      {!isLoaded && !error && (
        <div style={{ opacity: 0.7 }}>Rendering graph...</div>
      )}
      {error && (
        <div style={{ color: 'var(--clr-warning-a10)' }}>{error}</div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    tikzjax: any;
  }
}
