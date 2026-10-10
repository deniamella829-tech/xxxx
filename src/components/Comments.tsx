import SignedImg from "@/components/SignedImg";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MessageCircle, Trash2, User as UserIcon, LogIn } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author?: { username: string; avatar_url: string | null } | null;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString();
};

export default function Comments({ videoId }: { videoId: string }) {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: cs } = await supabase
      .from("video_comments")
      .select("id,content,created_at,user_id")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (cs ?? []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    const map = new Map<string, { username: string; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      (profs ?? []).forEach((p) => map.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
    }
    setComments(list.map((c) => ({ ...c, author: map.get(c.user_id) ?? null })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [videoId]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Regístrate para comentar");
      navigate("/auth");
      return;
    }
    const clean = text.trim();
    if (!clean) return;
    if (clean.length > 1000) { toast.error("Máximo 1000 caracteres"); return; }
    setPosting(true);
    const { data, error } = await supabase
      .from("video_comments")
      .insert({ video_id: videoId, user_id: user.id, content: clean })
      .select("id,content,created_at,user_id")
      .single();
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    setComments((prev) => [{
      ...(data as Comment),
      author: profile ? { username: profile.username, avatar_url: profile.avatar_url } : null,
    }, ...prev]);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("video_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        Comentarios <span className="text-muted-foreground text-sm font-normal">({comments.length})</span>
      </h2>

      <div className="bg-card border border-border rounded-lg p-3">
        {authLoading ? (
          <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : user ? (
          <div className="flex gap-3">
            <div className="shrink-0 w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
              {profile?.avatar_url
                ? <SignedImg src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                : <UserIcon className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Añade un comentario público…"
                maxLength={1000}
                rows={2}
                className="resize-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{text.length}/1000</span>
                <div className="flex gap-2">
                  {text && (
                    <Button variant="ghost" size="sm" onClick={() => setText("")}>Cancelar</Button>
                  )}
                  <Button size="sm" disabled={posting || !text.trim()} onClick={handleSubmit}>
                    {posting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Comentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Inicia sesión para comentar</p>
              <p className="text-xs text-muted-foreground">Solo los usuarios registrados pueden dejar comentarios.</p>
            </div>
            <Button onClick={() => navigate("/auth")} size="sm">
              <LogIn className="h-4 w-4" /> Registrarse / Entrar
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">Sé el primero en comentar.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.author ? (
                <Link to={`/u/${c.author.username}`} className="shrink-0 w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary">
                  {c.author.avatar_url
                    ? <SignedImg src={c.author.avatar_url} alt={c.author.username} className="w-full h-full object-cover" />
                    : <UserIcon className="h-4 w-4 text-muted-foreground" />}
                </Link>
              ) : (
                <div className="shrink-0 w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  {c.author ? (
                    <Link to={`/u/${c.author.username}`} className="font-semibold hover:text-primary">@{c.author.username}</Link>
                  ) : (
                    <span className="font-semibold text-muted-foreground">@usuario</span>
                  )}
                  <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">{c.content}</p>
              </div>
              {user && user.id === c.user_id && (
                <button
                  onClick={() => remove(c.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive p-1"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
