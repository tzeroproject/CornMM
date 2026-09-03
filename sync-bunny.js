import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const bunnyKey = process.env.BUNNY_API_KEY;
const libraryId = process.env.BUNNY_LIBRARY_ID;
const cdn = process.env.BUNNY_CDN_HOSTNAME || 'vz-cdn.bunnycdn.net';

async function sync() {
  const { data: dbVideos } = await supabase.from('videos').select('bunny_video_id');
  const existingIds = new Set((dbVideos || []).map(v => v.bunny_video_id).filter(Boolean));

  // Find the cadmin ID
  let cadminId = null;
  const { data: profiles } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1);
  if (profiles && profiles.length > 0) {
    cadminId = profiles[0].id;
  }

  const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos?itemsPerPage=100`, {
    headers: { AccessKey: bunnyKey, Accept: 'application/json' }
  });
  
  if (!res.ok) return;
  const data = await res.json();
  const items = data.items || [];

  let added = 0;
  for (const bv of items) {
    if (bv.status === 4 && !existingIds.has(bv.guid)) {
      const { error } = await supabase.from('videos').insert({
         bunny_video_id: bv.guid,
         title: bv.title || 'Untitled',
         slug: `${bv.guid}-${Date.now()}`,
         description: 'Imported from Bunny Stream',
         creator_id: cadminId,
         visibility: 'public',
         moderation_status: 'published',
         video_url: `https://${cdn}/${bv.guid}/playlist.m3u8`,
         thumbnail_url: `https://${cdn}/${bv.guid}/thumbnail.jpg`,
         duration: bv.length || 0,
         views: bv.views || 0,
      });
      if (error) console.error("Error inserting", bv.guid, error);
      else added++;
    }
  }
  console.log(`Successfully synced ${added} missing videos from Bunny to Supabase.`);
}
sync();
