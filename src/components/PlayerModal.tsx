import { Eye, X } from "lucide-react";
import type { Video } from "./VideoCard";
import { useSignedMediaUrl } from "@/lib/media";

const PlayerModal = ({
  video, views, onPlay, onClose,
}: { video: Video; views: number; onPlay: () => void; onClose: () => void }) => {
  const src = useSignedMediaUrl(video.video_url);
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-4xl bg-card rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 rounded-full p-2">
          <X className="h-5 w-5" />
        </button>
        <video src={src || undefined} controls autoPlay onPlay={onPlay} className="w-full aspect-video bg-black" />
        <div className="p-4">
          <h2 className="text-lg font-bold">{video.title}</h2>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">{views.toLocaleString()}</span>
            <span>{views === 1 ? "persona ha visto" : "personas han visto"} este video</span>
          </div>
          {video.description && (
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{video.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;
