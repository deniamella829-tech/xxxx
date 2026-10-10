import SignedImg from "@/components/SignedImg";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Send, X, Loader2, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export type Photo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
  uploader?: { username: string; avatar_url: string | null } | null;
};

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { username: string; avatar_url: string | null } | null;
};

export default function PhotoDetailModal({
  photo,
  onClose,
  onDeleted,
}: {
  photo: Photo;
  onClose: () => void;
  onDeleted?: (id: string) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busyLike, setBusyLike] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingC, setLoadingC] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ count }, mine] = await Promise.all([
        supabase.from("photo_reactions").select("*", { count: "exact", head: true }).eq("photo_id", photo.id),
        user
          ? supabase.from("photo_reactions").select("user_id").eq("photo_id", photo.id).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null } as { data: null }),
      ]);
      setLikes(count ?? 0);
      setLiked(!!mine.data);
    })();
    loadComments();
  }, [photo.id, user]);

  const loadComments = async () => {
    setLoadingC(true);
    const { data } = await supabase
      .from("photo_comments")
      .select("*")
      .eq("photo_id", photo.id)
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((c) => c.user_id)));
    const map = new Map<string, { username: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      (profs ?? []).forEach((p) => map.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
    }
    setComments((data ?? []).map((c) => ({ ...c, author: map.get(c.user_id) ?? null })));
    setLoadingC(false);
  };

  const requireAuth = () => {
    if (!user) {
      toast.error("Inicia sesión para interactuar");
      navigate("/auth");
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    if (!requireAuth() || busyLike) return;
    setBusyLike(true);
    if (liked) {
      const { error } = await supabase.from("photo_reactions").delete()
        .eq("photo_id", photo.id).eq("user_id", user!.id);
      if (!error) { setLiked(false); setLikes((n) => Math.max(0, n - 1)); }
    } else {
      const { error } = await supabase.from("photo_reactions").insert({
        photo_id: photo.id, user_id: user!.id,
      });
      if (!error) { setLiked(true); setLikes((n) => n + 1); }
    }
    setBusyLike(false);
  };

  const submitComment = async () => {
    if (!requireAuth()) return;
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    const { error } = await supabase.from("photo_comments").insert({
      photo_id: photo.id, user_id: user!.id, content,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    loadComments();
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("photo_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setComments((cs) => cs.filter((c) => c.id !== id));
  };

  const deletePhoto = async () => {
    if (!user || user.id !== photo.user_id) return;
    if (!confirm("¿Eliminar esta foto?")) return;
    const { error } = await supabase.from("photos").delete().eq("id", photo.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Foto eliminada");
    onDeleted?.(photo.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-5xl bg-card rounded-lg overflow-hidden flex flex-col md:flex-row max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white">
          <X className="h-5 w-5" />
        </button>

        <div className="md:flex-1 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0 max-h-[60vh] md:max-h-none">
          <img src={photo.image_url} alt={photo.title} className="max-w-full max-h-full object-contain" />
        </div>

        <div className="md:w-96 flex flex-col border-l border-border max-h-[55vh] md:max-h-none">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <Link
                to={photo.uploader ? `/u/${photo.uploader.username}` : "#"}
                className="flex items-center gap-2 min-w-0"
              >
                {photo.uploader?.avatar_url ? (
                  <SignedImg src={photo.uploader.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">@{photo.uploader?.username ?? "usuario"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(photo.created_at).toLocaleDateString()}</p>
                </div>
              </Link>
              {user?.id === photo.user_id && (
                <button onClick={deletePhoto} className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-secondary">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {photo.title && <h3 className="font-bold mt-3">{photo.title}</h3>}
            {photo.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{photo.description}</p>}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={toggleLike}
                disabled={busyLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  liked ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"
                }`}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                {likes}
              </button>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4" /> {comments.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingC ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sé el primero en comentar.</p>
            ) : comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                {c.author?.avatar_url ? (
                  <SignedImg src={c.author.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-secondary shrink-0 flex items-center justify-center">
                    <UserIcon className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold">@{c.author?.username ?? "usuario"}</span>{" "}
                    <span className="text-muted-foreground">· {new Date(c.created_at).toLocaleDateString()}</span>
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
                </div>
                {user?.id === c.user_id && (
                  <button onClick={() => deleteComment(c.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border">
            {user ? (
              <div className="flex items-end gap-2">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribe un comentario..."
                  rows={1}
                  maxLength={500}
                  className="min-h-[40px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); }
                  }}
                />
                <Button size="sm" onClick={submitComment} disabled={posting || !text.trim()}>
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => navigate("/auth")}>Inicia sesión para comentar</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
