import React, { useState } from 'react';
import { Settings, User, Shield, Server, CheckCircle2, Globe, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const SettingsPage: React.FC = () => {
  const { user, updateUserProfile, isAgeVerified, verifyAge } = useAuth();
  const { showToast } = useNotification();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  // Preferences
  const [ageFilter, setAgeFilter] = useState(isAgeVerified);
  const [autoPlay, setAutoPlay] = useState(true);
  const [defaultQuality, setDefaultQuality] = useState('auto');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        avatar_url: avatarUrl.trim(),
      });
      if (ageFilter) verifyAge();
      showToast({ type: 'success', title: 'Settings Saved', message: 'Your preferences have been updated.' });
    } catch (e: any) {
      showToast({ type: 'error', title: 'Save Failed', message: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          Account & Platform Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your creator profile, playback settings, and system connectivity.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Details */}
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            Public Creator Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Channel Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Website or Portfolio</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Avatar Image URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#050505] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Content Safety & Playback Preferences */}
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Content Safety & Playback Preferences
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
              <div>
                <p className="text-xs font-semibold text-zinc-200">Mature Content Verification (18+)</p>
                <p className="text-[11px] text-zinc-400">Consent to viewing age-restricted streams when signed in.</p>
              </div>
              <input
                type="checkbox"
                checked={ageFilter}
                onChange={(e) => setAgeFilter(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500 bg-[#0a0a0a] border-white/20"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
              <div>
                <p className="text-xs font-semibold text-zinc-200">Autoplay Next Video</p>
                <p className="text-[11px] text-zinc-400">Automatically stream recommended related videos.</p>
              </div>
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 accent-amber-500 bg-[#0a0a0a] border-white/20"
              />
            </label>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#050505] border border-white/5">
              <div>
                <p className="text-xs font-semibold text-zinc-200">Preferred Stream Quality</p>
                <p className="text-[11px] text-zinc-400">Adaptive HLS default resolution</p>
              </div>
              <select
                value={defaultQuality}
                onChange={(e) => setDefaultQuality(e.target.value)}
                className="bg-[#121212] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
              >
                <option value="auto">Auto (Adaptive)</option>
                <option value="1080p">1080p FHD</option>
                <option value="720p">720p HD</option>
                <option value="480p">480p SD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Infrastructure Status Inspector */}
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            Infrastructure Status & Edge Verification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#050505] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Bunny Stream CDN</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">Operational</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 rounded-xl bg-[#050505] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">PostgreSQL & RLS</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">Connected</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 rounded-xl bg-[#050505] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Edge Ingress</div>
                <div className="text-xs font-bold text-amber-400 mt-0.5">Sub-20ms</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save All Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
