import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableImageItem } from "./SortableImageItem";

interface PropertyImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number | null;
}

interface PropertyImagesManagerProps {
  propertyId: string;
  propertyName: string;
}

export function PropertyImagesManager({ propertyId, propertyName }: PropertyImagesManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch existing images
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['property-images', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', propertyId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PropertyImage[];
    }
  });

  // Upload image mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      const maxSortOrder = images.length > 0 ? Math.max(...images.map(img => img.sort_order || 0)) : -1;
      
      const { error: insertError } = await supabase
        .from('property_images')
        .insert({
          property_id: propertyId,
          image_url: publicUrl,
          alt_text: file.name,
          sort_order: maxSortOrder + 1
        });

      if (insertError) throw insertError;
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-images', propertyId] });
      toast.success('Obrázek nahrán');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Nepodařilo se nahrát obrázek');
    }
  });

  // Delete image mutation
  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from('property_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-images', propertyId] });
      toast.success('Obrázek smazán');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Nepodařilo se smazat obrázek');
    }
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (reorderedImages: PropertyImage[]) => {
      const updates = reorderedImages.map((img, index) => 
        supabase
          .from('property_images')
          .update({ sort_order: index })
          .eq('id', img.id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-images', propertyId] });
      toast.success('Pořadí uloženo');
    },
    onError: (error) => {
      console.error('Reorder error:', error);
      toast.error('Nepodařilo se uložit pořadí');
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over.id);
      const reordered = arrayMove(images, oldIndex, newIndex);
      
      // Optimistic update
      queryClient.setQueryData(['property-images', propertyId], reordered);
      reorderMutation.mutate(reordered);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addByUrl = async () => {
    if (!imageUrl.trim()) return;

    try {
      const maxSortOrder = images.length > 0 ? Math.max(...images.map(img => img.sort_order || 0)) : -1;
      
      const { error } = await supabase
        .from('property_images')
        .insert({
          property_id: propertyId,
          image_url: imageUrl.trim(),
          sort_order: maxSortOrder + 1
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['property-images', propertyId] });
      setImageUrl('');
      toast.success('Obrázek přidán');
    } catch (error) {
      console.error('Add by URL error:', error);
      toast.error('Nepodařilo se přidat obrázek');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Obrázky: {propertyName}</h3>
      
      {/* Upload section */}
      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="file-upload">Nahrát obrázky</Label>
          <div className="mt-2 flex items-center gap-4">
            <Input
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">nebo</span>
        </div>

        <div>
          <Label htmlFor="image-url">Přidat URL obrázku</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="image-url"
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addByUrl} disabled={!imageUrl.trim()}>
              Přidat
            </Button>
          </div>
        </div>
      </div>

      {/* Images grid with drag & drop */}
      {images.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <SortableImageItem
                  key={image.id}
                  image={image}
                  index={index}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mb-2" />
          <p>Žádné obrázky</p>
        </div>
      )}
    </Card>
  );
}
