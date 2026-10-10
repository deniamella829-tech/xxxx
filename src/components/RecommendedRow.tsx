import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Eye, ThumbsUp, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import type { Video } from "./VideoCard";
import { useSignedMediaUrl } from "@/lib/media";

function fmt(n: number) {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + "K";
  return (n / 1_000_000).toFixed(1) + "M";
}

function fmtDuration(s?: number | null) {
  if (!s || s <= 0) return null;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

// Deterministic daily shuffle: same order all day, changes each day
function dailyShuffle<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const today = new Date();
  const seed = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const scored = arr.map((item) => {
    const str = seed + "|" + keyFn(item);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return { item, score: h >>> 0 };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.item);
}

const Card = ({ v }: { v: Video }) => {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const src = useSignedMediaUrl(v.video_url);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (hover) { el.currentTime = 0; el.play().catch(() => {}); } else { el.pause(); }
  }, [hover]);
  const dur = fmtDuration(v.duration_seconds);
  return (
    <div
      onClick={() => navigate(`/v/${v.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="snap-start shrink-0 w-[170px] cursor-pointer group"
    >
      <div className="relative aspect-[9/13] bg-black rounded-md overflow-hidden">
        <video ref={ref} src={src || undefined} muted playsInline preload="metadata" className="w-full h-full object-cover" />
        {dur && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {dur}
          </span>
        )}
      </div>
      <h3 className="mt-1.5 text-[13px] font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
        {v.title}
      </h3>
      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{fmt(v.views)} Vistas</span>
        <span className="flex items-center gap-0.5 text-primary"><ThumbsUp className="h-3 w-3" />{fmt(Math.max(1, Math.floor(v.views * 0.02)))}</span>
      </div>
      {v.uploader && (
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-foreground/80">
          <span className="truncate">{v.uploader.username}</span>
          <BadgeCheck className="h-3 w-3 text-primary shrink-0" />
        </div>
      )}
    </div>
  );
};

export default function RecommendedRow({ videos }: { videos: Video[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // One video per uploader (most-viewed of each), shuffled daily
  const list = (() => {
    const byUser = new Map<string, Video>();
    for (const v of videos) {
      const key = v.user_id ?? `anon-${v.id}`;
      const cur = byUser.get(key);
      if (!cur || v.views > cur.views) byUser.set(key, v);
    }
    return dailyShuffle(Array.from(byUser.values()), (v) => v.id).slice(0, 24);
  })();

  if (list.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  };

  return (
    <section className="mb-6 -mx-3 sm:-mx-4 px-3 sm:px-4 relative group/row overflow-hidden">
      <h2 className="text-lg font-bold mb-3">Recomendados Para Ti</h2>
      <button
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 border border-border opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x scroll-pl-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((v) => <Card key={v.id} v={v} />)}
      </div>
      <button
        onClick={() => scroll(1)}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 border border-border opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
        aria-label="Siguiente"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}
