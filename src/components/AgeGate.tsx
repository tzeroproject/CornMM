import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export const AgeGate: React.FC = () => {
  const [isAccepted, setIsAccepted] = useState(true); // Default true to prevent flicker, check in useEffect
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cornmm_age_verified');
    if (!accepted) {
      setIsAccepted(false);
    }
    setIsLoaded(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cornmm_age_verified', 'true');
    setIsAccepted(true);
  };

  const handleDecline = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!isLoaded || isAccepted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="max-w-md w-full bg-[#0a0a0a] border border-amber-500/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Age Verification Required</h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            This website (cornmm) contains content that is only suitable for adults. You must be at least 18 years old to enter. By clicking "I am 18 or older", you confirm your age and agree to our Terms of Service.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              I am 18 or older - Enter
            </button>
            <button
              onClick={handleDecline}
              className="w-full py-3.5 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] text-zinc-300 font-semibold uppercase tracking-wider text-sm border border-white/5 transition-all"
            >
              I am under 18 - Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
