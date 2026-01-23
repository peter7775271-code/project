"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Grab token from URL
  useEffect(() => {
    const t = searchParams.get("token");
    setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!token) {
      setError("Invalid or missing token");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch (err) {
      setError("Failed to send request. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Shared Background Wrapper
  const BackgroundWrapper = ({ children }: { children: React.ReactNode }) => (
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
          {children}
        </div>
      </main>
    </div>
  );

  if (!token) {
    return (
      <BackgroundWrapper>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Link
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-gray-900 dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-gray-900 shadow-md transition-all hover:bg-gray-800 dark:hover:bg-gray-100 hover:scale-[1.02]"
          >
            Back to Login
          </Link>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="relative flex flex-col items-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
          Reset Password
        </h1>
        <p className="mb-8 text-sm text-gray-600 dark:text-gray-300 text-center">
          Enter your new password to reset your account.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          
          {/* Success Message */}
          {message && (
            <div className="p-3 text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm animate-fade-in-up text-center">
              {message}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm animate-fade-in-up text-center">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1"
            >
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3.5 px-4 rounded-xl shadow-md hover:bg-gray-800 dark:hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </BackgroundWrapper>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <p className="text-gray-500 animate-pulse">Loading...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}