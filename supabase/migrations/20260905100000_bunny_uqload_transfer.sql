-- Bunny -> UQLOAD transfer metadata
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS uqload_filecode TEXT,
  ADD COLUMN IF NOT EXISTS uqload_embed_url TEXT,
  ADD COLUMN IF NOT EXISTS uqload_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (uqload_status IN ('not_started','uploading','queued','completed','failed')),
  ADD COLUMN IF NOT EXISTS uqload_error TEXT,
  ADD COLUMN IF NOT EXISTS uqload_transferred_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_videos_uqload_status
  ON public.videos(uqload_status);

CREATE INDEX IF NOT EXISTS idx_videos_uqload_filecode
  ON public.videos(uqload_filecode);
