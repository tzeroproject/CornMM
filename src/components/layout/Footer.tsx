import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Video, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 bg-[#080808] mt-16 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-amber-900 flex items-center justify-center text-black font-editorial italic font-bold text-xs">
                S
              </div>
              <span className="font-editorial italic font-semibold text-white text-sm">StreamSphere</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              High-performance video sharing platform optimized for creator sovereignty, lawful consensual content, and low-latency global CDN delivery.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-300 uppercase tracking-widest text-[10px] mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/trending" className="hover:text-amber-400 transition-colors">Trending Videos</Link></li>
              <li><Link to="/latest" className="hover:text-amber-400 transition-colors">Latest Uploads</Link></li>
              <li><Link to="/categories" className="hover:text-amber-400 transition-colors">Content Categories</Link></li>
              <li><Link to="/upload" className="hover:text-amber-400 transition-colors">Creator Studio Upload</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-300 uppercase tracking-widest text-[10px] mb-3">Trust & Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/guidelines" className="hover:text-amber-400 transition-colors">Community Guidelines</Link></li>
              <li><Link to="/dmca" className="hover:text-amber-400 transition-colors">DMCA / Copyright Takedown</Link></li>
              <li><Link to="/terms" className="hover:text-amber-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-300 uppercase tracking-widest text-[10px] mb-3">Infrastructure</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Bunny Stream CDN
              </li>
              <li className="flex items-center gap-1.5 text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                PostgreSQL + RLS
              </li>
              <li><Link to="/contact" className="hover:text-amber-400 transition-colors">Abuse & Security Report</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <p>© {new Date().getFullYear()} StreamSphere Inc. All rights reserved. Zero-tolerance for non-consensual or pirated media.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with sophisticated precision</span>
            <Heart className="w-3 h-3 text-amber-500 fill-amber-500/20" />
          </div>
        </div>
      </div>
    </footer>
  );
};
