import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon, Wand2 } from "lucide-react";

const UploadModal = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!file) { setVideoPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  const captureFrame = async () => {
    if (!videoPreviewUrl) { toast.error("Selecciona primero el video"); return; }
    setCapturing(true);
    try {
      const v = document.createElement("video");
      v.src = videoPreviewUrl;
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        v.onloadedmetadata = () => resolve();
        v.onerror = () => reject(new Error("No se pudo leer el video"));
      });
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
      await new Promise<void>((resolve, reject) => {
        v.onseeked = () => resolve();
        v.onerror = () => reject(new Error("No se pudo capturar el frame"));
      });
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Sin blob"))), "image/jpeg", 0.85)
      );
      setCoverFile(new File([blob], "cover.jpg", { type: "image/jpeg" }));
      toast.success("Portada capturada del video");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCapturing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      toast.error("Añade un título y selecciona un video");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("videos").getPublicUrl(path);

      let thumbnailUrl: string | null = null;
      if (coverFile) {
        const cext = (coverFile.name.split(".").pop() || "jpg").toLowerCase();
        const cpath = `${userId}/${crypto.randomUUID()}.${cext}`;
        const { error: cErr } = await supabase.storage.from("videos").upload(cpath, coverFile, { contentType: coverFile.type });
        if (cErr) throw cErr;
        thumbnailUrl = supabase.storage.from("videos").getPublicUrl(cpath).data.publicUrl;
      }

      const finalTags = [...tags];
      if (tagInput.trim()) {
        const t = tagInput.trim().toLowerCase().replace(/^#/, "");
        if (t && !finalTags.includes(t)) finalTags.push(t);
      }
      const { error: insErr } = await supabase.from("videos").insert({
        title: title.trim(),
        description: description.trim() || null,
        video_url: pub.publicUrl,
        storage_path: path,
        user_id: userId,
        tags: finalTags,
        thumbnail_url: thumbnailUrl,
      });
      if (insErr) throw insErr;
      toast.success("¡Video publicado!");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-card rounded-lg p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-secondary rounded">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Subir un video
        </h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <Input placeholder="Título del video" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
                placeholder={tags.length ? "" : "Etiquetas (presiona Enter)"}
                className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Presiona Enter o coma para añadir. Máx 10.</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Video</label>
            <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>

          <div className="space-y-2 p-3 border border-border rounded-md bg-secondary/20">
            <label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Portada del video
            </label>
            {coverPreview ? (
              <div className="relative">
                <img src={coverPreview} alt="Portada" className="w-full aspect-video object-cover rounded-md" />
                <button
                  type="button"
                  onClick={() => setCoverFile(null)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 p-1 rounded"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Elige una imagen o captura un frame del video. Si no eliges, se usará una vista previa automática.</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                />
                <div className="cursor-pointer text-center text-sm py-2 px-3 border border-border rounded-md hover:bg-secondary transition-colors">
                  <ImageIcon className="h-4 w-4 inline mr-1" /> Elegir imagen
                </div>
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                disabled={!file || capturing}
                onClick={captureFrame}
              >
                {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Capturar del video
              </Button>
            </div>
          </div>

          <Button type="submit" disabled={uploading} className="w-full" size="lg">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : <><Upload className="h-4 w-4" /> Publicar</>}
          </Button>
        </form>
        {videoRef.current && null}
      </div>
    </div>
  );
};

export default UploadModal;
