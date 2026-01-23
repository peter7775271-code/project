'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  verified?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email })
      });
      const data = await response.json();
      if (response.ok) {
        alert("Verification email sent! Check your inbox.");
      } else {
        alert(data.error || "Failed to send verification email");
      }
    } catch (error) {
      alert("Error sending verification email");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-4 rounded-full bg-blue-500 animate-bounce"></div>
          <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-950 selection:bg-blue-500/30">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-purple-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      {/* Navbar - Floating Glass */}
      <nav className="relative z-20 w-full border-b border-white/20 bg-white/30 dark:bg-black/20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg backdrop-blur-sm"
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 animate-fade-in-up">
        <div className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-white/5 p-8 shadow-2xl backdrop-blur-xl border border-white/20 ring-1 ring-gray-900/5">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Welcome back, {user.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage your account and view your status
              </p>
            </div>
            
            {/* Status Badge */}
            <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border backdrop-blur-sm ${
              user.verified 
                ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
            }`}>
              {user.verified ? '✓ Verified Account' : '⚠ Verification Pending'}
            </div>
          </div>

          {/* User Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Card */}
            <div className="p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Email Address
              </p>
              <p className="text-lg font-medium text-gray-900 dark:text-white break-all">
                {user.email}
              </p>
            </div>

            {/* Date Card */}
            <div className="p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Member Since
              </p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Actions Area */}
          <div className="mt-8 space-y-4">
            {!user.verified && (
              <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Verification Required</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
                    Please verify your email address to unlock full access to the platform.
                  </p>
                </div>
                <button
                  onClick={handleResendVerification}
                  className="whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Resend Email
                </button>
              </div>
            )}

            {user.verified && (
              <div className="p-6 rounded-2xl bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-green-800 dark:text-green-400">All systems go</h3>
                    <p className="text-sm text-green-700 dark:text-green-500/80 mt-1">
                      You have full access to your dashboard features.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200/50 dark:border-white/10">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}