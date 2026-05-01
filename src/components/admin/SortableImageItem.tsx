import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, GripVertical } from "lucide-react";

interface PropertyImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number | null;
}

interface SortableImageItemProps {
  image: PropertyImage;
  index: number;
  onDelete: (id: string) => void;
}

export function SortableImageItem({ image, index, onDelete }: SortableImageItemProps) {
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
      className={`relative group ${isDragging ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
        <img
          src={image.image_url}
          alt={image.alt_text || `Image ${index + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
      </div>
      <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
        #{index + 1}
      </div>
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 left-10 p-1.5 bg-background/80 backdrop-blur-sm rounded cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <button
        onClick={() => onDelete(image.id)}
        className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
