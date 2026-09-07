import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Video, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const ok = await signIn(identifier, password);
      if (!ok) return;

      // cadmin uses a Supabase Auth session + profile role. Force a clean
      // navigation so the AuthProvider rehydrates the fresh session before
      // AdminDashboardPage evaluates its isAdmin guard.
      if (identifier.trim().toLowerCase() === 'cadmin') {
        window.location.assign('/admin');
        return;
      }

      navigate('/');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Sign In Failed',
        message: err.message || 'Invalid credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      showToast({
        type: 'error',
        title: 'Google Sign In Failed',
        message: err.message || 'Unable to continue with Google',
      });
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto shadow-xl shadow-black">
          <Video className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-white font-editorial italic tracking-tight">Sign in to StreamSphere</h1>
        <p className="text-xs text-zinc-400">
          Access your creator studio, manage video uploads, or administrator dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4 shadow-2xl">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">Username or Email</label>
          </div>
          <div className="relative">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username or email"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
            <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">Password</label>
          </div>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 uppercase tracking-wider"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading}
          className="w-full h-11 rounded-xl bg-white hover:bg-zinc-100 text-black text-xs font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 border border-white/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.2c0-.7-.06-1.38-.18-2.03H12v3.84h5.23a4.47 4.47 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.92-4.18 2.92-7.2Z" />
            <path fill="#34A853" d="M12 21.8c2.64 0 4.86-.87 6.48-2.4l-3.14-2.45c-.87.58-1.98.92-3.34.92-2.56 0-4.73-1.73-5.5-4.06H3.25v2.53A9.79 9.79 0 0 0 12 21.8Z" />
            <path fill="#FBBC05" d="M6.5 13.81A5.9 5.9 0 0 1 6.19 12c0-.63.11-1.24.31-1.81V7.66H3.25A9.8 9.8 0 0 0 2.2 12c0 1.58.38 3.08 1.05 4.34l3.25-2.53Z" />
            <path fill="#EA4335" d="M12 6.13c1.44 0 2.73.5 3.75 1.48l2.8-2.8C16.85 3.2 14.64 2.2 12 2.2a9.79 9.79 0 0 0-8.75 5.46l3.25 2.53c.77-2.33 2.94-4.06 5.5-4.06Z" />
          </svg>
          {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <p className="text-center text-xs text-zinc-400 pt-2">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-amber-400 font-semibold hover:underline">
            Register as Creator
          </Link>
        </p>
      </form>
    </div>
  );
};
