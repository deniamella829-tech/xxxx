import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Camera, X, ImagePlus } from "lucide-react";

const PhotoUploadModal = ({
  userId,
  onClose,
  onUploaded,
}: {
  userId: string;
  onClose: () => void;
  onUploaded?: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Selecciona una foto");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("photos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("photos").insert({
        title: title.trim() || "Sin título",
        description: description.trim() || null,
        image_url: pub.publicUrl,
        storage_path: path,
        user_id: userId,
      });
      if (insErr) throw insErr;
      toast.success("¡Foto publicada!");
      onUploaded?.();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-card rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-secondary rounded">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" /> Subir una foto
        </h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <label className="block">
            {preview ? (
              <img src={preview} alt="" className="w-full max-h-72 object-contain rounded-md bg-black/40 cursor-pointer" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-md py-10 cursor-pointer hover:bg-secondary/30">
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Toca para seleccionar una imagen</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
          </label>
          <Input placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          <Textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} />
          <Button type="submit" disabled={uploading || !file} className="w-full" size="lg">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : <><Camera className="h-4 w-4" /> Publicar foto</>}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PhotoUploadModal;
