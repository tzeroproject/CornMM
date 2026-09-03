-- Bunny webhook currently changes finished videos to pending_review.
-- Convert that transition to published so finished uploads remain visible to guests.
CREATE OR REPLACE FUNCTION public.publish_ready_video_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.moderation_status = 'pending_review'
     AND OLD.moderation_status IN ('processing','pending_review','published') THEN
    NEW.moderation_status := 'published';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publish_ready_video_update ON public.videos;
CREATE TRIGGER trg_publish_ready_video_update
BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.publish_ready_video_update();

-- Make any existing public pending uploads immediately visible.
UPDATE public.videos
SET moderation_status = 'published', updated_at = NOW()
WHERE moderation_status = 'pending_review'
  AND visibility IN ('public','unlisted');
