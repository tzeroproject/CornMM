import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AgeGate } from '../AgeGate';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      
      <div className="min-h-screen w-full bg-[#050505] text-zinc-300 flex flex-col selection:bg-amber-500/25 selection:text-amber-200 font-sans">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0 bg-[#050505]">
          <div className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 py-2 sm:py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
    </>
  );
};
