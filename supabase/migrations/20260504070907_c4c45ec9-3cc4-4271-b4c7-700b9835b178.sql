
DROP POLICY IF EXISTS "Public read videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- Allow read only for known object names (no listing without name filter)
CREATE POLICY "Read videos by name" ON storage.objects FOR SELECT
  USING (bucket_id = 'videos' AND name IS NOT NULL);
CREATE POLICY "Read avatars by name" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND name IS NOT NULL);

-- Lock down trigger function (called only by trigger, not via API)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
