'use client';

import { useEffect } from 'react';

export default function HscGeneratorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('HSC generator error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--clr-surface-a0)', color: 'var(--clr-primary-a50)' }}>
      <div className="max-w-xl w-full rounded-2xl border p-6" style={{ backgroundColor: 'var(--clr-surface-a10)', borderColor: 'var(--clr-surface-tonal-a20)' }}>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="mb-4" style={{ color: 'var(--clr-surface-a40)' }}>{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--clr-primary-a0)', color: 'var(--clr-dark-a0)' }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
