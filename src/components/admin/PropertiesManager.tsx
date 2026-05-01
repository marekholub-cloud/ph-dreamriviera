import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Image, Images, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PropertyImagesManager } from "./PropertyImagesManager";
import { LocationPicker } from "./LocationPicker";

interface Property {
  id: string;
  name: string;
  slug: string;
  developer_id: string | null;
  area_id: string | null;
  type: string;
  status: string;
  price_from: number | null;
  price_formatted: string | null;
  bedrooms: string | null;
  area_sqm: string | null;
  description: string | null;
  short_description: string | null;
  completion_date: string | null;
  hero_image_url: string | null;
  hero_video_url: string | null;
  youtube_url: string | null;
  brochure_url: string | null;
  dropbox_folder_url: string | null;
  amenities: string[] | null;
  features: string[] | null;
  is_featured: boolean;
  is_published: boolean;
  latitude: number | null;
  longitude: number | null;
  payment_plan: string | null;
  developers?: { name: string } | null;
  areas?: { name: string; city: string } | null;
}

interface Developer {
  id: string;
  name: string;
}

interface Area {
  id: string;
  name: string;
  city: string;
}

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

export const PropertiesManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imagesDialogOpen, setImagesDialogOpen] = useState(false);
  const [selectedPropertyForImages, setSelectedPropertyForImages] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    developer_id: "",
    area_id: "",
    type: "Apartment",
    status: "Off-plan",
    price_from: "",
    price_formatted: "",
    bedrooms: "",
    area_sqm: "",
    description: "",
    short_description: "",
    completion_date: "",
    hero_image_url: "",
    hero_video_url: "",
    youtube_url: "",
    brochure_url: "",
    dropbox_folder_url: "",
    amenities: "",
    features: "",
    is_featured: false,
    is_published: true,
    latitude: null as number | null,
    longitude: null as number | null,
    payment_plan: "60/40",
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, developers(name), areas(name, city)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Property[];
    },
  });

  const { data: developers } = useQuery({
    queryKey: ["developers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("developers").select("id, name").order("name");
      if (error) throw error;
      return data as Developer[];
    },
  });

  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("id, name, city").order("name");
      if (error) throw error;
      return data as Area[];
    },
  });

  // Helper function to generate OG image in background
  const generateOgImage = async (propertySlug: string) => {
    try {
      console.log("Generating OG image for:", propertySlug);
      const { error } = await supabase.functions.invoke('generate-og-image', {
        body: { propertySlug }
      });
      if (error) {
        console.error("OG image generation error:", error);
      } else {
        console.log("OG image generated successfully for:", propertySlug);
      }
    } catch (err) {
      console.error("Failed to generate OG image:", err);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const amenitiesArray = data.amenities ? data.amenities.split(',').map(s => s.trim()).filter(Boolean) : [];
      const featuresArray = data.features ? data.features.split(',').map(s => s.trim()).filter(Boolean) : [];
      
      const slug = data.slug || generateSlug(data.name);
      
      const { error } = await supabase.from("properties").insert({
        name: data.name,
        slug,
        developer_id: data.developer_id || null,
        area_id: data.area_id || null,
        type: data.type,
        status: data.status,
        price_from: data.price_from ? parseFloat(data.price_from) : null,
        price_formatted: data.price_formatted || null,
        bedrooms: data.bedrooms || null,
        area_sqm: data.area_sqm || null,
        description: data.description || null,
        short_description: data.short_description || null,
        completion_date: data.completion_date || null,
        hero_image_url: data.hero_image_url || null,
        hero_video_url: data.hero_video_url || null,
        youtube_url: data.youtube_url || null,
        brochure_url: data.brochure_url || null,
        dropbox_folder_url: data.dropbox_folder_url || null,
        amenities: amenitiesArray,
        features: featuresArray,
        is_featured: data.is_featured,
        is_published: data.is_published,
        latitude: data.latitude,
        longitude: data.longitude,
        payment_plan: data.payment_plan || "60/40",
      });
      if (error) throw error;
      
      return { slug };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast.success("Nemovitost vytvořena");
      resetForm();
      
      // Generate OG image in background
      if (result?.slug) {
        generateOgImage(result.slug);
        toast.info("Generuji náhledový obrázek pro sdílení...");
      }
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const amenitiesArray = data.amenities ? data.amenities.split(',').map(s => s.trim()).filter(Boolean) : [];
      const featuresArray = data.features ? data.features.split(',').map(s => s.trim()).filter(Boolean) : [];
      
      const slug = data.slug || generateSlug(data.name);
      
      const { error } = await supabase
        .from("properties")
        .update({
          name: data.name,
          slug,
          developer_id: data.developer_id || null,
          area_id: data.area_id || null,
          type: data.type,
          status: data.status,
          price_from: data.price_from ? parseFloat(data.price_from) : null,
          price_formatted: data.price_formatted || null,
          bedrooms: data.bedrooms || null,
          area_sqm: data.area_sqm || null,
          description: data.description || null,
          short_description: data.short_description || null,
          completion_date: data.completion_date || null,
          hero_image_url: data.hero_image_url || null,
          hero_video_url: data.hero_video_url || null,
          youtube_url: data.youtube_url || null,
          brochure_url: data.brochure_url || null,
          dropbox_folder_url: data.dropbox_folder_url || null,
          amenities: amenitiesArray,
          features: featuresArray,
          is_featured: data.is_featured,
          is_published: data.is_published,
          latitude: data.latitude,
          longitude: data.longitude,
          payment_plan: data.payment_plan || "60/40",
        })
        .eq("id", id);
      if (error) throw error;
      
      return { slug };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast.success("Nemovitost aktualizována");
      resetForm();
      
      // Regenerate OG image in background
      if (result?.slug) {
        generateOgImage(result.slug);
        toast.info("Aktualizuji náhledový obrázek pro sdílení...");
      }
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast.success("Nemovitost smazána");
    },
    onError: (error: Error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      developer_id: "",
      area_id: "",
      type: "Apartment",
      status: "Off-plan",
      price_from: "",
      price_formatted: "",
      bedrooms: "",
      area_sqm: "",
      description: "",
      short_description: "",
      completion_date: "",
      hero_image_url: "",
      hero_video_url: "",
      youtube_url: "",
      brochure_url: "",
      dropbox_folder_url: "",
      amenities: "",
      features: "",
      is_featured: false,
      is_published: true,
      latitude: null,
      longitude: null,
      payment_plan: "60/40",
    });
    setEditingProperty(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      slug: property.slug,
      developer_id: property.developer_id || "",
      area_id: property.area_id || "",
      type: property.type,
      status: property.status,
      price_from: property.price_from?.toString() || "",
      price_formatted: property.price_formatted || "",
      bedrooms: property.bedrooms || "",
      area_sqm: property.area_sqm || "",
      description: property.description || "",
      short_description: property.short_description || "",
      completion_date: property.completion_date || "",
      hero_image_url: property.hero_image_url || "",
      hero_video_url: property.hero_video_url || "",
      youtube_url: property.youtube_url || "",
      brochure_url: property.brochure_url || "",
      dropbox_folder_url: property.dropbox_folder_url || "",
      amenities: property.amenities?.join(", ") || "",
      features: property.features?.join(", ") || "",
      is_featured: property.is_featured,
      is_published: property.is_published,
      latitude: property.latitude,
      longitude: property.longitude,
      payment_plan: property.payment_plan || "60/40",
    });
    setIsDialogOpen(true);
  };

  const [aiLoading, setAiLoading] = useState<"short" | "long" | null>(null);

  const handleGenerateAI = async (variant: "short" | "long") => {
    if (!formData.name.trim()) {
      toast.error("Nejprve zadejte název projektu");
      return;
    }
    setAiLoading(variant);
    try {
      const developer = developers?.find((d) => d.id === formData.developer_id);
      const area = areas?.find((a) => a.id === formData.area_id);
      const { data, error } = await supabase.functions.invoke("generate-property-description", {
        body: {
          variant,
          name: formData.name,
          type: formData.type,
          status: formData.status,
          bedrooms: formData.bedrooms,
          area_sqm: formData.area_sqm,
          price_formatted: formData.price_formatted,
          developer: developer?.name,
          area: area?.name,
          city: area?.city,
          completion_date: formData.completion_date,
          payment_plan: formData.payment_plan,
          amenities: formData.amenities ? formData.amenities.split(",").map((s) => s.trim()).filter(Boolean) : [],
          features: formData.features ? formData.features.split(",").map((s) => s.trim()).filter(Boolean) : [],
          existingDescription: variant === "short" ? formData.short_description : formData.description,
        },
      });
      if (error) throw error;
      const text = (data as { text?: string; error?: string })?.text;
      if (!text) throw new Error((data as { error?: string })?.error || "Prázdná odpověď");
      setFormData((prev) =>
        variant === "short" ? { ...prev, short_description: text } : { ...prev, description: text },
      );
      toast.success(variant === "short" ? "Krátký popis vygenerován" : "Popis vygenerován");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Chyba generování";
      toast.error(msg);
    } finally {
      setAiLoading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Vyplňte název nemovitosti");
      return;
    }
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `properties/${Date.now()}.${fileExt}`;

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

    setFormData((prev) => ({ ...prev, hero_image_url: urlData.publicUrl }));
    toast.success("Obrázek nahrán");
  };

  const handleBrochureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      toast.error("Nahrajte prosím PDF soubor");
      return;
    }

    const fileName = `brochures/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(fileName, file, {
        contentType: "application/pdf"
      });

    if (uploadError) {
      toast.error("Chyba při nahrávání: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("property-images")
      .getPublicUrl(fileName);

    setFormData((prev) => ({ ...prev, brochure_url: urlData.publicUrl }));
    toast.success("Brožura nahrána");
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("video")) {
      toast.error("Nahrajte prosím video soubor (MP4, MOV, WebM)");
      return;
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video je příliš velké. Maximální velikost je 100MB.");
      return;
    }

    toast.info("Nahrávám video...");

    const fileName = `videos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(fileName, file, {
        contentType: file.type
      });

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
        <CardTitle className="text-base font-medium text-muted-foreground">Nemovitosti</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Přidat nemovitost
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProperty ? "Upravit nemovitost" : "Nová nemovitost"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Název *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      }));
                    }}
                    placeholder="Název projektu"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="url-slug"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Developer</label>
                  <Select
                    value={formData.developer_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, developer_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte developera" />
                    </SelectTrigger>
                    <SelectContent>
                      {developers?.map((dev) => (
                        <SelectItem key={dev.id} value={dev.id}>
                          {dev.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Oblast</label>
                  <Select
                    value={formData.area_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, area_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte oblast" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas?.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}, {area.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Typ</label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apartment">Apartment</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Off-plan">Off-plan</SelectItem>
                      <SelectItem value="Under Construction">Under Construction</SelectItem>
                      <SelectItem value="Ready">Ready</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Cena od (USD)</label>
                  <Input
                    type="number"
                    value={formData.price_from}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, price_from: e.target.value }))
                    }
                    placeholder="1000000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cena formátovaná</label>
                  <Input
                    value={formData.price_formatted}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, price_formatted: e.target.value }))
                    }
                    placeholder="od 1 000 000 USD"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Ložnice</label>
                  <Input
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bedrooms: e.target.value }))
                    }
                    placeholder="1-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Plocha (m²)</label>
                  <Input
                    value={formData.area_sqm}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, area_sqm: e.target.value }))
                    }
                    placeholder="50-150"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Datum dokončení</label>
                  <Input
                    value={formData.completion_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, completion_date: e.target.value }))
                    }
                    placeholder="Q4 2026"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Platební plán</label>
                  <Input
                    value={formData.payment_plan}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, payment_plan: e.target.value }))
                    }
                    placeholder="60/40"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Krátký popis</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                    onClick={() => handleGenerateAI("short")}
                    disabled={aiLoading !== null}
                  >
                    {aiLoading === "short" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Vygenerovat AI
                  </Button>
                </div>
                <Textarea
                  value={formData.short_description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, short_description: e.target.value }))
                  }
                  placeholder="Krátký popis pro kartu"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Popis</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                    onClick={() => handleGenerateAI("long")}
                    disabled={aiLoading !== null}
                  >
                    {aiLoading === "long" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Vygenerovat AI
                  </Button>
                </div>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Detailní popis nemovitosti"
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Hero obrázek</label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {formData.hero_image_url && (
                  <img
                    src={formData.hero_image_url}
                    alt="Preview"
                    className="mt-2 h-32 w-full object-cover rounded"
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Hero video</label>
                <div className="space-y-2">
                  <Input 
                    type="file" 
                    accept="video/mp4,video/webm,video/quicktime" 
                    onChange={handleVideoUpload} 
                  />
                  <div className="text-xs text-muted-foreground">nebo zadejte URL:</div>
                  <Input
                    value={formData.hero_video_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, hero_video_url: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                  {formData.hero_video_url && (
                    <a 
                      href={formData.hero_video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Zobrazit video ↗
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">YouTube URL</label>
                <Input
                  value={formData.youtube_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, youtube_url: e.target.value }))
                  }
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Brožura (PDF)</label>
                <div className="space-y-2">
                  <Input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleBrochureUpload} 
                  />
                  <div className="text-xs text-muted-foreground">nebo zadejte URL:</div>
                  <Input
                    value={formData.brochure_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, brochure_url: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                  {formData.brochure_url && (
                    <a 
                      href={formData.brochure_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Zobrazit brožuru ↗
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Dropbox složka (URL pro obchodníky)</label>
                <Input
                  value={formData.dropbox_folder_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dropbox_folder_url: e.target.value }))
                  }
                  placeholder="https://www.dropbox.com/..."
                />
                {formData.dropbox_folder_url && (
                  <a 
                    href={formData.dropbox_folder_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Otevřít Dropbox složku ↗
                  </a>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Vybavení (oddělené čárkou)</label>
                <Textarea
                  value={formData.amenities}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amenities: e.target.value }))
                  }
                  placeholder="Bazén, Fitness, Sauna, Dětské hřiště"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Vlastnosti (oddělené čárkou)</label>
                <Textarea
                  value={formData.features}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, features: e.target.value }))
                  }
                  placeholder="Smart home, Centrální klimatizace, Parkování"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Poloha na mapě</label>
                <LocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationChange={(lat, lng) => 
                    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                  }
                  propertyName={formData.name}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_featured: checked }))
                    }
                  />
                  <label className="text-sm">Doporučené</label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_published: checked }))
                    }
                  />
                  <label className="text-sm">Publikováno</label>
                </div>
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
                  {editingProperty ? "Uložit" : "Vytvořit"}
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
              <TableHead>Developer</TableHead>
              <TableHead>Oblast</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties?.map((property) => (
              <TableRow key={property.id} className={!property.is_published ? "opacity-50" : ""}>
                <TableCell>
                  {property.hero_image_url ? (
                    <img
                      src={property.hero_image_url}
                      alt={property.name}
                      className="h-12 w-20 object-cover rounded"
                    />
                  ) : (
                    <div className="h-12 w-20 bg-muted rounded flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {property.name}
                  {property.is_featured && (
                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      ⭐
                    </span>
                  )}
                </TableCell>
                <TableCell>{property.developers?.name || "-"}</TableCell>
                <TableCell>
                  {property.areas ? `${property.areas.name}, ${property.areas.city}` : "-"}
                </TableCell>
                <TableCell>{property.type}</TableCell>
                <TableCell>{property.status}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPropertyForImages(property);
                        setImagesDialogOpen(true);
                      }}
                      title="Spravovat obrázky"
                    >
                      <Images className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(property)}
                      title="Upravit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Opravdu smazat?")) {
                          deleteMutation.mutate(property.id);
                        }
                      }}
                      title="Smazat"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {properties?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Zatím žádné nemovitosti
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Images Dialog */}
        <Dialog open={imagesDialogOpen} onOpenChange={setImagesDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Galerie obrázků</DialogTitle>
            </DialogHeader>
            {selectedPropertyForImages && (
              <PropertyImagesManager 
                propertyId={selectedPropertyForImages.id} 
                propertyName={selectedPropertyForImages.name} 
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
