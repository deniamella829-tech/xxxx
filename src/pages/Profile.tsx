import SignedImg from "@/components/SignedImg";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFollow } from "@/hooks/use-follow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  Film,
  Globe,
  Instagram,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Music2,
  Pencil,
  Rss,
  Send,
  Sparkles,
  Twitter,
  Upload,
  Users,
  User as UserIcon,
  Youtube,
  BarChart3,
  Coins,
} from "lucide-react";
import VideoCard, { type Video as CardVideo } from "@/components/VideoCard";

type SocialKey =
  | "website_url"
  | "instagram_url"
  | "twitter_url"
  | "tiktok_url"
  | "youtube_url"
  | "onlyfans_url"
  | "telegram_url";

type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_followers: number;
  total_videos: number;
  total_views: number;
  created_at: string;
  bio: string | null;
  location: string | null;
  is_verified: boolean;
  website_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  onlyfans_url: string | null;
  telegram_url: string | null;
};

const SOCIALS: { key: SocialKey; label: string; placeholder: string; icon: any }[] = [
  { key: "website_url", label: "Sitio web", placeholder: "https://tu-sitio.com", icon: Globe },
  { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/usuario", icon: Instagram },
  { key: "twitter_url", label: "X / Twitter", placeholder: "https://x.com/usuario", icon: Twitter },
  { key: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@usuario", icon: Music2 },
  { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@canal", icon: Youtube },
  { key: "onlyfans_url", label: "OnlyFans", placeholder: "https://onlyfans.com/usuario", icon: LinkIcon },
  { key: "telegram_url", label: "Telegram", placeholder: "https://t.me/usuario", icon: Send },
];

function formatNumber(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + "K";
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1) + "M";
  return (n / 1_000_000_000).toFixed(1) + "B";
}

function normalizeUrl(v: string): string {
  const t = v.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

const Profile = () => {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuth();
  const [target, setTarget] = useState<ProfileRow | null>(null);
  const [videos, setVideos] = useState<CardVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"videos" | "about">("videos");
  const { isFollowing, count: followers, loading: followLoading, toggle, canFollow } = useFollow(target?.id);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!target?.id) return;
    (async () => {
      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", target.id);
      setFollowingCount(count ?? 0);
    })();
  }, [target?.id]);

  // About edit form
  const [editingAbout, setEditingAbout] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [form, setForm] = useState({
    bio: "",
    location: "",
    website_url: "",
    instagram_url: "",
    twitter_url: "",
    tiktok_url: "",
    youtube_url: "",
    onlyfans_url: "",
    telegram_url: "",
  });

  useEffect(() => {
    document.title = `@${username} — X Pornazo`;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!p) { setLoading(false); return; }
      const row = p as unknown as ProfileRow;
      setTarget(row);
      setNewName(row.username);
      setForm({
        bio: row.bio ?? "",
        location: row.location ?? "",
        website_url: row.website_url ?? "",
        instagram_url: row.instagram_url ?? "",
        twitter_url: row.twitter_url ?? "",
        tiktok_url: row.tiktok_url ?? "",
        youtube_url: row.youtube_url ?? "",
        onlyfans_url: row.onlyfans_url ?? "",
        telegram_url: row.telegram_url ?? "",
      });
      const { data: vs } = await supabase
        .from("videos")
        .select("id,title,description,video_url,views,created_at,user_id,tags,duration_seconds,monetized")
        .eq("user_id", row.id)
        .order("created_at", { ascending: false });
      const mapped: CardVideo[] = (vs ?? []).map((v: any) => ({
        ...v,
        uploader: { username: row.username, avatar_url: row.avatar_url },
      }));
      setVideos(mapped);
      setLoading(false);
    })();
  }, [username]);

  const isOwn = !!(user && target && user.id === target.id);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = f.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, f, { contentType: f.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
      if (error) throw error;
      setTarget({ ...target!, avatar_url: pub.publicUrl });
      if (profile) setProfile({ ...profile, avatar_url: pub.publicUrl });
      toast.success("Foto actualizada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !newName.trim()) return;
    const clean = newName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean) { toast.error("Nombre inválido"); return; }
    const { error } = await supabase.from("profiles").update({ username: clean }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    if (profile) setProfile({ ...profile, username: clean });
    toast.success("Nombre actualizado");
    setEditingName(false);
    navigate(`/u/${clean}`, { replace: true });
  };

  const handleSaveAbout = async () => {
    if (!user || !target) return;
    setSavingAbout(true);
    const payload: Record<string, string | null> = {
      bio: form.bio.trim() || null,
      location: form.location.trim() || null,
    };
    for (const s of SOCIALS) {
      const v = form[s.key].trim();
      payload[s.key] = v ? normalizeUrl(v) : null;
    }
    const { error } = await supabase.from("profiles").update(payload as any).eq("id", user.id);
    setSavingAbout(false);
    if (error) {
      toast.error(error.message.includes("column") ? "Falta ejecutar la migración SQL en Supabase." : error.message);
      return;
    }
    setTarget({ ...target, ...(payload as any) });
    setEditingAbout(false);
    toast.success("Perfil actualizado");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!target) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Usuario no encontrado.</p>
        <Link to="/"><Button>Volver</Button></Link>
      </div>
    );
  }

  const joined = new Date(target.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" });
  const activeSocials = SOCIALS.filter((s) => target[s.key]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-header border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-sm hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Inicio
          </Link>
          {isOwn && (
            <div className="ml-auto flex items-center gap-1.5">
              <Link to="/stats">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur-sm text-foreground/90 hover:bg-card hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="font-medium tracking-tight">Estadísticas</span>
                </Button>
              </Link>
              <Link to="/monetization">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur-sm text-foreground/90 hover:bg-card hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-medium tracking-tight">Monetización</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
              >
                <LogOut className="h-4 w-4" /> Salir
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Profile card */}
      <section className="container mx-auto px-4 pt-6 md:pt-8 pb-2">
        <div className="max-w-5xl mx-auto bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
          {/* Cover */}
          <div className="relative h-40 sm:h-56 md:h-64 bg-secondary">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 20% 30%, hsl(var(--primary) / 0.55), transparent 60%), radial-gradient(ellipse at 80% 60%, hsl(var(--primary) / 0.25), transparent 65%), linear-gradient(135deg, #101010, #1c1c1c)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          </div>

          {/* Identity */}
          <div className="px-5 sm:px-8 md:px-10 pb-8">
            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between -mt-14 sm:-mt-16 gap-5">
              <div className="flex flex-col gap-4 min-w-0">
                <div className="relative shrink-0 w-fit">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-secondary overflow-hidden flex items-center justify-center ring-4 ring-card shadow-xl">
                    {target.avatar_url
                      ? <SignedImg src={target.avatar_url} alt={target.username} className="w-full h-full object-cover" />
                      : <UserIcon className="h-12 w-12 text-muted-foreground" />}
                  </div>
                  {isOwn && (
                    <>
                      <button
                        onClick={() => fileInput.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
                        aria-label="Cambiar foto"
                      >
                        {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </button>
                      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                    </>
                  )}
                </div>

                <div className="min-w-0">
                  {editingName ? (
                    <div className="flex flex-wrap gap-2">
                      <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="max-w-xs" />
                      <Button size="sm" onClick={handleSaveName}>Guardar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancelar</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight truncate">
                          {target.username}
                        </h1>
                        {target.is_verified && (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-primary rounded-full" aria-label="Verificado">
                            <BadgeCheck className="w-4 h-4 text-primary-foreground" />
                          </span>
                        )}
                        {isOwn && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingName(true)}>
                            <Pencil className="h-3 w-3" /> Editar
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">
                        @{target.username} · Miembro desde {joined}
                        {target.location ? <> · <MapPin className="inline h-3.5 w-3.5 -mt-0.5" /> {target.location}</> : null}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!isOwn && (
                <div className="flex gap-2 items-center sm:mb-1 shrink-0">
                  <Button
                    onClick={toggle}
                    disabled={!canFollow || followLoading}
                    size="sm"
                    className={`px-6 h-10 rounded-full font-semibold text-sm shadow-lg ${
                      isFollowing
                        ? "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                    }`}
                  >
                    <Rss className="h-4 w-4" />
                    {isFollowing ? "Siguiendo" : "Seguir"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled
                    className="h-10 w-10 rounded-full bg-secondary/60 border border-border opacity-70"
                    aria-label="Mensaje"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Bio */}
            {target.bio && (
              <div className="mt-6">
                <p className="text-sm sm:text-base leading-relaxed text-foreground/85 max-w-2xl whitespace-pre-wrap">
                  {target.bio}
                </p>
              </div>
            )}

            {/* Socials */}
            {activeSocials.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {activeSocials.map(({ key, label, icon: Icon }) => (
                  <a
                    key={key}
                    href={target[key] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-secondary/60 hover:bg-secondary border border-border rounded-full px-3 py-1.5 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {label}
                  </a>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4 items-center py-4 border-y border-border">
              <StatInline value={formatNumber(followers)} label="Seguidores" />
              <StatInline value={formatNumber(followingCount)} label="Siguiendo" />
              <StatInline value={formatNumber(videos.length || target.total_videos)} label="Videos" />
              <StatInline value={formatNumber(target.total_views)} label="Reproducciones" />
            </div>

            {/* Tabs */}
            <div className="mt-2 flex gap-6">
              <TabBtn active={tab === "videos"} onClick={() => setTab("videos")}>
                <Film className="h-4 w-4" /> Videos
              </TabBtn>
              <TabBtn active={tab === "about"} onClick={() => setTab("about")}>
                <UserIcon className="h-4 w-4" /> Acerca de
              </TabBtn>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6">
        {tab === "videos" && (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-bold">
                Videos de <span className="text-primary">{target.username}</span>
              </h2>
              <span className="text-xs text-muted-foreground">
                Mostrando {videos.length} {videos.length === 1 ? "video" : "videos"}
              </span>
            </div>
            {videos.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-border rounded-lg">
                <Film className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Aún no hay videos publicados.</p>
              </div>
            ) : (
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {videos.map((v) => <VideoCard key={v.id} video={v} />)}
              </div>
            )}
          </>
        )}

        {tab === "about" && (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
            <div className="md:col-span-2 bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold">Acerca de {target.username}</h3>
                {isOwn && !editingAbout && (
                  <Button size="sm" variant="outline" onClick={() => setEditingAbout(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>

              {editingAbout ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bio">Biografía</Label>
                    <Textarea
                      id="bio"
                      value={form.bio}
                      maxLength={500}
                      rows={4}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      placeholder="Cuéntale a tus seguidores sobre ti..."
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">{form.bio.length}/500</p>
                  </div>
                  <div>
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      value={form.location}
                      maxLength={80}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Ciudad, país"
                    />
                  </div>
                  <div className="space-y-3 pt-2 border-t border-border">
                    <p className="text-sm font-semibold">Enlaces y redes</p>
                    {SOCIALS.map(({ key, label, placeholder, icon: Icon }) => (
                      <div key={key}>
                        <Label htmlFor={key} className="flex items-center gap-1.5 text-xs">
                          <Icon className="h-3.5 w-3.5 text-primary" /> {label}
                        </Label>
                        <Input
                          id={key}
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          placeholder={placeholder}
                          maxLength={300}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveAbout} disabled={savingAbout}>
                      {savingAbout && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingAbout(false)} disabled={savingAbout}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {target.bio ? (
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{target.bio}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {isOwn ? "Aún no has añadido una biografía. Pulsa Editar para presentarte." : "Este creador aún no ha añadido una biografía."}
                    </p>
                  )}

                  {activeSocials.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-border">
                      <p className="text-sm font-semibold mb-3">Enlaces</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {activeSocials.map(({ key, label, icon: Icon }) => (
                          <a
                            key={key}
                            href={target[key] as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm bg-secondary/40 hover:bg-secondary border border-border rounded-md px-3 py-2 transition-colors group"
                          >
                            <Icon className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{label}</span>
                            <span className="ml-auto text-xs text-muted-foreground truncate max-w-[160px] group-hover:text-foreground">
                              {(target[key] as string).replace(/^https?:\/\//, "")}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <aside className="bg-card border border-border rounded-lg p-6 space-y-3 text-sm h-fit">
              <Row label="Usuario" value={`@${target.username}`} />
              <Row label="Miembro desde" value={joined} />
              {target.location && <Row label="Ubicación" value={target.location} />}
              <Row label="Reproducciones" value={formatNumber(target.total_views)} />
              <Row label="Seguidores" value={formatNumber(followers)} />
              <Row label="Videos" value={String(videos.length)} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) => (
  <div className="bg-card/60 backdrop-blur border border-border rounded-lg px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-primary">
      {icon}
      <span className="text-lg md:text-xl font-bold leading-none">{value}</span>
    </div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">{label}</div>
  </div>
);

const StatInline = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col">
    <span className="text-foreground font-bold text-xl leading-none">{value}</span>
    <span className="text-muted-foreground text-[10px] uppercase tracking-[0.15em] font-semibold mt-1.5">{label}</span>
  </div>
);

const TabBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
      active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-right">{value}</span>
  </div>
);

export default Profile;
