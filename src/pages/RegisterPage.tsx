import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Mail, Lock, User, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const RegisterPage: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      showToast({ type: 'warning', title: 'Terms Required', message: 'You must agree to lawful media and copyright terms.' });
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password, displayName, username);
      showToast({ type: 'success', title: 'Account Created', message: 'Welcome to cornmm!' });
      navigate('/dashboard');
    } catch (err: any) {
      showToast({ type: 'error', title: 'Registration Failed', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto shadow-xl shadow-black">
          <Video className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-white font-editorial italic tracking-tight">Create Creator Account</h1>
        <p className="text-xs text-zinc-400">
          Join high-fidelity video sharing with Bunny Stream global CDN.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4 shadow-2xl">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Channel / Display Name</label>
          <div className="relative">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Elena Rostova"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
            <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Username (Handle)</label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="elena_sound"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
            <span className="text-zinc-500 text-xs absolute left-3.5 top-1/2 -translate-y-1/2">@</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Email Address</label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="elena@example.com"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Password</label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
              minLength={8}
            />
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#050505] border border-white/10 space-y-2 text-[11px] text-zinc-400">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-500 bg-[#050505] border-white/20 focus:ring-amber-500"
              required
            />
            <span>
              I agree to the <Link to="/terms" className="text-amber-400 hover:underline">Terms of Service</Link> and certify I will strictly upload lawful, consensual media that complies with intellectual property laws.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 uppercase tracking-wider"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p className="text-center text-xs text-zinc-400 pt-2">
          Already have an account?{' '}
          <Link to="/corn-admin-login" className="text-amber-400 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
};
