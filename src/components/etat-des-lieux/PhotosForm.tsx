import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Plus, Trash2, Download, ExternalLink, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PhotosFormProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  readOnly?: boolean;
}

export function PhotosForm({ photos, onChange, readOnly }: PhotosFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const { user } = useAuth();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} n'est pas une image`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} dépasse 5 Mo`);
          continue;
        }

        const ext = file.name.split(".").pop();
        const filePath = `${user.id}/etats-des-lieux/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from("documents-achats")
          .upload(filePath, file);

        if (error) {
          console.error("Upload error:", error);
          toast.error(`Erreur upload: ${file.name}`);
          continue;
        }

        newPhotos.push(filePath);
      }

      if (newPhotos.length > 0) {
        onChange([...photos, ...newPhotos]);
        toast.success(`${newPhotos.length} photo(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const path = photos[index];
    try {
      await supabase.storage.from("documents-achats").remove([path]);
    } catch (e) {
      console.error("Delete error:", e);
    }
    onChange(photos.filter((_, i) => i !== index));
  };

  const handleView = async (index: number) => {
    setLoadingIndex(index);
    const path = photos[index];
    const url = await getSignedUrl(path);
    setLoadingIndex(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const getSignedUrl = async (path: string) => {
    if (path.startsWith("http")) return path;
    const { data, error } = await supabase.storage
      .from("documents-achats")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast.error("Impossible d'accéder à la photo");
      return null;
    }
    return data.signedUrl;
  };

  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  const loadThumbnail = async (index: number, path: string) => {
    if (thumbnails[index]) return;
    const url = await getSignedUrl(path);
    if (url) setThumbnails((prev) => ({ ...prev, [index]: url }));
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-dashed border-2 h-20"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Camera className="h-5 w-5 mr-2" />
                Ajouter des photos
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Formats acceptés : JPG, PNG, WebP. Max 5 Mo par photo.
          </p>
        </div>
      )}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <PhotoCard
              key={index}
              index={index}
              photo={photo}
              readOnly={readOnly}
              loading={loadingIndex === index}
              thumbnail={thumbnails[index]}
              onLoadThumbnail={() => loadThumbnail(index, photo)}
              onView={() => handleView(index)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Aucune photo ajoutée
        </p>
      )}
    </div>
  );
}

function PhotoCard({
  index,
  photo,
  readOnly,
  loading,
  thumbnail,
  onLoadThumbnail,
  onView,
  onRemove,
}: {
  index: number;
  photo: string;
  readOnly?: boolean;
  loading: boolean;
  thumbnail?: string;
  onLoadThumbnail: () => void;
  onView: () => void;
  onRemove: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load thumbnail on mount
  useEffect(() => {
    onLoadThumbnail();
  }, []);

  return (
    <div className="border rounded-lg overflow-hidden group relative">
      <div className="aspect-square bg-muted flex items-center justify-center">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Photo ${index + 1}`}
            className="w-full h-full object-cover"
            onLoad={() => setImgLoaded(true)}
          />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onView}
          disabled={loading}
          className="h-8 w-8"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
        </Button>
        {!readOnly && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-center py-1 text-muted-foreground">
        Photo {index + 1}
      </p>
    </div>
  );
}
