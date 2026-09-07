import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PWAInstallPrompt: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('cornmm-pwa-dismissed') === '1');

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (!installEvent || dismissed) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setInstallEvent(null);
  };

  const dismiss = () => {
    localStorage.setItem('cornmm-pwa-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:w-80 z-[100] rounded-2xl bg-[#111] border border-white/10 shadow-2xl p-4 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white">Install CornMM</h3>
          <p className="text-[11px] text-zinc-400 mt-1">Install the app for a faster, app-like experience.</p>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={install} className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-semibold transition-colors">Install</button>
            <button onClick={dismiss} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] transition-colors">Not now</button>
          </div>
        </div>
        <button onClick={dismiss} className="p-1 text-zinc-500 hover:text-white" aria-label="Close install prompt"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};
