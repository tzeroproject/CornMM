import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Flame, Upload, Heart, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 py-2 px-3 text-[10px] font-medium transition-colors ${
      isActive ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
    }`;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-lg flex items-center justify-around px-2">
      <NavLink to="/" end className={itemClass}>
        <Home className="w-5 h-5" />
        <span>Home</span>
      </NavLink>

      <NavLink to="/trending" className={itemClass}>
        <Flame className="w-5 h-5" />
        <span>Trending</span>
      </NavLink>

      {user && (
        <NavLink to="/upload" className={itemClass}>
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-black shadow-md shadow-amber-500/30 -mt-1">
            <Upload className="w-4 h-4" />
          </div>
          <span>Upload</span>
        </NavLink>
      )}

      {user ? (
        <NavLink to="/favorites" className={itemClass}>
          <Heart className="w-5 h-5" />
          <span>Saved</span>
        </NavLink>
      ) : (
        <NavLink to="/login" className={itemClass}>
          <User className="w-5 h-5" />
          <span>Sign In</span>
        </NavLink>
      )}

      {isAdmin ? (
        <NavLink to="/admin" className={itemClass}>
          <Shield className="w-5 h-5 text-amber-400" />
          <span>Admin</span>
        </NavLink>
      ) : user ? (
        <NavLink to={`/creator/${user.username}`} className={itemClass}>
          <User className="w-5 h-5" />
          <span>Profile</span>
        </NavLink>
      ) : null}
    </nav>
  );
};
