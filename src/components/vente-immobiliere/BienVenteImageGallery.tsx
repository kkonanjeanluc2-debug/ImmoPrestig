import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useBienVenteImages,
  useAddBienVenteImage,
  useDeleteBienVenteImage,
  useReorderBienVenteImages,
  BienVenteImage,
} from "@/hooks/useBienVenteImages";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  ImageIcon, 
  ChevronLeft, 
  ChevronRight,
  GripVertical,
  X
} from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface BienVenteImageGalleryProps {
  bienId: string;
  mainImageUrl?: string | null;
  onMainImageChange?: (url: string | null) => void;
}

function SortableImageItem({
  image,
  index,
  onDelete,
  onView,
  isDeleting,
}: {
  image: BienVenteImage;
  index: number;
  onDelete: (id: string) => void;
  onView: (index: number) => void;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg overflow-hidden border bg-muted"
    >
      <AspectRatio ratio={4 / 3}>
        <img
          src={image.image_url}
          alt={`Image ${index + 1}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => onView(index)}
        />
      </AspectRatio>
      
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1 bg-black/50 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-white" />
      </div>
      
      {/* Delete button */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(image.id);
        }}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
      
      {/* Order badge */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {index + 1}
      </div>
    </div>
  );
}

export function BienVenteImageGallery({
  bienId,
  mainImageUrl,
  onMainImageChange,
}: BienVenteImageGalleryProps) {
  const { user } = useAuth();
  const { data: images = [], isLoading } = useBienVenteImages(bienId);
  const addImage = useAddBienVenteImage();
  const deleteImage = useDeleteBienVenteImage();
  const reorderImages = useReorderBienVenteImages();
  
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allImages = [
    ...(mainImageUrl ? [{ id: "main", image_url: mainImageUrl, display_order: -1 }] : []),
    ...images,
  ] as (BienVenteImage | { id: string; image_url: string; display_order: number })[];

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${bienId}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("property-images")
          .getPublicUrl(fileName);

        const currentMaxOrder = images.length > 0 
          ? Math.max(...images.map((img) => img.display_order)) 
          : -1;

        await addImage.mutateAsync({
          bienId,
          imageUrl: urlData.publicUrl,
          displayOrder: currentMaxOrder + 1 + i,
        });
      }

      toast.success(`${files.length} image(s) ajoutée(s)`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload des images");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }, [user, bienId, images, addImage]);

  const handleDelete = async (id: string) => {
    if (id === "main") {
      onMainImageChange?.(null);
      return;
    }

    setDeletingId(id);
    try {
      await deleteImage.mutateAsync({ id, bienId });
      toast.success("Image supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newImages = arrayMove(images, oldIndex, newIndex);
    const updates = newImages.map((img, index) => ({
      id: img.id,
      display_order: index,
    }));

    try {
      await reorderImages.mutateAsync({ bienId, images: updates });
    } catch (error) {
      toast.error("Erreur lors de la réorganisation");
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setLightboxIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
    } else {
      setLightboxIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Galerie photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Galerie photos ({allImages.length})
        </CardTitle>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Button size="sm" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {allImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-4" />
            <p>Aucune image</p>
            <p className="text-sm">Cliquez sur "Ajouter" pour ajouter des photos</p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext 
              items={images.map((img) => img.id)} 
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Main image (not sortable) */}
                {mainImageUrl && (
                  <div className="relative group rounded-lg overflow-hidden border bg-muted border-primary">
                    <AspectRatio ratio={4 / 3}>
                      <img
                        src={mainImageUrl}
                        alt="Image principale"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => openLightbox(0)}
                      />
                    </AspectRatio>
                    <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Principale
                    </div>
                  </div>
                )}
                
                {/* Gallery images (sortable) */}
                {images.map((image, index) => (
                  <SortableImageItem
                    key={image.id}
                    image={image}
                    index={index + (mainImageUrl ? 1 : 0)}
                    onDelete={handleDelete}
                    onView={() => openLightbox(index + (mainImageUrl ? 1 : 0))}
                    isDeleting={deletingId === image.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            {allImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => navigateLightbox("prev")}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={() => navigateLightbox("next")}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
            
            <div className="flex items-center justify-center min-h-[60vh]">
              {allImages[lightboxIndex] && (
                <img
                  src={allImages[lightboxIndex].image_url}
                  alt={`Image ${lightboxIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {lightboxIndex + 1} / {allImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
