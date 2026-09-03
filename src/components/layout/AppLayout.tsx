import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 flex flex-col selection:bg-amber-500/25 selection:text-amber-200 font-sans">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 bg-[#050505]">
          <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>

      <MobileNav />
    </div>
  );
};
