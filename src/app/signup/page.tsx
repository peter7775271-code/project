import SignUpForm from '@/components/SignUpForm';
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-950 selection:bg-blue-500/30">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-purple-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      {/* Main Glass Card */}
      <main className="relative z-10 w-full max-w-md px-6 animate-fade-in-up">
        <div className="group relative overflow-hidden rounded-2xl bg-white/40 dark:bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/20 ring-1 ring-gray-900/5 transition-all hover:shadow-blue-500/10">
          
          <div className="relative flex flex-col items-center">
            {/* Header */}
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
              Create Account
            </h1>
            <p className="mb-8 text-sm text-gray-600 dark:text-gray-300 text-center">
              Join us to get started with your journey
            </p>

            {/* Form Container */}
            <div className="w-full">
              <SignUpForm />
            </div>

            {/* Footer Link */}
            <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}