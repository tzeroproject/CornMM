import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Upload, Bell, Shield, User, LogOut, Menu, Video, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_PROFILES } from '../../lib/mockData';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, isAdmin, isCreator, signOut, switchDemoProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 lg:h-[72px] border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-900 flex items-center justify-center shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform">
            <span className="font-editorial italic font-bold text-black text-lg leading-none">S</span>
          </div>
          <div className="flex flex-col">
            <span className="font-editorial italic font-semibold text-lg tracking-wide text-white group-hover:text-amber-400 transition-colors">
              StreamSphere
            </span>
            <span className="text-[9px] uppercase tracking-widest text-amber-500/90 font-medium -mt-1 hidden sm:inline">
              CDN Edition
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden md:block">
        <div className="relative">
          <input
            id="input-global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators, videos, categories..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-[#111111] border border-white/10 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </form>

      {/* Right: Actions, Demo Switcher, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Role / Persona Switcher for Evaluation */}
        <div className="relative">
          <button
            id="btn-role-switcher"
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            title="Switch demo persona for testing"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#111111] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-zinc-400">Role:</span>
            <span className="font-semibold text-amber-400 uppercase tracking-wide">
              {user ? user.role : 'Guest'}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0e0e0e] border border-white/10 shadow-2xl p-2 z-50">
              <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Simulate Permissions
              </div>
              <button
                onClick={() => { switchDemoProfile('user-admin'); setShowRoleSwitcher(false); }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-xs text-zinc-200 transition-colors"
              >
                <div>
                  <div className="font-medium text-white">Platform Overseer (Admin)</div>
                  <div className="text-[10px] text-zinc-400">Full moderation & audit access</div>
                </div>
                {user?.id === 'user-admin' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                onClick={() => { switchDemoProfile('creator-aria'); setShowRoleSwitcher(false); }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-xs text-zinc-200 transition-colors"
              >
                <div>
                  <div className="font-medium text-white">Aria Chen (Creator)</div>
                  <div className="text-[10px] text-zinc-400">Upload, analytics & editing</div>
                </div>
                {user?.id === 'creator-aria' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                onClick={() => { switchDemoProfile('creator-marcus'); setShowRoleSwitcher(false); }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-xs text-zinc-200 transition-colors"
              >
                <div>
                  <div className="font-medium text-white">Marcus Vance (Creator)</div>
                  <div className="text-[10px] text-zinc-400">Cinematographer profile</div>
                </div>
                {user?.id === 'creator-marcus' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                onClick={() => { switchDemoProfile(null); setShowRoleSwitcher(false); }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between text-xs text-zinc-200 transition-colors border-t border-white/5 mt-1"
              >
                <div>
                  <div className="font-medium text-white">Guest (Unauthenticated)</div>
                  <div className="text-[10px] text-zinc-400">Public browsing view</div>
                </div>
                {!user && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {user && (
          <Link
            to="/upload"
            id="btn-nav-upload"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 transition-all uppercase tracking-wider text-[11px]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Video</span>
          </Link>
        )}

        {/* Admin Link if Admin */}
        {isAdmin && (
          <Link
            to="/admin"
            id="btn-nav-admin"
            title="Admin Moderation Dashboard"
            className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition-colors relative"
          >
            <Shield className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </Link>
        )}

        {/* Notifications Icon */}
        {user && (
          <button
            id="btn-nav-notifications"
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
        )}

        {/* User Profile / Auth */}
        {user ? (
          <div className="relative">
            <button
              id="btn-user-menu"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <img
                src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={user.display_name}
                className="w-8 h-8 rounded-full object-cover border border-white/10"
              />
              <div className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:block"></div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0e0e0e] border border-white/10 shadow-2xl p-1.5 z-50">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs font-semibold text-white">{user.display_name}</p>
                  <p className="text-[11px] text-zinc-500 truncate">@{user.username}</p>
                </div>

                <Link
                  to={`/creator/${user.username}`}
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-zinc-400" />
                  Your Profile
                </Link>

                <Link
                  to="/dashboard"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Video className="w-4 h-4 text-zinc-400" />
                  Creator Studio
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={() => { signOut(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
