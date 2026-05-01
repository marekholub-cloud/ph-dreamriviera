import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Video, Image, Youtube, Globe, FileText, Import, CheckCircle2, AlertCircle, ArrowLeft, Save, X } from "lucide-react";

interface ExtractedData {
  name: string;
  description: string;
  shortDescription: string;
  priceFrom: number | null;
  priceFormatted: string | null;
  developer: string | null;
  type: string;
  bedrooms: string | null;
  areaSqm: string | null;
  completionDate: string | null;
  status: string;
  features: string[];
  amenities: string[];
  location: string | null;
}

type ImportStep = "input" | "preview" | "saving" | "done";

export const PropertyImporter = () => {
  // Step management
  const [step, setStep] = useState<ImportStep>("input");
  
  // Input URLs
  const [heroVideoUrl, setHeroVideoUrl] = useState("");
  const [photosDirectoryUrl, setPhotosDirectoryUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");
  
  // Loading states
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Extracted data (editable)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  
  // Result
  const [savedProperty, setSavedProperty] = useState<{ id: string; name: string; slug: string } | null>(null);

  const handleExtract = async () => {
    if (!websiteUrl) {
      toast({
        title: "Chybí URL webu",
        description: "Zadejte prosím URL oficiálních webových stránek projektu.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      const { data, error } = await supabase.functions.invoke('extract-property-data', {
        body: {
          websiteUrl,
          photosDirectoryUrl,
        },
      });

      if (error) throw error;

      if (data.success) {
        setExtractedData(data.extractedData);
        setImageUrls(data.imageUrls || []);
        // Select all images by default
        setSelectedImages(new Set(data.imageUrls?.map((_: string, i: number) => i) || []));
        setStep("preview");
        toast({
          title: "Data extrahována",
          description: "Zkontrolujte a upravte data před uložením.",
        });
      } else {
        throw new Error(data.error || "Nepodařilo se extrahovat data.");
      }
    } catch (error: any) {
      console.error("Extract error:", error);
      toast({
        title: "Chyba při extrakci",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData?.name) {
      toast({
        title: "Chybí název",
        description: "Zadejte prosím název projektu.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setStep("saving");

    try {
      // Get only selected images
      const selectedImageUrls = imageUrls.filter((_, index) => selectedImages.has(index));

      const { data, error } = await supabase.functions.invoke('save-property', {
        body: {
          propertyData: extractedData,
          heroVideoUrl,
          youtubeUrl,
          brochureUrl,
          imageUrls: selectedImageUrls,
        },
      });

      if (error) throw error;

      if (data.success) {
        setSavedProperty(data.property);
        setStep("done");
        toast({
          title: "Projekt uložen",
          description: `Projekt "${data.property.name}" byl úspěšně vytvořen.`,
        });
      } else {
        throw new Error(data.error || "Nepodařilo se uložit projekt.");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      setStep("preview");
      toast({
        title: "Chyba při ukládání",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setExtractedData(null);
    setImageUrls([]);
    setSelectedImages(new Set());
    setSavedProperty(null);
    setHeroVideoUrl("");
    setPhotosDirectoryUrl("");
    setYoutubeUrl("");
    setWebsiteUrl("");
    setBrochureUrl("");
  };

  const updateField = <K extends keyof ExtractedData>(field: K, value: ExtractedData[K]) => {
    if (extractedData) {
      setExtractedData({ ...extractedData, [field]: value });
    }
  };

  const toggleImageSelection = (index: number) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedImages(newSelected);
  };

  const addFeature = (feature: string) => {
    if (extractedData && feature.trim()) {
      updateField("features", [...(extractedData.features || []), feature.trim()]);
    }
  };

  const removeFeature = (index: number) => {
    if (extractedData) {
      updateField("features", extractedData.features.filter((_, i) => i !== index));
    }
  };

  const addAmenity = (amenity: string) => {
    if (extractedData && amenity.trim()) {
      updateField("amenities", [...(extractedData.amenities || []), amenity.trim()]);
    }
  };

  const removeAmenity = (index: number) => {
    if (extractedData) {
      updateField("amenities", extractedData.amenities.filter((_, i) => i !== index));
    }
  };

  // Step 1: Input URLs
  if (step === "input") {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
            <Import className="h-4 w-4" />
            Import nového projektu
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground/70">
            Zadejte odkazy na zdroje a systém automaticky extrahuje informace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                URL oficiální stránky projektu *
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://www.developer.com/project-name"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bg-card"
                required
              />
              <p className="text-xs text-muted-foreground">
                Hlavní zdroj informací - extrahujeme název, popis, ceny, vybavení a další údaje.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroVideoUrl" className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                Hero video URL
              </Label>
              <Input
                id="heroVideoUrl"
                type="url"
                placeholder="https://example.com/video.mp4"
                value={heroVideoUrl}
                onChange={(e) => setHeroVideoUrl(e.target.value)}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photosDirectoryUrl" className="flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Adresář s fotkami (Dropbox)
              </Label>
              <Input
                id="photosDirectoryUrl"
                type="url"
                placeholder="https://www.dropbox.com/sh/..."
                value={photosDirectoryUrl}
                onChange={(e) => setPhotosDirectoryUrl(e.target.value)}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtubeUrl" className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-primary" />
                YouTube video URL
              </Label>
              <Input
                id="youtubeUrl"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brochureUrl" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                URL brožury ke stažení
              </Label>
              <Input
                id="brochureUrl"
                type="url"
                placeholder="https://www.dropbox.com/s/.../brochure.pdf"
                value={brochureUrl}
                onChange={(e) => setBrochureUrl(e.target.value)}
                className="bg-card"
              />
            </div>
          </div>

          <Button
            onClick={handleExtract}
            disabled={isExtracting || !websiteUrl}
            className="w-full"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extrahuji data... (může trvat až 30 sekund)
              </>
            ) : (
              <>
                <Import className="mr-2 h-4 w-4" />
                Extrahovat data z webu
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Preview and Edit
  if (step === "preview" && extractedData) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Kontrola a úprava dat
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Upravte extrahovaná data podle potřeby před uložením.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep("input")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zpět
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Název projektu *</Label>
              <Input
                value={extractedData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className="bg-card"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Krátký popis</Label>
              <Textarea
                value={extractedData.shortDescription || ""}
                onChange={(e) => updateField("shortDescription", e.target.value)}
                className="bg-card"
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Popis</Label>
              <Textarea
                value={extractedData.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                className="bg-card"
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Developer</Label>
              <Input
                value={extractedData.developer || ""}
                onChange={(e) => updateField("developer", e.target.value)}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>Lokalita</Label>
              <Input
                value={extractedData.location || ""}
                onChange={(e) => updateField("location", e.target.value)}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>Typ nemovitosti</Label>
              <Select
                value={extractedData.type || "Apartment"}
                onValueChange={(value) => updateField("type", value)}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Penthouse">Penthouse</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={extractedData.status || "Off-plan"}
                onValueChange={(value) => updateField("status", value)}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Off-plan">Off-plan</SelectItem>
                  <SelectItem value="Under Construction">Under Construction</SelectItem>
                  <SelectItem value="Ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cena od (číslo)</Label>
              <Input
                type="number"
                value={extractedData.priceFrom || ""}
                onChange={(e) => updateField("priceFrom", e.target.value ? Number(e.target.value) : null)}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>Cena formátovaná</Label>
              <Input
                value={extractedData.priceFormatted || ""}
                onChange={(e) => updateField("priceFormatted", e.target.value)}
                className="bg-card"
                placeholder="From USD 1,200,000"
              />
            </div>

            <div className="space-y-2">
              <Label>Počet ložnic</Label>
              <Input
                value={extractedData.bedrooms || ""}
                onChange={(e) => updateField("bedrooms", e.target.value)}
                className="bg-card"
                placeholder="1-3 BR"
              />
            </div>

            <div className="space-y-2">
              <Label>Plocha</Label>
              <Input
                value={extractedData.areaSqm || ""}
                onChange={(e) => updateField("areaSqm", e.target.value)}
                className="bg-card"
                placeholder="45 - 120 sqm"
              />
            </div>

            <div className="space-y-2">
              <Label>Dokončení</Label>
              <Input
                value={extractedData.completionDate || ""}
                onChange={(e) => updateField("completionDate", e.target.value)}
                className="bg-card"
                placeholder="Q4 2026"
              />
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label>Features</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {extractedData.features?.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <button onClick={() => removeFeature(index)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Přidat feature..."
                className="bg-card"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addFeature((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {extractedData.amenities?.map((amenity, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {amenity}
                  <button onClick={() => removeAmenity(index)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Přidat amenity..."
                className="bg-card"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addAmenity((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* Images */}
          {imageUrls.length > 0 && (
            <div className="space-y-2">
              <Label>Nalezené obrázky ({selectedImages.size} vybráno)</Label>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                      selectedImages.has(index) ? "border-primary" : "border-transparent opacity-50"
                    }`}
                    onClick={() => toggleImageSelection(index)}
                  >
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    {selectedImages.has(index) && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              Uložit projekt
            </Button>
            <Button variant="outline" onClick={() => setStep("input")}>
              Zrušit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Saving
  if (step === "saving") {
    return (
      <Card className="bg-background border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Ukládám projekt...</p>
            <p className="text-sm text-muted-foreground">Stahuji a nahrávám obrázky, vytvářím záznam v databázi.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 4: Done
  if (step === "done" && savedProperty) {
    return (
      <Card className="bg-background border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">Projekt úspěšně vytvořen!</p>
            <div className="text-center text-sm text-muted-foreground">
              <p><strong>Název:</strong> {savedProperty.name}</p>
              <p><strong>Slug:</strong> {savedProperty.slug}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Projekt byl vytvořen jako nepublikovaný. Zkontrolujte ho v sekci Nemovitosti a publikujte.
            </p>
            <Button onClick={handleReset} className="mt-4">
              <Import className="mr-2 h-4 w-4" />
              Importovat další projekt
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
