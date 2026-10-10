
-- =================== PROFILES ===================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  monetization_enabled BOOLEAN NOT NULL DEFAULT false,
  monetization_blocked BOOLEAN NOT NULL DEFAULT false,
  total_views BIGINT NOT NULL DEFAULT 0,
  total_followers INT NOT NULL DEFAULT 0,
  total_videos INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- =================== VIDEOS ===================
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  storage_path TEXT,
  views BIGINT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  duration_seconds INT,
  monetized BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_videos_tags ON public.videos USING GIN(tags);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Videos viewable by all" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Auth insert videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update videos" ON public.videos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner delete videos" ON public.videos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_video_views(video_id UUID)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c BIGINT;
BEGIN
  UPDATE public.videos SET views = views + 1 WHERE id = video_id RETURNING views INTO c;
  RETURN c;
END; $$;

-- =================== ROLES ===================
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =================== FOLLOWS ===================
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows readable by all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- =================== VIDEO VIEWS ===================
CREATE TYPE public.view_status AS ENUM ('pending','verified','rejected');
CREATE TABLE public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id TEXT,
  ip_hash TEXT NOT NULL,
  user_agent_hash TEXT,
  watch_seconds INT NOT NULL DEFAULT 0,
  watch_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  status public.view_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vv_video ON public.video_views(video_id);
CREATE INDEX idx_vv_user ON public.video_views(viewer_user_id);
CREATE INDEX idx_vv_visitor ON public.video_views(visitor_id);
CREATE INDEX idx_vv_status ON public.video_views(status);
CREATE INDEX idx_vv_created ON public.video_views(created_at);
CREATE INDEX idx_vv_ip ON public.video_views(ip_hash, created_at);
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own views" ON public.video_views FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = auth.uid())
  );

-- =================== WALLETS ===================
CREATE TABLE public.creator_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_pending NUMERIC(12,4) NOT NULL DEFAULT 0,
  balance_available NUMERIC(12,4) NOT NULL DEFAULT 0,
  balance_paid NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creator_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads wallet" ON public.creator_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- =================== EARNINGS ===================
