'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Store token and user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect
      window.location.href = '/hsc-generator';
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-xs text-[#eb9e9e] bg-[#9c2121]/10 border border-[#9c2121]/30 rounded-xl backdrop-blur-sm animate-fade-in-up">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#dacb7d] mb-2 px-1">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-5 py-4 rounded-2xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#dacb7d] focus:ring-2 focus:ring-[#dacb7d]/20 transition-all"
          placeholder="student@hsc.ai"
          disabled={loading}
        />
      </div>

      <div>
        <div className="flex justify-between mb-2 px-1">
          <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#dacb7d]">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-[#dacb7d] transition-colors"
          >
            Forgot?
          </Link>
        </div>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-5 py-4 rounded-2xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#dacb7d] focus:ring-2 focus:ring-[#dacb7d]/20 transition-all"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-5 rounded-2xl uppercase tracking-[0.3em] text-xs disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  );
}