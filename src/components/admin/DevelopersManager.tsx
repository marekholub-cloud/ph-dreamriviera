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

interface Developer {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
}

export const DevelopersManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logo_url: "",
    website: "",
  });

  const { data: developers, isLoading } = useQuery({
    queryKey: ["developers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Developer[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("developers").insert({
        name: data.name,
        description: data.description || null,
        logo_url: data.logo_url || null,
        website: data.website || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developers"] });
      toast.success("Developer vytvořen");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("developers")
        .update({
          name: data.name,
          description: data.description || null,
          logo_url: data.logo_url || null,
          website: data.website || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developers"] });
      toast.success("Developer aktualizován");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("developers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["developers"] });
      toast.success("Developer smazán");
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", logo_url: "", website: "" });
    setEditingDeveloper(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (developer: Developer) => {
    setEditingDeveloper(developer);
    setFormData({
      name: developer.name,
      description: developer.description || "",
      logo_url: developer.logo_url || "",
      website: developer.website || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Vyplňte název developera");
      return;
    }
    if (editingDeveloper) {
      updateMutation.mutate({ id: editingDeveloper.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `developers/${Date.now()}.${fileExt}`;

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

    setFormData((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    toast.success("Logo nahráno");
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
        <CardTitle className="text-base font-medium text-muted-foreground">Developeři</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Přidat developera
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDeveloper ? "Upravit developera" : "Nový developer"}
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
                  placeholder="Název developera"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Popis</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Popis developera"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Logo</label>
                <Input type="file" accept="image/*" onChange={handleLogoUpload} />
                {formData.logo_url && (
                  <img
                    src={formData.logo_url}
                    alt="Logo preview"
                    className="mt-2 h-16 object-contain"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Web</label>
                <Input
                  value={formData.website}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, website: e.target.value }))
                  }
                  placeholder="https://example.com"
                />
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
                  {editingDeveloper ? "Uložit" : "Vytvořit"}
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
              <TableHead>Logo</TableHead>
              <TableHead>Název</TableHead>
              <TableHead>Web</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {developers?.map((developer) => (
              <TableRow key={developer.id}>
                <TableCell>
                  {developer.logo_url && (
                    <img
                      src={developer.logo_url}
                      alt={developer.name}
                      className="h-10 w-10 object-contain"
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">{developer.name}</TableCell>
                <TableCell>
                  {developer.website && (
                    <a
                      href={developer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {developer.website}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(developer)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Opravdu smazat?")) {
                          deleteMutation.mutate(developer.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {developers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Zatím žádní developeři
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
