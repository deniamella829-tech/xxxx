import { supabase } from "@/integrations/supabase/client";

// Extract { bucket, path } from a Supabase storage URL (public or sign form).
// Returns null if the URL is not a Supabase Storage URL.
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

const cache = new Map<string, { url: string; expiresAt: number }>();

// Returns a playable URL. If the source is a Supabase Storage URL for a private
// bucket, generates (and caches) a signed URL. Otherwise returns the URL as-is.
export async function getPlayableUrl(url: string, expiresIn = 60 * 60): Promise<string> {
  if (!url) return url;
  const parsed = parseStorageUrl(url);
  if (!parsed) return url;

  const key = `${parsed.bucket}/${parsed.path}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now + 30_000) return hit.url;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn);
  if (error || !data?.signedUrl) return url; // fallback: original (may fail if private)
  cache.set(key, { url: data.signedUrl, expiresAt: now + expiresIn * 1000 });
  return data.signedUrl;
}

import { useEffect, useState } from "react";
export function useSignedMediaUrl(url: string | null | undefined): string {
  const [signed, setSigned] = useState<string>("");
  useEffect(() => {
    let cancel = false;
    if (!url) { setSigned(""); return; }
    getPlayableUrl(url).then((u) => { if (!cancel) setSigned(u); }).catch(() => { if (!cancel) setSigned(url); });
    return () => { cancel = true; };
  }, [url]);
  return signed;
}
