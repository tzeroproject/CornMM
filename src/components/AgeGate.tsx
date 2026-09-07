import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

const AGE_GATE_KEY = 'CornMM_age_verified_v1';

export const AgeGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setVerified(localStorage.getItem(AGE_GATE_KEY) === 'true');
    } catch {
      setVerified(false);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(AGE_GATE_KEY, 'true');
    } catch {
      // Continue for this browser session if storage is unavailable.
    }
    setVerified(true);
  };

  const handleDecline = () => {
    window.location.replace('about:blank');
  };

  if (verified === null || verified) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="p-7 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Age Verification Required</h2>
          <p className="mb-6 mt-3 text-sm leading-6 text-zinc-400">
            CornMM is intended for adults only. You must be at least 18 years old to enter. By continuing, you confirm that you meet the minimum age requirement and agree to follow the site rules.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleAccept}
              className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
            >
              I am 18 or older — Enter
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="w-full rounded-xl border border-white/5 bg-zinc-900 py-3.5 text-sm font-semibold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800"
            >
              I am under 18 — Exit
            </button>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            This age gate is a basic client-side confirmation and is not a substitute for legal compliance requirements in every jurisdiction.
          </p>
        </div>
      </div>
    </div>
  );
};
