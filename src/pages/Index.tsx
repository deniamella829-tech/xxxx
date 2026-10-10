import SignedImg from "@/components/SignedImg";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Search, Loader2, User as UserIcon, LogIn, Menu, Video as VideoIcon, Camera, ChevronDown } from "lucide-react";
import VideoCard, { type Video } from "@/components/VideoCard";
import UploadModal from "@/components/UploadModal";
import PhotoUploadModal from "@/components/PhotoUploadModal";
import PhotoCard from "@/components/PhotoCard";
import PhotoDetailModal, { type Photo } from "@/components/PhotoDetailModal";
import Sidebar, { type SidebarFilter } from "@/components/Sidebar";
import RecommendedRow from "@/components/RecommendedRow";
import { useIsAdmin } from "@/hooks/use-is-admin";

type Category = "inicio" | "recientes" | "mas-vistos" | "tendencias" | "recomendados";

const CATEGORIES: { id: Category; label: string; hasMenu?: boolean }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "recientes", label: "Vídeos", hasMenu: true },
  { id: "mas-vistos", label: "Categorías", hasMenu: true },
  { id: "tendencias", label: "Tendencias" },
  { id: "recomendados", label: "Recomendados" },
  { id: "inicio", label: "Estrellas", hasMenu: true },
  { id: "inicio", label: "Comunidad" },
  { id: "inicio", label: "Fotos y GIFs", hasMenu: true },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [category, setCategory] = useState<Category>("inicio");
  const [sideFilter, setSideFilter] = useState<SidebarFilter | null>(null);
  const [activeNav, setActiveNav] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoStats, setPhotoStats] = useState<Record<string, { likes: number; comments: number }>>({});
  const [openPhoto, setOpenPhoto] = useState<Photo | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const requireAuth = (action: () => void) => {
    if (!user) { navigate("/auth"); return; }
    action();
  };

  const loadVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const ids = Array.from(new Set((data ?? []).map((v) => v.user_id).filter(Boolean) as string[]));
    const profMap = new Map<string, { username: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      (profs ?? []).forEach((p) => profMap.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
    }
    setVideos((data ?? []).map((v) => ({ ...v, uploader: v.user_id ? profMap.get(v.user_id) ?? null : null })) as Video[]);
    setLoading(false);
  };

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const ids = Array.from(new Set((data ?? []).map((p) => p.user_id)));
    const map = new Map<string, { username: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      (profs ?? []).forEach((p) => map.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
    }
    const list = (data ?? []).map((p) => ({ ...p, uploader: map.get(p.user_id) ?? null })) as Photo[];
    setPhotos(list);
    if (list.length) {
      const photoIds = list.map((p) => p.id);
      const [{ data: rx }, { data: cm }] = await Promise.all([
        supabase.from("photo_reactions").select("photo_id").in("photo_id", photoIds),
        supabase.from("photo_comments").select("photo_id").in("photo_id", photoIds),
      ]);
      const stats: Record<string, { likes: number; comments: number }> = {};
      list.forEach((p) => { stats[p.id] = { likes: 0, comments: 0 }; });
      (rx ?? []).forEach((r) => { if (stats[r.photo_id]) stats[r.photo_id].likes += 1; });
      (cm ?? []).forEach((c) => { if (stats[c.photo_id]) stats[c.photo_id].comments += 1; });
      setPhotoStats(stats);
    } else {
      setPhotoStats({});
    }
  };

  useEffect(() => {
    document.title = "X Pornazo — Sube y mira videos";
    loadVideos();
    loadPhotos();
    const channel = supabase
      .channel("videos-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () => loadVideos())
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, () => loadPhotos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = (() => {
    let list = videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase()));
    const now = Date.now();
    if (sideFilter?.keyword) {
      const norm = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const kw = norm(sideFilter.keyword);
      list = list.filter((v) =>
        norm(v.title).includes(kw) ||
        norm(v.description ?? "").includes(kw) ||
        (v.tags ?? []).some((t) => norm(t).includes(kw))
      );
    }
    if (sideFilter?.shortsOnly) {
      list = list.filter((v) => (v.duration_seconds ?? 999) <= 60);
    }
    const effectiveSort = sideFilter?.sort ?? category;
    switch (effectiveSort) {
      case "recientes":
        list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "mas-vistos":
        list = [...list].sort((a, b) => b.views - a.views);
        break;
      case "tendencias": {
        const score = (v: Video) => v.views / Math.max(1, (now - new Date(v.created_at).getTime()) / 3_600_000);
        list = [...list].sort((a, b) => score(b) - score(a));
        break;
      }
      case "recomendados": {
        const score = (v: Video) => Math.log(v.views + 1) * 10 - Math.max(1, (now - new Date(v.created_at).getTime()) / 86_400_000) * 0.5;
        list = [...list].sort((a, b) => score(b) - score(a));
        break;
      }
      default:
        list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  })();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-header border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 -ml-2 text-foreground hover:text-primary transition-colors"
            aria-label="Menú"
          >
            <Menu className="h-6 w-6" />
          </button>

          <a
            href="/"
            onClick={(e) => { e.preventDefault(); window.location.assign("/"); }}
            className="flex items-center gap-1 shrink-0"
          >
            <span className="text-2xl sm:text-3xl font-extrabold text-primary leading-none">X</span>
            <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">Pornazo</span>
          </a>

          <div className="hidden md:flex flex-1 items-center max-w-2xl mx-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                ref={searchRef}
                placeholder="Buscar en X Pornazo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-12 h-10 bg-secondary/70 border border-border rounded-full focus-visible:ring-1 focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => searchRef.current?.focus()}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="md:hidden flex-1" />

          <Button
            onClick={() => user ? setShowUpload(true) : navigate("/auth")}
            className="rounded-full font-bold px-3 sm:px-4 h-10 shrink-0 shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.4)]"
          >
            <Upload className="h-4 w-4" /> <span className="hidden md:inline">Subir</span>
          </Button>

          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => requireAuth(() => setShowUpload(true))}
              className="relative h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/80 hover:text-primary transition-colors"
              aria-label="Subir vídeo"
              title="Subir vídeo"
            >
              <VideoIcon className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">+</span>
            </button>
            <button
              type="button"
              onClick={() => requireAuth(() => setShowPhotoUpload(true))}
              className="relative h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/80 hover:text-primary transition-colors"
              aria-label="Subir foto"
              title="Subir foto"
            >
              <Camera className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">+</span>
            </button>
            <a
              href="https://x.com/xpornazo?s=21"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/80 hover:text-primary transition-colors"
              aria-label="Síguenos en X (Twitter)"
              title="Síguenos en X"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/>
              </svg>
            </a>
          </div>

          {user && profile ? (
            <Link
              to={`/u/${profile.username}`}
              className="shrink-0 w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary transition"
              title={`@${profile.username}`}
            >
              {profile.avatar_url
                ? <SignedImg src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                : <UserIcon className="h-5 w-5 text-muted-foreground" />}
            </Link>
          ) : (
            <Link to="/auth" className="shrink-0">
              <Button variant="ghost" size="sm" className="rounded-full">
                <LogIn className="h-4 w-4" /> <span className="hidden md:inline">Entrar</span>
              </Button>
            </Link>
          )}
        </div>

        <div className="md:hidden container mx-auto px-3 pb-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar en X Pornazo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-4 h-10 bg-secondary/70 border border-border rounded-full focus-visible:ring-1 focus-visible:ring-primary w-full"
            />
          </div>
        </div>

        <nav className="bg-header">
          <div className="container mx-auto px-3 sm:px-4 h-11 flex items-center justify-start md:justify-center gap-1 md:gap-2 overflow-x-auto no-scrollbar text-xs sm:text-sm font-bold uppercase tracking-wide">
            {CATEGORIES.map((c, i) => {
              const active = activeNav === i;
              return (
                <button
                  key={`${c.label}-${i}`}
                  type="button"
                  onClick={() => {
                    setActiveNav(i);
                    setCategory(c.id);
                    setSearch("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`relative h-11 px-3 md:px-4 flex items-center gap-1 whitespace-nowrap transition-colors ${
                    active ? "text-primary" : "text-foreground/80 hover:text-primary"
                  }`}
                >
                  {c.label}
                  {c.hasMenu && <ChevronDown className="h-3 w-3 opacity-70" />}
                  {active && <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="w-full px-3 sm:px-4 flex gap-4 relative">
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-background/60 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <div
          className={`${
            mobileMenuOpen
              ? "fixed top-0 left-0 bottom-0 z-40 w-64 bg-card overflow-y-auto pt-4 shadow-2xl"
              : "hidden"
          } lg:static lg:block lg:w-60 lg:bg-transparent lg:shadow-none lg:overflow-visible lg:pt-0`}
        >
        <Sidebar
          loggedIn={!!user}
          isAdmin={isAdmin}
          onSelectFilter={(f) => {
            setSideFilter(f);
            if (f.sort) setCategory(f.sort as Category);
            setSearch("");
            setMobileMenuOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        </div>

        <main className="flex-1 min-w-0 py-4 sm:py-6">
          {sideFilter?.mode === "fotos" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h1 className="text-lg sm:text-xl font-bold truncate min-w-0">{sideFilter.label}</h1>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setSideFilter(null); setCategory("inicio"); }}
                    className="text-xs text-muted-foreground hover:text-primary underline"
                  >
                    Limpiar filtro
                  </button>
                  <Button
                    size="sm"
                    onClick={() => user ? setShowPhotoUpload(true) : navigate("/auth")}
                    className="rounded-full"
                  >
                    <Camera className="h-4 w-4" /> <span className="hidden sm:inline">Subir foto</span>
                  </Button>
                  <span className="text-xs sm:text-sm text-muted-foreground">{photos.length} fotos</span>
                </div>
              </div>
              {(() => {
                let list = [...photos];
                if (sideFilter.photoSort === "mas-vistas") {
                  list.sort((a, b) => (photoStats[b.id]?.likes ?? 0) - (photoStats[a.id]?.likes ?? 0));
                } else if (sideFilter.photoSort === "recomendadas") {
                  list.sort((a, b) => {
                    const sa = (photoStats[a.id]?.likes ?? 0) + (photoStats[a.id]?.comments ?? 0);
                    const sb = (photoStats[b.id]?.likes ?? 0) + (photoStats[b.id]?.comments ?? 0);
                    return sb - sa;
                  });
                }
                if (list.length === 0) {
                  return (
                    <div className="text-center py-20">
                      <p className="text-muted-foreground mb-4">Aún no hay fotos.</p>
                      <Button onClick={() => user ? setShowPhotoUpload(true) : navigate("/auth")}>
                        <Camera className="h-4 w-4" /> Sube la primera
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {list.map((p) => (
                      <PhotoCard
                        key={p.id}
                        photo={p}
                        likes={photoStats[p.id]?.likes ?? 0}
                        comments={photoStats[p.id]?.comments ?? 0}
                        onClick={() => setOpenPhoto(p)}
                      />
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h1 className="text-lg sm:text-xl font-bold truncate min-w-0 max-w-full">
                  {search
                    ? `Resultados: "${search}"`
                    : sideFilter?.label ?? CATEGORIES.find((c) => c.id === category)?.label}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {sideFilter && (
                    <button
                      type="button"
                      onClick={() => { setSideFilter(null); setCategory("inicio"); }}
                      className="text-xs text-muted-foreground hover:text-primary underline"
                    >
                      Limpiar filtro
                    </button>
                  )}
                  <span className="text-xs sm:text-sm text-muted-foreground">{filtered.length} videos</span>
                </div>
              </div>
              {!search && !sideFilter && category === "inicio" && !loading && videos.length > 0 && (
                <RecommendedRow videos={videos} />
              )}
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground mb-4">No hay videos todavía.</p>
                  <Button onClick={() => user ? setShowUpload(true) : navigate("/auth")}>
                    <Upload className="h-4 w-4" /> Sube el primero
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filtered.map((v) => <VideoCard key={v.id} video={v} />)}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {showUpload && user && <UploadModal userId={user.id} onClose={() => setShowUpload(false)} />}
      {showPhotoUpload && user && (
        <PhotoUploadModal userId={user.id} onClose={() => setShowPhotoUpload(false)} onUploaded={loadPhotos} />
      )}
      {openPhoto && (
        <PhotoDetailModal
          photo={openPhoto}
          onClose={() => setOpenPhoto(null)}
          onDeleted={() => loadPhotos()}
        />
      )}
    </div>
  );
};

export default Index;
