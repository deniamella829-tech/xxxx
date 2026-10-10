ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_videos_tags ON public.videos USING GIN(tags);