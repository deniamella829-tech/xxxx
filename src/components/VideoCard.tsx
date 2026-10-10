import SignedImg from "@/components/SignedImg";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Play, Clock, User as UserIcon, Pencil } from "lucide-react";
import { useSignedMediaUrl } from "@/lib/media";
import { useAuth } from "@/hooks/use-auth";
import EditVideoModal from "./EditVideoModal";


export type Video = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  views: number;
  created_at: string;
  user_id: string | null;
  tags?: string[] | null;
  duration_seconds?: number | null;
  monetized?: boolean;
  thumbnail_url?: string | null;
  uploader?: { username: string; avatar_url: string | null } | null;
};

function formatNumber(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + "K";
  return (n / 1_000_000).toFixed(1) + "M";
}

const VideoCard = ({ video }: { video: Video }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hovering, setHovering] = useState(false);
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState<Video>(video);
  useEffect(() => setCurrent(video), [video]);
  const previewRef = useRef<HTMLVideoElement>(null);
  const src = useSignedMediaUrl(current.video_url);
  const poster = useSignedMediaUrl(current.thumbnail_url ?? null);
  const isOwner = !!(user && current.user_id && user.id === current.user_id);
  const [deleted, setDeleted] = useState(false);


  useEffect(() => {
    const v = previewRef.current;
    if (!v) return;
    if (hovering) { v.currentTime = 0; v.play().catch(() => {}); } else { v.pause(); }
  }, [hovering]);

  const timeAgo = (() => {
    const diff = Date.now() - new Date(current.created_at).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "ahora";
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.floor(h / 24)} d`;
  })();

  const goWatch = () => navigate(`/v/${current.id}`);

  if (deleted) return null;

  return (
    <>
    <article
      className="group cursor-pointer"
      onClick={goWatch}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative aspect-video bg-black overflow-hidden rounded-md">
        <video ref={previewRef} src={src || undefined} poster={poster || undefined} muted playsInline preload="metadata" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-primary/90 rounded-full p-3">
            <Play className="h-6 w-6 text-primary-foreground fill-current" />
          </div>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="absolute top-2 right-2 bg-black/70 hover:bg-primary text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Editar video"
            aria-label="Editar video"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
          <Eye className="h-3 w-3" /> {formatNumber(current.views)}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {current.uploader && (
          <Link
            to={`/u/${current.uploader.username}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary"
          >
            {current.uploader.avatar_url
              ? <SignedImg src={current.uploader.avatar_url} alt={current.uploader.username} className="w-full h-full object-cover" />
              : <UserIcon className="h-4 w-4 text-muted-foreground" />}
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {current.title}
          </h3>
          {current.uploader ? (
            <Link
              to={`/u/${current.uploader.username}`}
              onClick={(e) => e.stopPropagation()}
              className="block mt-0.5 text-xs font-medium text-foreground/80 hover:text-primary"
            >
              @{current.uploader.username}
            </Link>
          ) : (
            <span className="block mt-0.5 text-xs font-medium text-muted-foreground">Anónimo</span>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatNumber(current.views)} {current.views === 1 ? "visita" : "visitas"}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo}</span>
          </div>
          {current.tags && current.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {current.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
    {editing && user && (
      <EditVideoModal
        video={current}
        userId={user.id}
        onClose={() => setEditing(false)}
        onUpdated={(patch) => setCurrent((c) => ({ ...c, ...patch }))}
        onDeleted={() => setDeleted(true)}
      />
    )}
    </>
  );
};

export default VideoCard;

