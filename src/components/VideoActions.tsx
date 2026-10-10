import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThumbsUp, ThumbsDown, Heart, Plus, Share2, Flag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Counts = { likes: number; dislikes: number };
type MyState = { reaction: "like" | "dislike" | null; favorited: boolean };

export default function VideoActions({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts>({ likes: 0, dislikes: 0 });
  const [me, setMe] = useState<MyState>({ reaction: null, favorited: false });
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Contenido inapropiado");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: rx }, mine, fav] = await Promise.all([
        supabase.from("video_reactions").select("reaction").eq("video_id", videoId),
        user
          ? supabase.from("video_reactions").select("reaction").eq("video_id", videoId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null } as { data: null }),
        user
          ? supabase.from("video_favorites").select("video_id").eq("video_id", videoId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null } as { data: null }),
      ]);
      const likes = (rx ?? []).filter((r) => r.reaction === "like").length;
      const dislikes = (rx ?? []).filter((r) => r.reaction === "dislike").length;
      setCounts({ likes, dislikes });
      setMe({
        reaction: (mine.data?.reaction as MyState["reaction"]) ?? null,
        favorited: !!fav.data,
      });
    })();
  }, [videoId, user]);

  const requireAuth = () => {
    if (!user) {
      toast.error("Regístrate para interactuar");
      navigate("/auth");
      return false;
    }
    return true;
  };

  const react = async (kind: "like" | "dislike") => {
    if (!requireAuth() || busy) return;
    setBusy(true);
    const prev = me.reaction;
    if (prev === kind) {
      // remove
      const { error } = await supabase.from("video_reactions").delete()
        .eq("video_id", videoId).eq("user_id", user!.id);
      if (!error) {
        setMe({ ...me, reaction: null });
        setCounts((c) => ({ ...c, [kind === "like" ? "likes" : "dislikes"]: Math.max(0, c[kind === "like" ? "likes" : "dislikes"] - 1) }));
      }
    } else {
      const { error } = await supabase.from("video_reactions")
        .upsert({ video_id: videoId, user_id: user!.id, reaction: kind }, { onConflict: "video_id,user_id" });
      if (!error) {
        setMe({ ...me, reaction: kind });
        setCounts((c) => {
          const next = { ...c };
          if (kind === "like") {
            next.likes += 1;
            if (prev === "dislike") next.dislikes = Math.max(0, next.dislikes - 1);
          } else {
            next.dislikes += 1;
            if (prev === "like") next.likes = Math.max(0, next.likes - 1);
          }
          return next;
        });
      }
    }
    setBusy(false);
  };

  const toggleFav = async () => {
    if (!requireAuth() || busy) return;
    setBusy(true);
    if (me.favorited) {
      await supabase.from("video_favorites").delete().eq("video_id", videoId).eq("user_id", user!.id);
      setMe({ ...me, favorited: false });
      toast.success("Quitado de favoritos");
    } else {
      await supabase.from("video_favorites").insert({ video_id: videoId, user_id: user!.id });
      setMe({ ...me, favorited: true });
      toast.success("Añadido a favoritos");
    }
    setBusy(false);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: document.title });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado");
      }
    } catch { /* cancel */ }
  };

  const submitReport = async () => {
    if (!requireAuth()) return;
    setReporting(true);
    const { error } = await supabase.from("video_reports").insert({
      video_id: videoId, user_id: user!.id,
      reason: reportReason, details: reportDetails.trim() || null,
    });
    setReporting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Reporte enviado. Gracias.");
    setReportOpen(false); setReportDetails("");
  };

  const Btn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70 text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-secondary rounded-full overflow-hidden">
          <button
            onClick={() => react("like")}
            className={`flex items-center gap-1.5 pl-4 pr-3 py-2 text-sm font-semibold transition-colors ${
              me.reaction === "like" ? "text-primary" : "hover:text-primary"
            }`}
          >
            <ThumbsUp className={`h-4 w-4 ${me.reaction === "like" ? "fill-current" : ""}`} />
            {counts.likes}
          </button>
          <span className="h-5 w-px bg-border" />
          <button
            onClick={() => react("dislike")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${
              me.reaction === "dislike" ? "text-destructive" : "hover:text-destructive"
            }`}
          >
            <ThumbsDown className={`h-4 w-4 ${me.reaction === "dislike" ? "fill-current" : ""}`} />
            {counts.dislikes > 0 && counts.dislikes}
          </button>
        </div>

        <Btn active={me.favorited} onClick={toggleFav} title="Favoritos">
          <Heart className={`h-4 w-4 ${me.favorited ? "fill-current" : ""}`} /> Favoritos
        </Btn>
        <Btn onClick={() => requireAuth() && toggleFav()} title="Añadir a">
          <Plus className="h-4 w-4" /> Añadir a
        </Btn>
        <Btn onClick={share} title="Compartir">
          <Share2 className="h-4 w-4" /> Compartir
        </Btn>
        <Btn onClick={() => requireAuth() && setReportOpen(true)} title="Informar">
          <Flag className="h-4 w-4" /> Informe
        </Btn>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informar este video</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Motivo</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm"
              >
                <option>Contenido inapropiado</option>
                <option>Contenido ilegal</option>
                <option>Menores de edad</option>
                <option>Spam o engaño</option>
                <option>Derechos de autor</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Detalles (opcional)</label>
              <Textarea
                maxLength={1000}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Cuéntanos más…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancelar</Button>
            <Button onClick={submitReport} disabled={reporting}>
              {reporting && <Loader2 className="h-4 w-4 animate-spin" />} Enviar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
