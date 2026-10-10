import SignedImg from "@/components/SignedImg";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Eye, ExternalLink, Loader2, Play, Rss, User as UserIcon } from "lucide-react";
import VideoCard, { type Video } from "@/components/VideoCard";
import { getVisitorId } from "@/lib/visitor";
import { useFollow } from "@/hooks/use-follow";
import BrandIntro from "@/components/BrandIntro";
import VideoActions from "@/components/VideoActions";
import Comments from "@/components/Comments";
import { getPlayableUrl } from "@/lib/media";

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [video, setVideo] = useState<Video | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string>("");
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [views, setViews] = useState(0);
  const [uploaderVideoCount, setUploaderVideoCount] = useState(0);
  const countedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    setStarted(false);
    setIntroDone(false);
    countedRef.current = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from("videos").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Video no encontrado"); navigate("/"); return; }
      let uploader = null;
      if (data.user_id) {
        const { data: p } = await supabase.from("profiles").select("username,avatar_url").eq("id", data.user_id).maybeSingle();
        if (p) uploader = p;
      }
      const v = { ...data, uploader } as Video;
      setVideo(v);
      setViews(v.views);
      document.title = `${v.title} — X Pornazo`;
      getPlayableUrl(v.video_url).then(setPlaybackUrl).catch(() => setPlaybackUrl(v.video_url));

      if (data.user_id) {
        const { count } = await supabase.from("videos").select("id", { count: "exact", head: true }).eq("user_id", data.user_id);
        setUploaderVideoCount(count ?? 0);
      } else {
        setUploaderVideoCount(0);
      }

      // related: same tag(s) first, fallback recent
      let rel: Video[] = [];
      if (v.tags && v.tags.length) {
        const { data: r } = await supabase.from("videos").select("*").overlaps("tags", v.tags).neq("id", v.id).limit(12);
        rel = (r ?? []) as Video[];
      }
      if (rel.length < 8) {
        const { data: r2 } = await supabase.from("videos").select("*").neq("id", v.id).order("views", { ascending: false }).limit(12);
        const seen = new Set(rel.map((x) => x.id));
        for (const x of r2 ?? []) if (!seen.has(x.id)) rel.push(x as Video);
      }
      const ids = Array.from(new Set(rel.map((x) => x.user_id).filter(Boolean) as string[]));
      const map = new Map<string, { username: string; avatar_url: string | null }>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
        (profs ?? []).forEach((p) => map.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
      }
      setRelated(rel.slice(0, 12).map((x) => ({ ...x, uploader: x.user_id ? map.get(x.user_id) ?? null : null })));
      setLoading(false);
    })();
  }, [id, navigate]);

  const handlePlay = async () => {
    setStarted(true);
  };

  const handleIntroFinish = () => {
    setIntroDone(true);
    setTimeout(() => videoRef.current?.play().catch(() => {}), 50);
  };

  // Anti-fraud view tracking: send when watched 30s OR 70%
  const trackedRef = useRef(false);
  const watchStartRef = useRef<number>(0);

  const handleStarted = () => {
    if (watchStartRef.current === 0) watchStartRef.current = Date.now();
  };

  const handleTimeUpdate = async () => {
    if (trackedRef.current || !video || !videoRef.current) return;
    const v = videoRef.current;
    const watched = v.currentTime;
    const dur = v.duration || 0;
    const pct = dur > 0 ? (watched / dur) * 100 : 0;
    const qualifies = (dur > 0 && dur < 30) ? pct >= 70 : watched >= 30;
    if (!qualifies) return;
    trackedRef.current = true;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-view`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({
          video_id: video.id,
          visitor_id: getVisitorId(),
          watch_seconds: Math.floor(watched),
          watch_percentage: Math.min(100, pct),
        }),
      });
      const json = await res.json();
      if (json?.counted) setViews((n) => n + 1);
    } catch { /* silent */ }
  };

  const follow = useFollow(video?.user_id ?? null);

  if (loading || !video) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-header border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <Link to="/" className="flex items-center gap-2 ml-2">
            <span className="text-2xl font-extrabold text-primary">X</span>
            <span className="text-xl font-bold">Pornazo</span>
          </Link>
          <div className="flex-1" />
          {user && profile ? (
            <Link to={`/u/${profile.username}`} className="w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary">
              {profile.avatar_url
                ? <SignedImg src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                : <UserIcon className="h-5 w-5 text-muted-foreground" />}
            </Link>
          ) : (
            <Link to="/auth"><Button size="sm">Entrar</Button></Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            {!started ? (
              <button onClick={handlePlay} className="absolute inset-0 group" aria-label="Reproducir video">
                <video src={playbackUrl || undefined} muted playsInline preload="metadata" className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="bg-primary rounded-full p-6 shadow-2xl group-hover:scale-110 transition-transform">
                    <Play className="h-10 w-10 text-primary-foreground fill-current" />
                  </div>
                </div>
              </button>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={playbackUrl || undefined}
                  controls
                  onPlay={handleStarted}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={(e) => {
                    const d = (e.target as HTMLVideoElement).duration;
                    if (d && Number.isFinite(d) && !video.duration_seconds) {
                      supabase.from("videos").update({ duration_seconds: Math.floor(d) }).eq("id", video.id);
                    }
                  }}
                  className="w-full h-full bg-black"
                />
                {!introDone && <BrandIntro onFinish={handleIntroFinish} />}
              </>
            )}
          </div>

          <h1 className="mt-4 text-xl md:text-2xl font-bold">{video.title}</h1>

          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-4 w-4 text-primary" /> <span className="font-semibold text-foreground">{views.toLocaleString()}</span> vistas</span>
            <span>{new Date(video.created_at).toLocaleDateString()}</span>
          </div>

          <VideoActions videoId={video.id} />

          {video.uploader && (
            <div className="mt-4 flex items-center justify-between gap-3 bg-card border border-border rounded-lg p-3">
              <Link to={`/u/${video.uploader.username}`} className="flex items-center gap-3 group min-w-0">
                <div className="shrink-0 w-12 h-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center group-hover:ring-2 group-hover:ring-primary">
                  {video.uploader.avatar_url
                    ? <SignedImg src={video.uploader.avatar_url} alt={video.uploader.username} className="w-full h-full object-cover" />
                    : <UserIcon className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-bold group-hover:text-primary truncate">
                    {video.uploader.username}
                    <BadgeCheck className="h-4 w-4 text-primary fill-primary/20 shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {uploaderVideoCount} {uploaderVideoCount === 1 ? "Vídeo" : "Vídeos"} <span className="mx-1">|</span> {follow.count} {follow.count === 1 ? "Seguidor" : "Seguidores"}
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/u/${video.uploader.username}`}>
                  <Button className="gap-1.5">Más de mí <ExternalLink className="h-3.5 w-3.5" /></Button>
                </Link>
                <Button
                  variant={follow.isFollowing ? "secondary" : "outline"}
                  className="gap-1.5"
                  disabled={!follow.canFollow || follow.loading}
                  onClick={follow.toggle}
                  title={!follow.canFollow ? "Inicia sesión para seguir" : ""}
                >
                  <Rss className="h-4 w-4" /> {follow.isFollowing ? "Siguiendo" : "Seguir"}
                </Button>
              </div>
            </div>
          )}

          {video.description && (
            <p className="mt-4 text-sm text-foreground/90 whitespace-pre-wrap">{video.description}</p>
          )}

          {video.tags && video.tags.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Etiquetas</div>
              <div className="flex flex-wrap gap-2">
                {video.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full px-3 py-1 hover:bg-primary hover:text-primary-foreground cursor-pointer">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Comments videoId={video.id} />
        </div>

        <aside>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Más videos</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
            {related.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Watch;
