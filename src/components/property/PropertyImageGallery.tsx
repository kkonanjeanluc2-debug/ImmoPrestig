import { useState, useRef, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2, ChevronLeft, ChevronRight, ImageIcon, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyImages, useAddPropertyImage, useDeletePropertyImage, useReorderPropertyImages, PropertyImage } from "@/hooks/usePropertyImages";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const THUMBNAIL_TYPE = "THUMBNAIL";

interface DragItem {
  id: string;
  index: number;
}

interface SortableThumbnailProps {
  image: { id: string; image_url: string };
  index: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onDelete: (id: string) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  canEdit: boolean;
  isMainImage: boolean;
}

const SortableThumbnail = ({
  image,
  index,
  selectedIndex,
  onSelect,
  onDelete,
  onMove,
  canEdit,
  isMainImage,
}: SortableThumbnailProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: THUMBNAIL_TYPE,
    item: { id: image.id, index },
    canDrag: canEdit && !isMainImage,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DragItem>({
    accept: THUMBNAIL_TYPE,
    hover(item, monitor) {
      if (!ref.current) return;
      if (isMainImage) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  preview(drop(ref));

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all group/thumb",
        selectedIndex === index
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent hover:border-muted-foreground/30",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        onClick={() => onSelect(index)}
        className="w-full h-full"
      >
        <img
          src={image.image_url}
          alt=""
          className="w-full h-full object-cover"
        />
      </button>
      
      {/* Drag Handle */}
      {canEdit && !isMainImage && (
        <div
          ref={drag}
          className="absolute bottom-0 left-0 right-0 p-1 bg-black/50 text-white flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/thumb:opacity-100 transition-opacity"
        >
          <GripVertical className="h-3 w-3" />
        </div>
      )}

      {/* Delete Button */}
      {canEdit && !isMainImage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image.id);
          }}
          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/thumb:opacity-100 hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Main Image Badge */}
      {isMainImage && (
        <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[10px] text-center py-0.5">
          Principale
        </div>
      )}
    </div>
  );
};

interface PropertyImageGalleryProps {
  propertyId: string;
  mainImage?: string | null;
  canEdit?: boolean;
}

const PropertyImageGalleryInner = ({
  propertyId,
  mainImage,
  canEdit = false,
}: PropertyImageGalleryProps) => {
  const { data: images = [], isLoading } = usePropertyImages(propertyId);
  const addImage = useAddPropertyImage();
  const deleteImage = useDeletePropertyImage();
  const reorderImages = useReorderPropertyImages();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [localImages, setLocalImages] = useState<typeof images | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use local state for optimistic updates during drag, otherwise use server data
  const galleryImages = localImages || images;

  // Combine main image with gallery images
  const allImages = mainImage
    ? [{ id: "main", image_url: mainImage }, ...galleryImages]
    : galleryImages;

  const handleMove = useCallback((dragIndex: number, hoverIndex: number) => {
    // Adjust indices to account for main image
    const adjustedDragIndex = mainImage ? dragIndex - 1 : dragIndex;
    const adjustedHoverIndex = mainImage ? hoverIndex - 1 : hoverIndex;

    if (adjustedDragIndex < 0 || adjustedHoverIndex < 0) return;

    const currentImages = localImages || images;
    const newOrder = [...currentImages];
    const [removed] = newOrder.splice(adjustedDragIndex, 1);
    newOrder.splice(adjustedHoverIndex, 0, removed);
    setLocalImages(newOrder as PropertyImage[]);
  }, [localImages, images, mainImage]);

  const handleDragEnd = async () => {
    if (!localImages) return;

    try {
      await reorderImages.mutateAsync({
        propertyId,
        images: localImages.map((img, idx) => ({
          id: img.id,
          display_order: idx,
        })),
      });
      toast.success("Ordre des images mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la réorganisation");
    } finally {
      setLocalImages(null);
    }
  };

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
        <div className="flex gap-2 overflow-x-auto pb-2" onMouseUp={handleDragEnd}>
          {allImages.map((img, index) => (
            <SortableThumbnail
              key={img.id}
              image={img}
              index={index}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onDelete={handleDeleteImage}
              onMove={handleMove}
              canEdit={canEdit}
              isMainImage={img.id === "main"}
            />
          ))}
        </div>
      )}

      {/* Hint for reordering */}
      {canEdit && galleryImages.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Glissez-déposez les miniatures pour réorganiser l'ordre des photos
        </p>
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

export const PropertyImageGallery = (props: PropertyImageGalleryProps) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <PropertyImageGalleryInner {...props} />
    </DndProvider>
  );
};
