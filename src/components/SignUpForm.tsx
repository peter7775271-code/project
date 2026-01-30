'use client';

import { FormEvent, useState } from 'react';

export default function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Sign up failed');
        return;
      }

      setSuccess(true);
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      
      // Store token in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/hsc-generator';
      }, 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
      {error && (
        <div className="p-3 text-xs text-[#eb9e9e] bg-[#9c2121]/10 border border-[#9c2121]/30 rounded-xl backdrop-blur-sm animate-fade-in-up">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-xs text-[#47d5a6] bg-[#47d5a6]/10 border border-[#47d5a6]/30 rounded-xl backdrop-blur-sm animate-fade-in-up">
          Sign up successful! Redirecting...
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#dacb7d] mb-2 px-1">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-5 py-4 rounded-2xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#dacb7d] focus:ring-2 focus:ring-[#dacb7d]/20 transition-all"
          placeholder="Student Name"
          disabled={loading}
        />
      </div>

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
          className="w-full px-5 py-4 rounded-2xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#dacb7d] focus:ring-2 focus:ring-[#dacb7d]/20 transition-all"
          placeholder="student@hsc.ai"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#dacb7d] mb-2 px-1">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-5 py-4 rounded-2xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#dacb7d] focus:ring-2 focus:ring-[#dacb7d]/20 transition-all"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#dacb7d] mb-2 px-1">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full px-5 py-4 rounded-2xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-[#dacb7d] focus:ring-2 focus:ring-[#dacb7d]/20 transition-all"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-5 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-lg shadow-[#dacb7d]/10 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
}