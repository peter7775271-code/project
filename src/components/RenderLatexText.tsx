'use client';

import { useEffect, useRef } from 'react';

type Props = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

export default function RenderLatexText({ text, className, style }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const render = async () => {
      const html = escapeHtml(text).replace(/\n/g, '<br />');
      container.innerHTML = html;

      try {
        await ensureKatex();
        if (cancelled || !containerRef.current) return;

        const renderMathInElement = (window as any).renderMathInElement;
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(containerRef.current, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\[', right: '\\]', display: true },
              { left: '\\(', right: '\\)', display: false },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
          });
        }
      } catch {
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [text]);

  return <div ref={containerRef} className={className} style={{ whiteSpace: 'pre-wrap', ...style }} />;
}
