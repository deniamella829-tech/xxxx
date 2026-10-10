import { useEffect, useState, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, X, Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import { useSignedMediaUrl } from "@/lib/media";
import type { Video } from "./VideoCard";

type Props = {
  video: Video;
  userId: string;
  onClose: () => void;
  onUpdated?: (v: Partial<Video> & { id: string }) => void;
  onDeleted?: (id: string) => void;
};

const EditVideoModal = ({ video, userId, onClose, onUpdated, onDeleted }: Props) => {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [tags, setTags] = useState<string[]>(video.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const currentCover = useSignedMediaUrl(video.thumbnail_url ?? null);

  useEffect(() => {
    if (!coverFile) { setCoverPreview(null); return; }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, "").replace(/[^a-z0-9áéíóúñ_-]/gi, "");
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags([...tags, t]);
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); setTagInput(""); }
    else if (e.key === "Backspace" && !tagInput && tags.length) setTags(tags.slice(0, -1));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("El título no puede estar vacío"); return; }
    setSaving(true);
    try {
      let thumbnail_url = video.thumbnail_url ?? null;
      if (coverFile) {
        const cext = (coverFile.name.split(".").pop() || "jpg").toLowerCase();
        const cpath = `${userId}/${crypto.randomUUID()}.${cext}`;
        const { error: cErr } = await supabase.storage.from("videos").upload(cpath, coverFile, { contentType: coverFile.type });
        if (cErr) throw cErr;
        thumbnail_url = supabase.storage.from("videos").getPublicUrl(cpath).data.publicUrl;
      }
      const finalTags = [...tags];
      if (tagInput.trim()) {
        const t = tagInput.trim().toLowerCase().replace(/^#/, "");
        if (t && !finalTags.includes(t)) finalTags.push(t);
      }
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        tags: finalTags,
        thumbnail_url,
      };
      const { error } = await supabase.from("videos").update(payload).eq("id", video.id).eq("user_id", userId);
      if (error) throw error;
      toast.success("Video actualizado");
      onUpdated?.({ id: video.id, ...payload });
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este video? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("videos").delete().eq("id", video.id).eq("user_id", userId);
      if (error) throw error;
      toast.success("Video eliminado");
      onDeleted?.(video.id);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-card rounded-lg p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-secondary rounded">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Pencil className="h-5 w-5 text-primary" /> Editar video
        </h2>
        <form onSubmit={handleSave} className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

          <div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-secondary/40 border border-border rounded-md min-h-[42px]">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                  #{t}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKey}
                placeholder={tags.length ? "" : "Etiquetas (Enter)"}
                className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Máx 10. Enter o coma para añadir.</p>
          </div>

          <div className="space-y-2 p-3 border border-border rounded-md bg-secondary/20">
            <label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Portada
            </label>
            {(coverPreview || currentCover) && (
              <img src={coverPreview || currentCover || ""} alt="Portada" className="w-full aspect-video object-cover rounded-md" />
            )}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
              <div className="cursor-pointer text-center text-sm py-2 px-3 border border-border rounded-md hover:bg-secondary transition-colors">
                <ImageIcon className="h-4 w-4 inline mr-1" /> {coverFile ? "Cambiar imagen" : "Elegir nueva portada"}
              </div>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving || deleting} className="flex-1" size="lg">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : "Guardar cambios"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={saving || deleting}
              onClick={handleDelete}
              title="Eliminar video"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVideoModal;
