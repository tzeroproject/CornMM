const fs = require('fs');
let content = fs.readFileSync('src/components/layout/MobileNav.tsx', 'utf8');

content = `import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Flame, Grid, Heart, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
  const { user } = useAuth();

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    \`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-medium transition-all \${
      isActive ? 'text-amber-400 scale-105' : 'text-zinc-500 hover:text-zinc-300'
    }\`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        <NavLink to="/" end className={itemClass}>
          <Home className="w-6 h-6" strokeWidth={1.5} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/trending" className={itemClass}>
          <Flame className="w-6 h-6" strokeWidth={1.5} />
          <span>Trending</span>
        </NavLink>
        <NavLink to="/categories" className={itemClass}>
          <Grid className="w-6 h-6" strokeWidth={1.5} />
          <span>Categories</span>
        </NavLink>
        <NavLink to="/favorites" className={itemClass}>
          <Heart className="w-6 h-6" strokeWidth={1.5} />
          <span>Favorites</span>
        </NavLink>
        <NavLink to={user ? \`/creator/\${user.username}\` : '/corn-admin-login'} className={itemClass}>
          <User className="w-6 h-6" strokeWidth={1.5} />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
};
`;

fs.writeFileSync('src/components/layout/MobileNav.tsx', content);
console.log('MobileNav patched');
