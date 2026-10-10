import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  try {
    // Reject oversized bodies (>2KB is suspicious for this payload)
    const raw = await req.text();
    if (raw.length > 2048) {
      return new Response(JSON.stringify({ error: 'payload_too_large' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { video_id, visitor_id, watch_seconds, watch_percentage } = JSON.parse(raw);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      typeof video_id !== 'string' || !uuidRe.test(video_id) ||
      typeof watch_seconds !== 'number' || !Number.isFinite(watch_seconds) || watch_seconds < 0 ||
      typeof watch_percentage !== 'number' || !Number.isFinite(watch_percentage)
    ) {
      return new Response(JSON.stringify({ error: 'invalid_body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const safeVisitorId = (typeof visitor_id === 'string' && visitor_id.length <= 128)
      ? visitor_id : null;

    let viewer_user_id: string | null = null;
    const auth = req.headers.get('Authorization');
    if (auth) {
      const { data } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
      viewer_user_id = data?.user?.id ?? null;
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0';
    const ua = req.headers.get('user-agent') ?? '';
    const ip_hash = await sha256(ip + '::xpz-v1');
    const ua_hash = await sha256(ua + '::xpz-v1');

    const { data, error } = await supabase.rpc('record_video_view', {
      _video_id: video_id,
      _viewer_user_id: viewer_user_id,
      _visitor_id: viewer_user_id ? null : safeVisitorId,
      _ip_hash: ip_hash,
      _ua_hash: ua_hash,
      _watch_seconds: Math.min(Math.floor(watch_seconds), 86400),
      _watch_percentage: Math.min(100, Math.max(0, watch_percentage)),
    });

    if (error) throw error;
    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
