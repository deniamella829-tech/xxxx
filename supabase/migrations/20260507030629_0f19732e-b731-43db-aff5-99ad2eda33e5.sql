
-- Reactions: like / dislike (one per user per video, replaceable)
CREATE TABLE public.video_reactions (
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
ALTER TABLE public.video_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions readable by all" ON public.video_reactions FOR SELECT USING (true);
CREATE POLICY "Users insert own reactions" ON public.video_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reactions" ON public.video_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions" ON public.video_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_video_reactions_video ON public.video_reactions(video_id);

-- Favorites
CREATE TABLE public.video_favorites (
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
ALTER TABLE public.video_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Favorites viewable by owner" ON public.video_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add favorites" ON public.video_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove favorites" ON public.video_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reports
CREATE TABLE public.video_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create reports" ON public.video_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read reports" ON public.video_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Comments
CREATE TABLE public.video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments readable by all" ON public.video_comments FOR SELECT USING (true);
CREATE POLICY "Auth users create comments" ON public.video_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.video_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_video_comments_video ON public.video_comments(video_id, created_at DESC);
