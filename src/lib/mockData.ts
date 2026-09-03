import { Category, Tag } from '../types';

/**
 * Default Category and Tag Taxonomies.
 * These match the initial schema seeds in supabase/migrations/20250101000000_initial_schema.sql.
 */
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-tech', name: 'Technology & Code', slug: 'technology', description: 'Software engineering, hardware, systems design, and tutorials', icon: 'Code', video_count: 0 },
  { id: 'cat-cinema', name: 'Cinema & VFX', slug: 'cinema-vfx', description: 'Cinematic visual effects, storytelling, direction, and rendering', icon: 'Film', video_count: 0 },
  { id: 'cat-gaming', name: 'Game Dev & Play', slug: 'gaming', description: 'Game engines, indie gameplay, mechanics, and design', icon: 'Gamepad2', video_count: 0 },
  { id: 'cat-science', name: 'Science & Cosmos', slug: 'science', description: 'Astrophysics, biology, deep space exploration, and mathematics', icon: 'Atom', video_count: 0 },
  { id: 'cat-music', name: 'Music & Audio', slug: 'music', description: 'Original scoring, modular synthesis, sound design, and live performance', icon: 'Music', video_count: 0 },
  { id: 'cat-creative', name: 'Creative Arts', slug: 'creative-arts', description: '3D modeling, typography, digital painting, and architectural art', icon: 'Palette', video_count: 0 },
  { id: 'cat-travel', name: 'Nature & Travel', slug: 'nature-travel', description: 'Expeditions, wilderness time-lapses, drone cinematography, and ecology', icon: 'Compass', video_count: 0 },
];

export const INITIAL_TAGS: Tag[] = [
  { id: 'tag-1', name: 'WebDev', slug: 'webdev' },
  { id: 'tag-2', name: 'React', slug: 'react' },
  { id: 'tag-3', name: 'Blender', slug: 'blender' },
  { id: 'tag-4', name: '4K', slug: '4k' },
  { id: 'tag-5', name: 'Synthesizer', slug: 'synthesizer' },
  { id: 'tag-6', name: 'GameEngine', slug: 'gameengine' },
  { id: 'tag-7', name: 'Astronomy', slug: 'astronomy' },
  { id: 'tag-8', name: 'Documentary', slug: 'documentary' },
  { id: 'tag-9', name: 'OpenSource', slug: 'opensource' },
];
