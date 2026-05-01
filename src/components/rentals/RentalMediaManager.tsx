import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, Star, ImageIcon, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MediaItem {
  id: string;
  file_url: string;
  is_cover: boolean;
  sort_order: number;
}

interface Props {
  /** Provide either propertyId OR roomId. Photos will be attached to that target. */
  propertyId?: string;
  roomId?: string;
  ownerId: string;
  /** Storage path prefix component (typically the parent property id) */
  storageKey?: string;
  title?: string;
  description?: string;
}

const BUCKET = "rental-media";

const extractPath = (url: string): string | null => {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
};

export const RentalMediaManager = ({
  propertyId,
  roomId,
  ownerId,
  storageKey,
  title = "Fotky",
  description = "První nahraná foto se použije jako hlavní.",
}: Props) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const canManage = user?.id === ownerId;
  const targetCol: "property_id" | "room_id" = roomId ? "room_id" : "property_id";
  const targetId = roomId ?? propertyId;
  const pathKey = storageKey ?? propertyId ?? roomId ?? "misc";

  const fetchMedia = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    const { data } = await supabase
      .from("rental_media")
      .select("id,file_url,is_cover,sort_order")
      .eq(targetCol, targetId)
      .order("sort_order", { ascending: true });
    setItems((data || []) as MediaItem[]);
    setLoading(false);
  }, [targetCol, targetId]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length || !targetId) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    const nextOrder = items.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const subdir = roomId ? `rooms/${roomId}` : `${pathKey}`;
      const path = `${user.id}/${subdir}/${Date.now()}-${i}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (upErr) {
        toast({ title: "Chyba uploadu", description: upErr.message, variant: "destructive" });
        continue;
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const insertPayload: Record<string, unknown> = {
        file_url: pub.publicUrl,
        file_type: "image",
        sort_order: nextOrder + i,
        is_cover: items.length === 0 && i === 0,
      };
      insertPayload[targetCol] = targetId;

      const { error: insErr } = await supabase.from("rental_media").insert(insertPayload as never);

      if (insErr) {
        toast({ title: "Chyba uložení", description: insErr.message, variant: "destructive" });
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast({ title: "Fotky nahrány" });
    fetchMedia();
  };

  const setCover = async (id: string) => {
    if (!targetId) return;
    await supabase.from("rental_media").update({ is_cover: false }).eq(targetCol, targetId);
    const { error } = await supabase.from("rental_media").update({ is_cover: true }).eq("id", id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Hlavní fotka nastavena" }); fetchMedia(); }
  };

  const removeItem = async (item: MediaItem) => {
    if (!confirm("Smazat tuto fotku?")) return;
    const path = extractPath(item.file_url);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
    const { error } = await supabase.from("rental_media").delete().eq("id", item.id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Smazáno" }); fetchMedia(); }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistOrder = async (ordered: MediaItem[]) => {
    const updates = ordered.map((it, idx) =>
      supabase.from("rental_media").update({ sort_order: idx }).eq("id", it.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast({ title: "Pořadí se nepodařilo uložit", description: failed.error.message, variant: "destructive" });
      fetchMedia();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !canManage) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({ ...it, sort_order: idx }));
    setItems(next);
    persistOrder(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">{title} ({items.length})</h4>
          <p className="text-xs text-muted-foreground">
            {description}
            {canManage && items.length > 1 && " Pořadí změníte přetažením fotky."}
          </p>
        </div>
        {canManage && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Nahrát fotky
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Žádné fotky. Nahrajte první.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((item) => (
                <SortableMediaTile
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  onSetCover={setCover}
                  onRemove={removeItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

interface TileProps {
  item: MediaItem;
  canManage: boolean;
  onSetCover: (id: string) => void;
  onRemove: (item: MediaItem) => void;
}

const SortableMediaTile = ({ item, canManage, onSetCover, onRemove }: TileProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canManage,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
    >
      <img src={item.file_url} alt="" className="w-full h-full object-cover pointer-events-none" />
      {item.is_cover && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1">
          <Star className="h-3 w-3 fill-current" /> Hlavní
        </div>
      )}
      {canManage && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-1 right-1 h-7 w-7 flex items-center justify-center rounded bg-background/80 text-foreground shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition"
          title="Přetáhnout pro změnu pořadí"
          aria-label="Přesunout fotku"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {canManage && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 p-2">
          {!item.is_cover && (
            <Button size="icon" variant="secondary" onClick={() => onSetCover(item.id)} title="Nastavit jako hlavní">
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="destructive" onClick={() => onRemove(item)} title="Smazat">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
