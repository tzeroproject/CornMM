import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Video, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const ok = await signIn(identifier, password);
      if (ok) {
        if (identifier.trim().toLowerCase() === 'cadmin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Sign In Failed', message: err.message || 'Invalid credentials' });
    } finally {
      setIsLoading(false);
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
          disabled={isLoading}
          className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 uppercase tracking-wider"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
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
