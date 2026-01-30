import LoginForm from '@/components/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-grid selection:bg-[#dacb7d] selection:text-black">
      <div className="absolute inset-0 -z-10" />

      <main className="relative z-10 w-full max-w-md px-6 animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#dacb7d] rounded-xl flex items-center justify-center font-black text-black">H</div>
            <span className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest">HSC.AI</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm font-medium">Continue your journey to Band 6.</p>
        </div>

        <div className="glass p-8 rounded-[2.5rem] shadow-2xl">
          <LoginForm />

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 font-medium">
              New to HSC AI?
              <Link href="/signup" className="text-[#dacb7d] font-black hover:underline ml-1">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 hover:text-white transition-colors inline-flex items-center justify-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}