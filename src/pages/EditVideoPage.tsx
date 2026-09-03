import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, ArrowLeft, Trash2, Save } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Video, Category } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const EditVideoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [video, setVideo] = useState<Video | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isAgeRestricted, setIsAgeRestricted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      const [v, cats] = await Promise.all([
        videoService.getVideoById(id),
        videoService.getCategories(),
      ]);

      if (!v) {
        showToast({ type: 'error', title: 'Video not found' });
        navigate('/dashboard');
        return;
      }

      // Check authorization
      if (user && v.creator_id !== user.id && !isAdmin) {
        showToast({ type: 'error', title: 'Unauthorized', message: 'You cannot edit another creator\'s video.' });
        navigate('/dashboard');
        return;
      }

      setVideo(v);
      setCategories(cats);
      setTitle(v.title);
      setDescription(v.description);
      setCategoryId(v.category_id);
      setVisibility(v.visibility);
      setIsAgeRestricted(v.is_age_restricted);
      setIsLoading(false);
    }
    load();
  }, [id, user, isAdmin, navigate, showToast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    setIsSaving(true);
    try {
      await videoService.updateVideo(video.id, {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        visibility,
        is_age_restricted: isAgeRestricted,
      });

      showToast({ type: 'success', title: 'Changes Saved' });
      navigate('/dashboard');
    } catch (err: any) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!video) return;
    if (!window.confirm(`Permanently delete "${video.title}"?`)) return;

    try {
      await videoService.deleteVideo(video.id);
      showToast({ type: 'success', title: 'Video Deleted' });
      navigate('/dashboard');
    } catch (err: any) {
      showToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  if (isLoading || !video) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Studio
      </button>

      <div className="pb-4 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2 font-editorial italic">
          <Edit3 className="w-5 h-5 text-amber-400" />
          Edit Stream Details
        </h1>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Description</label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAgeRestricted}
              onChange={(e) => setIsAgeRestricted(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 accent-amber-500 bg-[#050505] border-white/10"
            />
            <span className="text-xs text-zinc-300">
              Age Restricted (18+). Requires viewer age consent.
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
