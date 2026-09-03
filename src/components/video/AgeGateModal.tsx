import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AgeGateModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({ isOpen, onCancel, onConfirm }) => {
  const { verifyAge } = useAuth();

  if (!isOpen) return null;

  const handleConfirm = () => {
    verifyAge();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-white font-editorial italic">Age & Content Verification Required</h3>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          This creator-uploaded video has been marked as containing mature themes or 18+ subject matter. In compliance with content safety standards and lawful media guidelines, please confirm your eligibility to continue.
        </p>

        <div className="p-3 my-4 rounded-xl bg-[#050505] border border-white/10 text-[11px] text-zinc-400 text-left flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            By proceeding, you verify you are of legal age in your jurisdiction and consent to viewing age-restricted content.
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-xs font-medium hover:bg-white/5 transition-colors cursor-pointer"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            I am 18+ • Continue
          </button>
        </div>
      </div>
    </div>
  );
};
