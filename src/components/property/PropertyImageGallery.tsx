import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyImages, useAddPropertyImage, useDeletePropertyImage } from "@/hooks/usePropertyImages";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface PropertyImageGalleryProps {
  propertyId: string;
  mainImage?: string | null;
  canEdit?: boolean;
}

export const PropertyImageGallery = ({
  propertyId,
  mainImage,
  canEdit = false,
}: PropertyImageGalleryProps) => {
  const { data: images = [], isLoading } = usePropertyImages(propertyId);
  const addImage = useAddPropertyImage();
  const deleteImage = useDeletePropertyImage();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combine main image with gallery images
  const allImages = mainImage
    ? [{ id: "main", image_url: mainImage }, ...images]
    : images;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} n'est pas une image valide`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} dépasse 5 Mo`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `properties/${propertyId}/${fileName}`;

        const { error } = await supabase.storage
          .from("property-images")
          .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("property-images")
          .getPublicUrl(filePath);

        await addImage.mutateAsync({
          propertyId,
          imageUrl: urlData.publicUrl,
          displayOrder: images.length,
        });
      }

      toast.success("Image(s) ajoutée(s) avec succès !");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'import des images");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (imageId === "main") {
      toast.error("Modifiez le bien pour changer l'image principale");
      return;
    }

    try {
      await deleteImage.mutateAsync({ id: imageId, propertyId });
      toast.success("Image supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSelectedIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
    } else {
      setSelectedIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      {allImages.length > 0 && (
        <div
          className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => openLightbox(selectedIndex)}
        >
          <img
            src={allImages[selectedIndex]?.image_url}
            alt="Property"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-white font-medium transition-opacity">
              Cliquez pour agrandir
            </span>
          </div>
          {allImages.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-sm">
              {selectedIndex + 1} / {allImages.length}
            </div>
          )}
        </div>
      )}

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                selectedIndex === index
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <img
                src={img.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
              {canEdit && img.id !== "main" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(img.id);
                  }}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Add Images Button */}
      {canEdit && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter des photos
              </>
            )}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {allImages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-2" />
          <p>Aucune photo</p>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative aspect-video">
            <img
              src={allImages[selectedIndex]?.image_url}
              alt=""
              className="w-full h-full object-contain"
            />
            {allImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={() => navigateLightbox("prev")}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={() => navigateLightbox("next")}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  {selectedIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
