import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-950 selection:bg-blue-500/30">
      
      {/* Background Decorative Blobs with Animation */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-purple-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      {/* Main Glass Card with Fade In Animation */}
      <main className="relative z-10 w-full max-w-md px-6 animate-fade-in-up">
        <div className="group relative overflow-hidden rounded-2xl bg-white/40 dark:bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/20 ring-1 ring-gray-900/5 transition-all hover:shadow-blue-500/10">
          
          <div className="relative flex flex-col items-center text-center">
            
            {/* Logo/Icon */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 transform transition-transform duration-500 hover:rotate-12 hover:scale-110">
               <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.131A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.548-4.136" />
               </svg>
            </div>

            <h1 className="mb-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome Back
            </h1>
            <p className="mb-8 text-base text-gray-600 dark:text-gray-300">
              Your secure gateway. Create an account or log in to access your dashboard.
            </p>

            <div className="flex w-full flex-col gap-3">
              <Link
                href="/signup"
                className="group/btn relative w-full overflow-hidden rounded-xl bg-gray-900 dark:bg-white px-4 py-3.5 text-sm font-semibold text-white dark:text-gray-900 shadow-md transition-all hover:bg-gray-800 dark:hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] duration-200"
              >
                Sign Up
              </Link>
              
              <Link
                href="/login"
                className="relative w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 dark:hover:bg-white/10 hover:border-gray-300 hover:scale-[1.02] active:scale-[0.98] duration-200"
              >
                Log In
              </Link>
            </div>

            <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              By continuing, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}