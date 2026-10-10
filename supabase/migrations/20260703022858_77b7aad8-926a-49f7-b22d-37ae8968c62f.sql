
-- Allow is_verified changes when they match auto-eligibility, plus admin overrides
CREATE OR REPLACE FUNCTION public.protect_is_verified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF NOT public.has_role(auth.uid(),'admin')
       AND NOT (NEW.is_verified = true
                AND NEW.monetization_enabled = true
                AND NEW.monetization_blocked = false) THEN
      NEW.is_verified := OLD.is_verified;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- Auto-verify creators as they become monetization-eligible
CREATE OR REPLACE FUNCTION public.refresh_monetization_eligibility(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s RECORD; p RECORD; eligible BOOLEAN;
BEGIN
  SELECT * INTO s FROM public.monetization_settings WHERE id = 1;
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p IS NULL THEN RETURN; END IF;
  IF p.monetization_blocked THEN
    UPDATE public.profiles SET monetization_enabled = false WHERE id = _user_id;
    RETURN;
  END IF;
  eligible := (
    p.total_videos >= s.min_videos AND
    p.total_views >= s.min_views AND
    p.total_followers >= s.min_followers
  );
  UPDATE public.profiles
    SET monetization_enabled = eligible,
        is_verified = CASE WHEN eligible THEN true ELSE is_verified END
    WHERE id = _user_id;
END; $function$;

-- Backfill: verify anyone currently eligible
UPDATE public.profiles
  SET is_verified = true
  WHERE monetization_enabled = true
    AND monetization_blocked = false
    AND is_verified = false;
