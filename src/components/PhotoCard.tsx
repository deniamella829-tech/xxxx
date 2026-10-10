import SignedImg from "@/components/SignedImg";
import { Heart, MessageCircle, User as UserIcon } from "lucide-react";
import type { Photo } from "./PhotoDetailModal";

export default function PhotoCard({
  photo,
  likes,
  comments,
  onClick,
}: {
  photo: Photo;
  likes: number;
  comments: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-lg bg-secondary/40 aspect-square text-left"
    >
      <img
        src={photo.image_url}
        alt={photo.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-xs mb-1">
          {photo.uploader?.avatar_url ? (
            <SignedImg src={photo.uploader.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <UserIcon className="h-3 w-3" />
            </div>
          )}
          <span className="truncate font-semibold">@{photo.uploader?.username ?? "usuario"}</span>
        </div>
        {photo.title && <p className="text-sm font-bold line-clamp-1 mb-1">{photo.title}</p>}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {likes}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {comments}</span>
        </div>
      </div>
    </button>
  );
}
