"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setMessage("If this email exists, a reset link has been sent.");
      }
    } catch (err) {
      setError("Failed to send request. Try again.");
    } finally {
      setLoading(false);
    }
  };

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
              Forgot Password
            </h1>
            <p className="mb-8 text-sm text-gray-600 dark:text-gray-300 text-center">
              Enter your email to receive a password reset link.
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              
              {/* Success Alert */}
              {message && (
                <div className="p-3 text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm animate-fade-in-up text-center">
                  {message}
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm animate-fade-in-up text-center">
                  {error}
                </div>
              )}

              <div>
                <label 
                  htmlFor="email" 
                  className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3.5 px-4 rounded-xl shadow-md hover:bg-gray-800 dark:hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            {/* Back to Login Link */}
            <div className="mt-6 text-center">
              <Link 
                href="/login" 
                className="text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}