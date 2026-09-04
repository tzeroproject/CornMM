import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  Home, 
  Flame, 
  Clock, 
  Grid, 
  History, 
  Heart, 
  LayoutDashboard, 
  Upload, 
  ShieldAlert, 
  FileText, 
  Scale, 
  HelpCircle,
  Mail,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin } = useAuth();

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
      isActive
        ? 'bg-white/[0.08] text-amber-400 font-semibold border border-amber-500/20'
        : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 lg:top-[72px] left-0 z-40 h-[calc(100vh-4rem)] lg:h-[calc(100vh-72px)] w-60 border-r border-white/5 bg-[#0a0a0a] flex flex-col justify-between p-4 overflow-y-auto transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Mobile close button */}
          <div className="flex items-center justify-between lg:hidden pb-2 border-b border-white/5">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Navigation</span>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Browsing */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Discover
            </div>
            <nav className="space-y-1">
              <NavLink to="/" end className={navLinkClasses} onClick={() => onClose()}>
                <Home className="w-4 h-4" />
                Home
              </NavLink>
              <NavLink to="/trending" className={navLinkClasses} onClick={() => onClose()}>
                <Flame className="w-4 h-4 text-amber-400" />
                Trending
              </NavLink>
              <NavLink to="/latest" className={navLinkClasses} onClick={() => onClose()}>
                <Clock className="w-4 h-4 text-zinc-300" />
                Latest Uploads
              </NavLink>
              <NavLink to="/categories" className={navLinkClasses} onClick={() => onClose()}>
                <Grid className="w-4 h-4 text-zinc-300" />
                Categories
              </NavLink>
              <NavLink to="/upload" className={navLinkClasses} onClick={() => onClose()}>
                  <Upload className="w-4 h-4 text-amber-400" />
                  Upload Video
                </NavLink>
            </nav>
          </div>

          {/* User Library */}
          {user && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Personal Library
              </div>
              <nav className="space-y-1">
                <NavLink to="/history" className={navLinkClasses} onClick={() => onClose()}>
                  <History className="w-4 h-4" />
                  Watch History
                </NavLink>
                <NavLink to="/favorites" className={navLinkClasses} onClick={() => onClose()}>
                  <Heart className="w-4 h-4 text-rose-400" />
                  Favorites
                </NavLink>
                <NavLink to="/dashboard" className={navLinkClasses} onClick={() => onClose()}>
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  Creator Studio
                </NavLink>
                
              </nav>
            </div>
          )}

          {/* Admin Oversight Section */}
          {isAdmin && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-400/90 flex items-center justify-between">
                <span>Trust & Safety</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </div>
              <nav className="space-y-1">
                <NavLink to="/admin" className={navLinkClasses} onClick={() => onClose()}>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Admin Dashboard
                </NavLink>
              </nav>
            </div>
          )}

        </div>
      </aside>
    </>
  );
};
