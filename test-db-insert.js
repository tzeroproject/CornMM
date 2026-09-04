import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.from('videos').insert({
    bunny_video_id: 'test', title: 'test', slug: 'test', visibility: 'public', moderation_status: 'pending_review', processing_status: 'processing'
  });
  console.log("Error:", error);
}
test();
