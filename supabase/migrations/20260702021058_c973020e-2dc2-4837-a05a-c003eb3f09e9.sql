
CREATE OR REPLACE FUNCTION public.record_video_view(_video_id uuid, _viewer_user_id uuid, _visitor_id text, _ip_hash text, _ua_hash text, _watch_seconds integer, _watch_percentage numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- One view per device/user per video, forever
  IF _viewer_user_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.video_views WHERE video_id=_video_id AND viewer_user_id=_viewer_user_id) INTO dup;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.video_views
      WHERE video_id=_video_id
        AND (
          (_visitor_id IS NOT NULL AND visitor_id = _visitor_id)
          OR (ip_hash = _ip_hash AND user_agent_hash = _ua_hash)
        )
    ) INTO dup;
  END IF;
  IF dup THEN RETURN jsonb_build_object('counted',false,'reason','already_counted'); END IF;

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
END; $function$;

REVOKE ALL ON FUNCTION public.record_video_view(uuid, uuid, text, text, text, integer, numeric) FROM PUBLIC, anon, authenticated;
