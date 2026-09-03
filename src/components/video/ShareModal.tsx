import React, { useState } from 'react';
import { X, Copy, Check, Share2, Code } from 'lucide-react';
import { Video } from '../../types';
import { useNotification } from '../../context/NotificationContext';

interface ShareModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ video, isOpen, onClose }) => {
  const { showToast } = useNotification();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  if (!isOpen || !video) return null;

  const videoUrl = `${window.location.origin}/watch/${video.slug || video.id}`;
  const embedCode = `<iframe src="${window.location.origin}/watch/${video.slug || video.id}?embed=true" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

  const copyToClipboard = (text: string, isEmbed = false) => {
    navigator.clipboard.writeText(text);
    if (isEmbed) {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    showToast({ type: 'success', title: 'Copied to Clipboard' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base text-white">Share Video</h3>
        </div>

        <div className="space-y-4">
          {/* Direct Link */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Direct URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={videoUrl}
                className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(videoUrl, false)}
                className="shrink-0 px-3 py-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Embed Code */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Embed HTML</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={embedCode}
                className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono truncate focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(embedCode, true)}
                className="shrink-0 px-3 py-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                {copiedEmbed ? 'Copied' : 'Embed'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
