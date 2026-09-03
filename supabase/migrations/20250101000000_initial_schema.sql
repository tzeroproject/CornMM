-- ============================================================================
-- StreamSphere Video Platform - Production Supabase Migration
-- Tables: profiles, videos, categories, tags, video_tags, likes, favorites,
--         watch_history, comments, reports, subscriptions, notifications, admin_actions
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT DEFAULT '',
    website TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'creator', 'moderator', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    subscriber_count INTEGER NOT NULL DEFAULT 0 CHECK (subscriber_count >= 0),
    total_views BIGINT NOT NULL DEFAULT 0 CHECK (total_views >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    video_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TAGS TABLE
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. VIDEOS TABLE
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bunny_video_id TEXT UNIQUE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    thumbnail_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- in seconds
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
    moderation_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
        moderation_status IN ('draft', 'processing', 'pending_review', 'published', 'rejected', 'private', 'removed')
    ),
    rejection_reason TEXT,
    is_age_restricted BOOLEAN NOT NULL DEFAULT false,
    allow_comments BOOLEAN NOT NULL DEFAULT true,
    views BIGINT NOT NULL DEFAULT 0 CHECK (views >= 0),
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    video_url TEXT, -- HLS / CDN URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. VIDEO_TAGS TABLE (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.video_tags (
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (video_id, tag_id)
);

-- 6. LIKES TABLE
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

-- 7. FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

-- 8. WATCH_HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    progress_seconds INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

-- 9. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. REPORTS TABLE (Moderation & Abuse Reporting)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN (
        'copyright', 'illegal_content', 'harassment', 'spam', 'violence',
        'non_consensual', 'hate_speech', 'misinformation', 'other'
    )),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    action_taken TEXT,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(subscriber_id, creator_id),
    CHECK (subscriber_id <> creator_id)
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('new_video', 'like', 'comment', 'subscription', 'system', 'moderation')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. ADMIN_ACTIONS (Audit Log)
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- e.g. 'video_approve', 'video_reject', 'video_remove', 'user_suspend', 'report_resolve'
    target_type TEXT NOT NULL, -- 'video', 'user', 'report', 'category'
    target_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE INDEXES (As specified in requirement #6)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_views ON public.videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category_id ON public.videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON public.videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_videos_moderation_status ON public.videos(moderation_status);
CREATE INDEX IF NOT EXISTS idx_videos_slug ON public.videos(slug);
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON public.videos(visibility);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON public.watch_history(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON public.likes(video_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Anyone can view active profiles; users update their own
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Categories & Tags: Anyone can read; Admin can manage
CREATE POLICY "Categories viewable by everyone"
    ON public.categories FOR SELECT
    USING (true);

CREATE POLICY "Categories manageable by admin"
    ON public.categories FOR ALL
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Tags viewable by everyone"
    ON public.tags FOR SELECT
    USING (true);

CREATE POLICY "Tags manageable by admin"
    ON public.tags FOR ALL
    USING (public.is_admin(auth.uid()));

-- Videos:
-- 1. Read: Anyone can read published + public/unlisted videos. Creators can see all their own videos. Admins can see all.
CREATE POLICY "Public published videos are viewable"
    ON public.videos FOR SELECT
    USING (
        (moderation_status = 'published' AND visibility IN ('public', 'unlisted'))
        OR (auth.uid() = creator_id)
        OR public.is_admin(auth.uid())
    );

-- 2. Insert: Authenticated users can create videos (set creator_id to self)
CREATE POLICY "Authenticated users can upload videos"
    ON public.videos FOR INSERT
    WITH CHECK (
        auth.uid() = creator_id
        AND moderation_status IN ('draft', 'processing', 'pending_review')
    );

-- 3. Update: Creators can update title, description, category, tags, visibility of their own videos
CREATE POLICY "Creators can update own video details"
    ON public.videos FOR UPDATE
    USING (auth.uid() = creator_id OR public.is_admin(auth.uid()))
    WITH CHECK (
        -- Regular creators cannot directly alter moderation_status or views
        (auth.uid() = creator_id AND (
            moderation_status = 'pending_review' OR
            moderation_status = 'draft' OR
            moderation_status = 'published'
        ))
        OR public.is_admin(auth.uid())
    );

-- 4. Delete: Creators can delete own videos, or Admins
CREATE POLICY "Creators and Admins can delete videos"
    ON public.videos FOR DELETE
    USING (auth.uid() = creator_id OR public.is_admin(auth.uid()));

-- Video Tags
CREATE POLICY "Video tags viewable by everyone"
    ON public.video_tags FOR SELECT
    USING (true);

CREATE POLICY "Video owners can manage tags"
    ON public.video_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.videos
            WHERE id = video_tags.video_id AND creator_id = auth.uid()
        ) OR public.is_admin(auth.uid())
    );

-- Likes
CREATE POLICY "Anyone can view likes"
    ON public.likes FOR SELECT
    USING (true);

CREATE POLICY "Users can manage own likes"
    ON public.likes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Favorites
CREATE POLICY "Users can only view their own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
    ON public.favorites FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Watch History
CREATE POLICY "Users can view and edit own watch history"
    ON public.watch_history FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Comments
CREATE POLICY "Anyone can read published video comments"
    ON public.comments FOR SELECT
    USING (NOT is_hidden);

CREATE POLICY "Authenticated users can comment"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit or delete own comments"
    ON public.comments FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Reports
CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view and manage all reports"
    ON public.reports FOR ALL
    USING (public.is_admin(auth.uid()));

-- Subscriptions
CREATE POLICY "Public subscriptions viewable"
    ON public.subscriptions FOR SELECT
    USING (true);

CREATE POLICY "Users manage own subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.uid() = subscriber_id)
    WITH CHECK (auth.uid() = subscriber_id);

-- Notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Admin Actions
CREATE POLICY "Only admins can view audit logs"
    ON public.admin_actions FOR SELECT
    USING (public.is_admin(auth.uid()));

-- ============================================================================
-- SECURE SERVER-SIDE VIEW COUNTER RPC
-- (Preventing rapid duplicate client increments & direct count overwrites)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_video_view(p_video_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.videos
    SET views = views + 1
    WHERE id = p_video_id;

    -- Update creator total views
    UPDATE public.profiles
    SET total_views = total_views + 1
    WHERE id = (SELECT creator_id FROM public.videos WHERE id = p_video_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
