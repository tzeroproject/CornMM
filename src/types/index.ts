// Data types for cornmm Video Platform

export type UserRole = 'user' | 'creator' | 'moderator' | 'admin';

export type ModerationStatus = 
  | 'draft' 
  | 'processing' 
  | 'pending_review' 
  | 'published' 
  | 'rejected' 
  | 'private' 
  | 'removed';

export type VideoVisibility = 'public' | 'unlisted' | 'private';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  website?: string;
  role: UserRole;
  is_verified: boolean;
  is_suspended?: boolean;
  subscriber_count: number;
  total_views: number;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  video_count: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Video {
  id: string;
  bunny_video_id?: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  duration: number; // in seconds
  category_id: string;
  category?: Category;
  creator_id: string;
  creator?: Profile;
  visibility: VideoVisibility;
  moderation_status: ModerationStatus;
  rejection_reason?: string;
  is_age_restricted: boolean;
  allow_comments: boolean;
  views: number;
  likes_count: number;
  comments_count: number;
  video_url: string; // HLS playlist (.m3u8) or direct stream URL
  preview_animation_url?: string;
  tags?: Tag[];
  created_at: string;
  updated_at?: string;
  is_liked?: boolean;
  is_favorited?: boolean;
}

export interface WatchHistoryItem {
  id: string;
  user_id: string;
  video_id: string;
  video?: Video;
  progress_seconds: number;
  duration_seconds: number;
  completed: boolean;
  watched_at: string;
}

export interface FavoriteItem {
  id: string;
  user_id: string;
  video_id: string;
  video?: Video;
  created_at: string;
}

export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  user: Profile;
  content: string;
  parent_id?: string | null;
  likes_count: number;
  is_liked?: boolean;
  is_hidden: boolean;
  created_at: string;
  replies?: Comment[];
}

export type ReportReason = 
  | 'copyright' 
  | 'illegal_content' 
  | 'harassment' 
  | 'spam' 
  | 'violence' 
  | 'non_consensual' 
  | 'hate_speech' 
  | 'misinformation' 
  | 'other';

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  reporter?: Profile;
  video_id: string;
  video?: Video;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  action_taken?: string;
  reviewer_id?: string;
  reviewer?: Profile;
  reviewed_at?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  creator_id: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id?: string;
  actor?: Profile;
  type: 'new_video' | 'like' | 'comment' | 'subscription' | 'system' | 'moderation';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  admin?: Profile;
  action: string;
  target_type: 'video' | 'user' | 'report' | 'category' | 'tag';
  target_id: string;
  target_name?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export type AuditLog = AdminAction;

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalVideos: number;
  pendingVideos: number;
  publishedVideos: number;
  reportedVideos: number;
  totalViews: number;
  uploadActivity: { date: string; uploads: number; views: number }[];
}

export interface BunnyUploadInitResponse {
  videoId: string;
  libraryId: string;
  uploadUrl: string;
  directUploadHeaders?: Record<string, string>;
  cdnHostname?: string;
}

export interface BunnyVideoStatusResponse {
  videoId: string;
  statusCode: number; // 0: Created, 1: Uploaded, 2: Processing, 3: Transcoding, 4: Finished, 5: Error
  statusText: string;
  encodeProgress: number;
  hasMP4Fallback: boolean;
}
