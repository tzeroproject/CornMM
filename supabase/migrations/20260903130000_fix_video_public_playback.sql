-- CornMM: production video visibility/playback fix
-- Keeps Supabase as the source of truth.
-- Uploaders must be authenticated; published/public videos are readable anonymously.

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS bunny_video_id TEXT,
  ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_age_restricted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_views BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_videos_public_feed
  ON public.videos (created_at DESC)
  WHERE moderation_status = 'published' AND visibility IN ('public','unlisted');

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin','moderator')
  );
$$;

CREATE OR REPLACE FUNCTION public.publish_uploaded_video()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.moderation_status = 'pending_review' THEN
    NEW.moderation_status := 'published';
  END IF;
  IF NEW.visibility IS NULL THEN
    NEW.visibility := 'public';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publish_uploaded_video ON public.videos;
CREATE TRIGGER trg_publish_uploaded_video
BEFORE INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.publish_uploaded_video();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Public profiles are viewable by everyone') THEN
    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.profiles FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Categories viewable by everyone') THEN
    CREATE POLICY "Categories viewable by everyone"
      ON public.categories FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='videos' AND policyname='Public published videos are viewable') THEN
    CREATE POLICY "Public published videos are viewable"
      ON public.videos FOR SELECT
      USING (
        (moderation_status = 'published' AND visibility IN ('public','unlisted'))
        OR auth.uid() = creator_id
        OR public.is_admin(auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='videos' AND policyname='Authenticated users can upload videos') THEN
    CREATE POLICY "Authenticated users can upload videos"
      ON public.videos FOR INSERT
      WITH CHECK (
        auth.uid() = creator_id
        AND moderation_status IN ('draft','processing','pending_review','published')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='videos' AND policyname='Creators can update own video details') THEN
    CREATE POLICY "Creators can update own video details"
      ON public.videos FOR UPDATE
      USING (auth.uid() = creator_id OR public.is_admin(auth.uid()))
      WITH CHECK (auth.uid() = creator_id OR public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='videos' AND policyname='Creators and Admins can delete videos') THEN
    CREATE POLICY "Creators and Admins can delete videos"
      ON public.videos FOR DELETE
      USING (auth.uid() = creator_id OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- Do not expose the SECURITY DEFINER helper through the public REST RPC surface.
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM anon, authenticated;

-- Default categories used by the web client.
INSERT INTO public.categories (name, slug, description, icon)
VALUES
 ('Technology & Engineering','technology','Coding, hardware, AI systems, and tech tutorials','Cpu'),
 ('Cinema & Documentary','cinema','Cinematography, short films, color grading, and lens tests','Film'),
 ('Creative Arts & Design','creative-arts','Visual effects, 3D modeling, illustration, and design philosophy','Palette'),
 ('Science & Education','science','Physics, mathematics, space exploration, and academic lectures','FlaskConical'),
 ('Music & Soundscapes','music','Original electronic compositions, modular synth jams, and live sets','Music'),
 ('Gaming & Esports','gaming','Speedruns, competitive matches, and interactive gameplay','Gamepad2')
ON CONFLICT (slug) DO NOTHING;
