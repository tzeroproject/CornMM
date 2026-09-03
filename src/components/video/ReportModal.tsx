import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Video, ReportReason } from '../../types';
import { interactionService } from '../../services/interactionService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface ReportModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ video, isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [reason, setReason] = useState<ReportReason>('copyright');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !video) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast({ type: 'error', title: 'Details Required', message: 'Please describe the violation.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await interactionService.submitReport({
        reporterId: user?.id || 'guest-reporter',
        videoId: video.id,
        reason,
        description: description.trim(),
      });

      setSubmitted(true);
      showToast({
        type: 'success',
        title: 'Report Submitted',
        message: 'Our Trust & Safety team will review this content according to Community Guidelines.',
      });
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Submission Failed', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Report Received</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Thank you for keeping cornmm lawful and safe. An administrator has been notified.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base text-white">Report Content</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4 line-clamp-1">
              Reporting: <span className="text-zinc-200 font-medium">"{video.title}"</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Reason for Report
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="copyright">Copyright or Intellectual Property Infringement</option>
                  <option value="illegal_content">Illegal Content / Activity</option>
                  <option value="non_consensual">Non-Consensual Material</option>
                  <option value="harassment">Harassment or Cyberbullying</option>
                  <option value="violence">Violence or Dangerous Acts</option>
                  <option value="spam">Spam, Phishing, or Fraud</option>
                  <option value="hate_speech">Hate Speech</option>
                  <option value="misinformation">Harmful Misinformation</option>
                  <option value="other">Other Community Guideline Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Specific Details / Timestamps
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide timestamps and describe the violation to assist the Trust & Safety team..."
                  className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