CREATE TYPE public.earning_status AS ENUM ('pending','available','paid');
CREATE TABLE public.creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  verified_views INT NOT NULL DEFAULT 0,
  rate_per_view NUMERIC(8,5) NOT NULL DEFAULT 0.001,
  amount NUMERIC(12,4) NOT NULL DEFAULT 0,
  status public.earning_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_earnings_user ON public.creator_earnings(user_id);
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads earnings" ON public.creator_earnings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- =================== PAYOUTS ===================
CREATE TYPE public.payout_status AS ENUM ('pending','approved','rejected','paid');
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,4) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_details TEXT NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (amount >= 100)
);
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads payouts" ON public.payout_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- =================== SETTINGS ===================
CREATE TABLE public.monetization_settings (
  id INT PRIMARY KEY DEFAULT 1,
  rate_per_view NUMERIC(8,5) NOT NULL DEFAULT 0.001,
  min_payout NUMERIC(12,2) NOT NULL DEFAULT 100,
  verification_days INT NOT NULL DEFAULT 7,
  min_videos INT NOT NULL DEFAULT 30,
  min_views INT NOT NULL DEFAULT 30000,
  min_followers INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (id = 1)
);
INSERT INTO public.monetization_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings readable" ON public.monetization_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.monetization_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =================== FUNCTIONS ===================
CREATE OR REPLACE FUNCTION public.refresh_monetization_eligibility(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; p RECORD;
BEGIN
  SELECT * INTO s FROM public.monetization_settings WHERE id = 1;
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p IS NULL THEN RETURN; END IF;
  IF p.monetization_blocked THEN
    UPDATE public.profiles SET monetization_enabled = false WHERE id = _user_id;
    RETURN;
  END IF;
  UPDATE public.profiles
    SET monetization_enabled = (
      p.total_videos >= s.min_videos AND
      p.total_views >= s.min_views AND
      p.total_followers >= s.min_followers
    ) WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; final TEXT; i INT := 0;
BEGIN
  base := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'username'),''), split_part(NEW.email,'@',1));
  base := lower(regexp_replace(base,'[^a-zA-Z0-9_]','','g'));
  IF base = '' THEN base := 'user'; END IF;
  final := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final) LOOP
    i := i + 1; final := base || i::text;
  END LOOP;
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, final);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_video_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles SET total_videos = total_videos + 1 WHERE id = NEW.user_id;
    PERFORM public.refresh_monetization_eligibility(NEW.user_id);
  ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL THEN
    UPDATE public.profiles SET total_videos = GREATEST(total_videos - 1, 0) WHERE id = OLD.user_id;
    PERFORM public.refresh_monetization_eligibility(OLD.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_video_count
AFTER INSERT OR DELETE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.handle_video_change();

CREATE OR REPLACE FUNCTION public.handle_follow_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET total_followers = total_followers + 1 WHERE id = NEW.followed_id;
    PERFORM public.refresh_monetization_eligibility(NEW.followed_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET total_followers = GREATEST(total_followers - 1, 0) WHERE id = OLD.followed_id;
    PERFORM public.refresh_monetization_eligibility(OLD.followed_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_follow_count
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.handle_follow_change();

CREATE OR REPLACE FUNCTION public.record_video_view(
  _video_id UUID, _viewer_user_id UUID, _visitor_id TEXT,
  _ip_hash TEXT, _ua_hash TEXT, _watch_seconds INT, _watch_percentage NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v RECORD; qualifies BOOLEAN; dup BOOLEAN; ip_count INT;
BEGIN
  SELECT * INTO v FROM public.videos WHERE id = _video_id;
  IF v IS NULL THEN RETURN jsonb_build_object('counted',false,'reason','not_found'); END IF;

  IF v.duration_seconds IS NOT NULL AND v.duration_seconds < 30 THEN
    qualifies := _watch_percentage >= 70;
  ELSE
    qualifies := _watch_seconds >= 30;
  END IF;
  IF NOT qualifies THEN RETURN jsonb_build_object('counted',false,'reason','insufficient_watch'); END IF;

  IF _viewer_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.video_views WHERE video_id=_video_id AND viewer_user_id=_viewer_user_id AND created_at > now() - interval '24 hours') INTO dup;
  ELSE
    SELECT EXISTS(SELECT 1 FROM public.video_views WHERE video_id=_video_id AND visitor_id=_visitor_id AND created_at > now() - interval '24 hours') INTO dup;
  END IF;
  IF dup THEN RETURN jsonb_build_object('counted',false,'reason','duplicate_24h'); END IF;

  SELECT COUNT(*) INTO ip_count FROM public.video_views WHERE ip_hash=_ip_hash AND created_at > now() - interval '1 minute';
  IF ip_count >= 5 THEN
    INSERT INTO public.video_views(video_id,viewer_user_id,visitor_id,ip_hash,user_agent_hash,watch_seconds,watch_percentage,status,rejection_reason)
      VALUES (_video_id,_viewer_user_id,_visitor_id,_ip_hash,_ua_hash,_watch_seconds,_watch_percentage,'rejected','ip_rate_limit');
    RETURN jsonb_build_object('counted',false,'reason','ip_rate_limit');
  END IF;

  INSERT INTO public.video_views(video_id,viewer_user_id,visitor_id,ip_hash,user_agent_hash,watch_seconds,watch_percentage,status)
    VALUES (_video_id,_viewer_user_id,_visitor_id,_ip_hash,_ua_hash,_watch_seconds,_watch_percentage,'pending');

  UPDATE public.videos SET views = views + 1 WHERE id = _video_id;
  IF v.user_id IS NOT NULL THEN
    UPDATE public.profiles SET total_views = total_views + 1 WHERE id = v.user_id;
    PERFORM public.refresh_monetization_eligibility(v.user_id);
  END IF;
  RETURN jsonb_build_object('counted',true);
END; $$;
REVOKE EXECUTE ON FUNCTION public.record_video_view FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_pending_views()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; rec RECORD; earned NUMERIC; total INT := 0;
BEGIN
  SELECT * INTO s FROM public.monetization_settings WHERE id = 1;

  WITH upd AS (
    UPDATE public.video_views SET status='verified'
    WHERE status='pending' AND created_at < now() - (s.verification_days || ' days')::interval
    RETURNING id, video_id
  )
  SELECT COUNT(*) INTO total FROM upd;

  FOR rec IN
    SELECT v.id AS video_id, v.user_id, COUNT(vv.id)::int AS new_views
    FROM public.video_views vv
    JOIN public.videos v ON v.id = vv.video_id
    JOIN public.profiles p ON p.id = v.user_id
    WHERE vv.status='verified' AND v.monetized=true
      AND p.monetization_enabled=true AND p.monetization_blocked=false
      AND NOT EXISTS (SELECT 1 FROM public.creator_earnings ce
        WHERE ce.video_id = v.id AND ce.created_at >= vv.created_at)
    GROUP BY v.id, v.user_id
  LOOP
    earned := rec.new_views * s.rate_per_view;
    INSERT INTO public.creator_earnings(user_id, video_id, verified_views, rate_per_view, amount, status)
      VALUES (rec.user_id, rec.video_id, rec.new_views, s.rate_per_view, earned, 'pending');
    INSERT INTO public.creator_wallets(user_id, balance_pending) VALUES (rec.user_id, earned)
      ON CONFLICT (user_id) DO UPDATE
      SET balance_pending = creator_wallets.balance_pending + EXCLUDED.balance_pending, updated_at = now();
  END LOOP;

  WITH moved AS (
    UPDATE public.creator_earnings SET status='available', updated_at=now()
    WHERE status='pending' AND created_at < now() - interval '1 day'
    RETURNING user_id, amount
  ), agg AS (SELECT user_id, SUM(amount) AS total FROM moved GROUP BY user_id)
  UPDATE public.creator_wallets w
    SET balance_pending = GREATEST(w.balance_pending - agg.total, 0),
        balance_available = w.balance_available + agg.total, updated_at = now()
    FROM agg WHERE agg.user_id = w.user_id;

  RETURN jsonb_build_object('verified', total);
END; $$;
GRANT EXECUTE ON FUNCTION public.verify_pending_views TO authenticated;

CREATE OR REPLACE FUNCTION public.request_payout(_amount NUMERIC, _method TEXT, _details TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; w RECORD; new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO s FROM public.monetization_settings WHERE id = 1;
  IF _amount < s.min_payout THEN RAISE EXCEPTION 'Mínimo de retiro: %', s.min_payout; END IF;
  SELECT * INTO w FROM public.creator_wallets WHERE user_id = auth.uid();
  IF w IS NULL OR w.balance_available < _amount THEN RAISE EXCEPTION 'Saldo disponible insuficiente'; END IF;
  UPDATE public.creator_wallets SET balance_available = balance_available - _amount, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO public.payout_requests(user_id, amount, payment_method, payment_details)
    VALUES (auth.uid(), _amount, _method, _details) RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.request_payout TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_payout_status(_payout_id UUID, _new_status public.payout_status, _notes TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pr RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT * INTO pr FROM public.payout_requests WHERE id = _payout_id;
  IF pr IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF _new_status='paid' AND pr.status<>'paid' THEN
    UPDATE public.creator_wallets SET balance_paid = balance_paid + pr.amount, updated_at = now() WHERE user_id = pr.user_id;
  ELSIF _new_status='rejected' AND pr.status IN ('pending','approved') THEN
    UPDATE public.creator_wallets SET balance_available = balance_available + pr.amount, updated_at = now() WHERE user_id = pr.user_id;
  END IF;
  UPDATE public.payout_requests SET status=_new_status, admin_notes=_notes, updated_at=now() WHERE id = _payout_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_payout_status TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_monetization(_user_id UUID, _enabled BOOLEAN, _blocked BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.profiles SET monetization_enabled = _enabled, monetization_blocked = _blocked WHERE id = _user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_monetization TO authenticated;

-- =================== STORAGE ===================
INSERT INTO storage.buckets (id, name, public) VALUES ('videos','videos',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true) ON CONFLICT DO NOTHING;

CREATE POLICY "Read videos" ON storage.objects FOR SELECT USING (bucket_id='videos' AND name IS NOT NULL);
CREATE POLICY "Upload videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='videos');
CREATE POLICY "Delete own videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='videos' AND owner = auth.uid());

CREATE POLICY "Read avatars" ON storage.objects FOR SELECT USING (bucket_id='avatars' AND name IS NOT NULL);
CREATE POLICY "Upload avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Update avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- realtime
ALTER TABLE public.videos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
