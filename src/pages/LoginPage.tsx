import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Video, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const LoginPage: React.FC = () => {
  const { signIn, switchDemoProfile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      showToast({ type: 'success', title: 'Welcome back!' });
      navigate('/');
    } catch (err: any) {
      showToast({ type: 'error', title: 'Sign In Failed', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = (role: 'creator' | 'admin' | 'guest') => {
    switchDemoProfile(role);
    showToast({
      type: 'success',
      title: 'Demo Session Active',
      message: `Switched session to ${role.toUpperCase()} mode.`,
    });
    navigate('/');
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto shadow-xl shadow-black">
          <Video className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-white font-editorial italic tracking-tight">Sign in to StreamSphere</h1>
        <p className="text-xs text-zinc-400">
          Access your creator studio, manage video uploads, or continue watching.
        </p>
      </div>

      {/* Demo Quick-Switch Box */}
      <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3 shadow-xl">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>One-Click Instant Preview Profiles</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleDemoSelect('creator')}
            className="p-2.5 rounded-xl bg-[#050505] border border-white/10 hover:border-amber-500/50 text-zinc-200 text-xs text-center transition-all"
          >
            <div className="font-bold text-[11px] text-amber-400">Aria Chen</div>
            <div className="text-[10px] text-zinc-500">Creator</div>
          </button>
          <button
            onClick={() => handleDemoSelect('admin')}
            className="p-2.5 rounded-xl bg-[#050505] border border-white/10 hover:border-amber-500/50 text-zinc-200 text-xs text-center transition-all"
          >
            <div className="font-bold text-[11px] text-amber-400">Marcus Vance</div>
            <div className="text-[10px] text-zinc-500">Admin</div>
          </button>
          <button
            onClick={() => handleDemoSelect('guest')}
            className="p-2.5 rounded-xl bg-[#050505] border border-white/10 hover:border-white/20 text-zinc-200 text-xs text-center transition-all"
          >
            <div className="font-bold text-[11px] text-zinc-400">Guest</div>
            <div className="text-[10px] text-zinc-500">Signed Out</div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4 shadow-2xl">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Email Address</label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">Password</label>
            <Link to="/forgot-password" className="text-[11px] text-amber-400 hover:underline">
              Forgot password?
            </Link>
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
