
-- Photos bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('photos','photos',true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for photos bucket
CREATE POLICY "Photos publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Auth users upload photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner deletes own photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Photos table
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  views BIGINT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photos viewable by all" ON public.photos FOR SELECT USING (true);
CREATE POLICY "Auth insert photos" ON public.photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update photos" ON public.photos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner delete photos" ON public.photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Photo reactions (likes only for simplicity)
CREATE TABLE public.photo_reactions (
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (photo_id, user_id)
);
ALTER TABLE public.photo_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photo reactions readable" ON public.photo_reactions FOR SELECT USING (true);
CREATE POLICY "Users like photos" ON public.photo_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike photos" ON public.photo_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Photo comments
CREATE TABLE public.photo_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photo comments readable" ON public.photo_comments FOR SELECT USING (true);
CREATE POLICY "Auth users create photo comments" ON public.photo_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own photo comments" ON public.photo_comments FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(),'admin'));
