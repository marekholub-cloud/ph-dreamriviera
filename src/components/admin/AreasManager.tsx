import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Area {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string | null;
  image_url: string | null;
  hero_image_url: string | null;
  hero_video_url: string | null;
}

export const AreasManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    country: "UAE",
    description: "",
    image_url: "",
    hero_image_url: "",
    hero_video_url: "",
  });

  const { data: areas, isLoading } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Area[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("areas").insert({
        name: data.name,
        city: data.city,
        country: data.country,
        description: data.description || null,
        image_url: data.image_url || null,
        hero_image_url: data.hero_image_url || null,
        hero_video_url: data.hero_video_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Oblast vytvořena");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("areas")
        .update({
          name: data.name,
          city: data.city,
          country: data.country,
          description: data.description || null,
          image_url: data.image_url || null,
          hero_image_url: data.hero_image_url || null,
          hero_video_url: data.hero_video_url || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Oblast aktualizována");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Oblast smazána");
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", city: "", country: "UAE", description: "", image_url: "", hero_image_url: "", hero_video_url: "" });
    setEditingArea(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      city: area.city,
      country: area.country,
      description: area.description || "",
      image_url: area.image_url || "",
      hero_image_url: area.hero_image_url || "",
      hero_video_url: area.hero_video_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.city.trim()) {
      toast.error("Vyplňte název a město");
      return;
    }
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'hero_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `areas/${field}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Chyba při nahrávání: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("property-images")
      .getPublicUrl(fileName);

    setFormData((prev) => ({ ...prev, [field]: urlData.publicUrl }));
    toast.success("Obrázek nahrán");
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video je příliš velké (max 50MB)");
      return;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `areas/videos/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Chyba při nahrávání: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("property-images")
      .getPublicUrl(fileName);

    setFormData((prev) => ({ ...prev, hero_video_url: urlData.publicUrl }));
    toast.success("Video nahráno");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-medium text-muted-foreground">Oblasti</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Přidat oblast
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingArea ? "Upravit oblast" : "Nová oblast"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Název *</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Název oblasti"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Město *</label>
                <Input
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="Dubai, Abu Dhabi..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Země</label>
                <Input
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, country: e.target.value }))
                  }
                  placeholder="UAE"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Popis</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Popis oblasti"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Náhledový obrázek (pro karty)</label>
                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image_url')} />
                {formData.image_url && (
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="mt-2 h-24 w-full object-cover rounded"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Hero obrázek (pro detail)</label>
                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'hero_image_url')} />
                {formData.hero_image_url && (
                  <img
                    src={formData.hero_image_url}
                    alt="Hero Preview"
                    className="mt-2 h-24 w-full object-cover rounded"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Hero video (pro detail)</label>
                <Input type="file" accept="video/*" onChange={handleVideoUpload} />
                {formData.hero_video_url && (
                  <div className="mt-2">
                    <video
                      src={formData.hero_video_url}
                      className="h-24 w-full object-cover rounded"
                      muted
                      controls
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingArea ? "Uložit" : "Vytvořit"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Obrázek</TableHead>
              <TableHead>Název</TableHead>
              <TableHead>Město</TableHead>
              <TableHead>Země</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas?.map((area) => (
              <TableRow key={area.id}>
                <TableCell>
                  {area.image_url && (
                    <img
                      src={area.image_url}
                      alt={area.name}
                      className="h-10 w-16 object-cover rounded"
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">{area.name}</TableCell>
                <TableCell>{area.city}</TableCell>
                <TableCell>{area.country}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(area)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Opravdu smazat?")) {
                          deleteMutation.mutate(area.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {areas?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Zatím žádné oblasti
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
