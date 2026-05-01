import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Building2, 
  MapPin, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface ParsedArea {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  image_url: string;
  hero_image_url: string;
  hero_video_url: string;
}

interface ParsedDeveloper {
  id: string;
  name: string;
  logo_url: string;
  website: string;
  description: string;
}

interface ParsedImage {
  id: string;
  url: string;
  alt_text: string;
  sort_order: number;
}

interface ParsedProperty {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  price_from: number | null;
  price_formatted: string;
  payment_plan: string;
  bedrooms: string;
  area_sqm: string;
  completion_date: string;
  latitude: number | null;
  longitude: number | null;
  area: ParsedArea | null;
  developer: ParsedDeveloper | null;
  short_description: string;
  description: string;
  hero_image_url: string;
  hero_video_url: string;
  youtube_url: string;
  brochure_url: string;
  dropbox_folder_url: string;
  images: ParsedImage[];
  amenities: string[];
  features: string[];
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  selected: boolean;
}

interface ImportStats {
  areas: { total: number; imported: number; skipped: number };
  developers: { total: number; imported: number; skipped: number };
  properties: { total: number; imported: number; skipped: number };
  images: { total: number; imported: number; skipped: number };
}

type ImportStep = "upload" | "preview" | "importing" | "done";

export const XMLPropertyImporter = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsedProperties, setParsedProperties] = useState<ParsedProperty[]>([]);
  const [importStats, setImportStats] = useState<ImportStats>({
    areas: { total: 0, imported: 0, skipped: 0 },
    developers: { total: 0, imported: 0, skipped: 0 },
    properties: { total: 0, imported: 0, skipped: 0 },
    images: { total: 0, imported: 0, skipped: 0 },
  });
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const getTextContent = (element: Element | null): string => {
    if (!element) return "";
    return element.textContent?.trim() || "";
  };

  const parseXML = (xmlString: string): ParsedProperty[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "text/xml");
    
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid XML format");
    }

    const propertyElements = doc.querySelectorAll("property");
    const properties: ParsedProperty[] = [];

    propertyElements.forEach((propEl) => {
      // Parse area
      const areaEl = propEl.querySelector("area");
      let area: ParsedArea | null = null;
      if (areaEl) {
        area = {
          id: getTextContent(areaEl.querySelector("id")),
          name: getTextContent(areaEl.querySelector("name")),
          city: getTextContent(areaEl.querySelector("city")),
          country: getTextContent(areaEl.querySelector("country")),
          description: getTextContent(areaEl.querySelector("description")),
          image_url: getTextContent(areaEl.querySelector("image_url")),
          hero_image_url: getTextContent(areaEl.querySelector("hero_image_url")),
          hero_video_url: getTextContent(areaEl.querySelector("hero_video_url")),
        };
      }

      // Parse developer
      const devEl = propEl.querySelector("developer");
      let developer: ParsedDeveloper | null = null;
      if (devEl) {
        developer = {
          id: getTextContent(devEl.querySelector("id")),
          name: getTextContent(devEl.querySelector("name")),
          logo_url: getTextContent(devEl.querySelector("logo_url")),
          website: getTextContent(devEl.querySelector("website")),
          description: getTextContent(devEl.querySelector("description")),
        };
      }

      // Parse images
      const imageElements = propEl.querySelectorAll("images > image");
      const images: ParsedImage[] = [];
      imageElements.forEach((imgEl) => {
        images.push({
          id: getTextContent(imgEl.querySelector("id")),
          url: getTextContent(imgEl.querySelector("url")),
          alt_text: getTextContent(imgEl.querySelector("alt_text")),
          sort_order: parseInt(imgEl.getAttribute("sort_order") || "0", 10),
        });
      });

      // Parse amenities
      const amenityElements = propEl.querySelectorAll("amenities > amenity");
      const amenities: string[] = [];
      amenityElements.forEach((amEl) => {
        const text = amEl.textContent?.trim();
        if (text) amenities.push(text);
      });

      // Parse features
      const featureElements = propEl.querySelectorAll("features > feature");
      const features: string[] = [];
      featureElements.forEach((fEl) => {
        const text = fEl.textContent?.trim();
        if (text) features.push(text);
      });

      // Parse pricing
      const pricingEl = propEl.querySelector("pricing");
      const priceFromText = getTextContent(pricingEl?.querySelector("price_from") || null);
      
      // Parse location
      const locationEl = propEl.querySelector("location");
      const latText = getTextContent(locationEl?.querySelector("latitude") || null);
      const lngText = getTextContent(locationEl?.querySelector("longitude") || null);

      // Parse flags
      const flagsEl = propEl.querySelector("flags");
      const isFeatured = getTextContent(flagsEl?.querySelector("is_featured") || null) === "true";
      const isPublished = getTextContent(flagsEl?.querySelector("is_published") || null) === "true";

      // Parse timestamps
      const timestampsEl = propEl.querySelector("timestamps");

      const property: ParsedProperty = {
        id: propEl.getAttribute("id") || "",
        name: getTextContent(propEl.querySelector("name")),
        slug: getTextContent(propEl.querySelector("slug")),
        type: getTextContent(propEl.querySelector("type")),
        status: getTextContent(propEl.querySelector("status")),
        price_from: priceFromText ? parseFloat(priceFromText) : null,
        price_formatted: getTextContent(pricingEl?.querySelector("price_formatted") || null),
        payment_plan: getTextContent(pricingEl?.querySelector("payment_plan") || null),
        bedrooms: getTextContent(propEl.querySelector("details > bedrooms")),
        area_sqm: getTextContent(propEl.querySelector("details > area_sqm")),
        completion_date: getTextContent(propEl.querySelector("details > completion_date")),
        latitude: latText ? parseFloat(latText) : null,
        longitude: lngText ? parseFloat(lngText) : null,
        area,
        developer,
        short_description: getTextContent(propEl.querySelector("content > short_description")),
        description: getTextContent(propEl.querySelector("content > description")),
        hero_image_url: getTextContent(propEl.querySelector("media > hero_image_url")),
        hero_video_url: getTextContent(propEl.querySelector("media > hero_video_url")),
        youtube_url: getTextContent(propEl.querySelector("media > youtube_url")),
        brochure_url: getTextContent(propEl.querySelector("media > brochure_url")),
        dropbox_folder_url: getTextContent(propEl.querySelector("media > dropbox_folder_url")),
        images,
        amenities,
        features,
        is_featured: isFeatured,
        is_published: isPublished,
        created_at: getTextContent(timestampsEl?.querySelector("created_at") || null),
        updated_at: getTextContent(timestampsEl?.querySelector("updated_at") || null),
        selected: true,
      };

      properties.push(property);
    });

    return properties;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xml")) {
      toast.error("Nahrajte prosím XML soubor");
      return;
    }

    try {
      const text = await file.text();
      const properties = parseXML(text);
      
      if (properties.length === 0) {
        toast.error("V souboru nebyly nalezeny žádné nemovitosti");
        return;
      }

      setParsedProperties(properties);
      setStep("preview");
      toast.success(`Načteno ${properties.length} nemovitostí`);
    } catch (error) {
      toast.error("Chyba při čtení XML: " + (error instanceof Error ? error.message : "Neznámá chyba"));
    }
  };

  const toggleProperty = (index: number) => {
    setParsedProperties((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = () => {
    setParsedProperties((prev) => prev.map((p) => ({ ...p, selected: true })));
  };

  const deselectAll = () => {
    setParsedProperties((prev) => prev.map((p) => ({ ...p, selected: false })));
  };

  const importData = async () => {
    const selectedProperties = parsedProperties.filter((p) => p.selected);
    if (selectedProperties.length === 0) {
      toast.error("Vyberte alespoň jednu nemovitost k importu");
      return;
    }

    setStep("importing");
    setProgress(0);
    setErrors([]);

    const stats: ImportStats = {
      areas: { total: 0, imported: 0, skipped: 0 },
      developers: { total: 0, imported: 0, skipped: 0 },
      properties: { total: selectedProperties.length, imported: 0, skipped: 0 },
      images: { total: 0, imported: 0, skipped: 0 },
    };

    // Collect unique areas and developers
    const uniqueAreas = new Map<string, ParsedArea>();
    const uniqueDevelopers = new Map<string, ParsedDeveloper>();

    selectedProperties.forEach((p) => {
      if (p.area && p.area.id) {
        uniqueAreas.set(p.area.id, p.area);
      }
      if (p.developer && p.developer.id) {
        uniqueDevelopers.set(p.developer.id, p.developer);
      }
      stats.images.total += p.images.length;
    });

    stats.areas.total = uniqueAreas.size;
    stats.developers.total = uniqueDevelopers.size;

    const totalSteps = stats.areas.total + stats.developers.total + stats.properties.total;
    let currentStep = 0;

    const areaIdMap = new Map<string, string>();
    const developerIdMap = new Map<string, string>();

    try {
      // Import areas
      setCurrentAction("Importuji lokality...");
      for (const [oldId, area] of uniqueAreas) {
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);

        // Check if area with same name exists
        const { data: existingArea } = await supabase
          .from("areas")
          .select("id")
          .eq("name", area.name)
          .eq("city", area.city)
          .maybeSingle();

        if (existingArea) {
          areaIdMap.set(oldId, existingArea.id);
          stats.areas.skipped++;
        } else {
          const { data: newArea, error } = await supabase
            .from("areas")
            .insert({
              name: area.name,
              city: area.city,
              country: area.country || "UAE",
              description: area.description || null,
              image_url: area.image_url || null,
              hero_image_url: area.hero_image_url || null,
              hero_video_url: area.hero_video_url || null,
            })
            .select("id")
            .single();

          if (error) {
            setErrors((prev) => [...prev, `Chyba při importu lokality ${area.name}: ${error.message}`]);
          } else if (newArea) {
            areaIdMap.set(oldId, newArea.id);
            stats.areas.imported++;
          }
        }
      }

      // Import developers
      setCurrentAction("Importuji developery...");
      for (const [oldId, developer] of uniqueDevelopers) {
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);

        // Check if developer with same name exists
        const { data: existingDev } = await supabase
          .from("developers")
          .select("id")
          .eq("name", developer.name.trim())
          .maybeSingle();

        if (existingDev) {
          developerIdMap.set(oldId, existingDev.id);
          stats.developers.skipped++;
        } else {
          const { data: newDev, error } = await supabase
            .from("developers")
            .insert({
              name: developer.name.trim(),
              logo_url: developer.logo_url || null,
              website: developer.website || null,
              description: developer.description || null,
            })
            .select("id")
            .single();

          if (error) {
            setErrors((prev) => [...prev, `Chyba při importu developera ${developer.name}: ${error.message}`]);
          } else if (newDev) {
            developerIdMap.set(oldId, newDev.id);
            stats.developers.imported++;
          }
        }
      }

      // Import properties
      setCurrentAction("Importuji nemovitosti...");
      for (const property of selectedProperties) {
        currentStep++;
        setProgress((currentStep / totalSteps) * 100);

        // Check if property with same slug exists
        const { data: existingProp } = await supabase
          .from("properties")
          .select("id")
          .eq("slug", property.slug)
          .maybeSingle();

        if (existingProp) {
          stats.properties.skipped++;
          setErrors((prev) => [...prev, `Nemovitost "${property.name}" již existuje (slug: ${property.slug})`]);
          continue;
        }

        const newAreaId = property.area?.id ? areaIdMap.get(property.area.id) : null;
        const newDevId = property.developer?.id ? developerIdMap.get(property.developer.id) : null;

        const { data: newProp, error: propError } = await supabase
          .from("properties")
          .insert({
            name: property.name,
            slug: property.slug,
            type: property.type || "Apartment",
            status: property.status || "Off-plan",
            price_from: property.price_from,
            price_formatted: property.price_formatted || null,
            payment_plan: property.payment_plan || null,
            bedrooms: property.bedrooms || null,
            area_sqm: property.area_sqm || null,
            completion_date: property.completion_date || null,
            latitude: property.latitude,
            longitude: property.longitude,
            area_id: newAreaId || null,
            developer_id: newDevId || null,
            short_description: property.short_description || null,
            description: property.description || null,
            hero_image_url: property.hero_image_url || null,
            hero_video_url: property.hero_video_url || null,
            youtube_url: property.youtube_url || null,
            brochure_url: property.brochure_url || null,
            dropbox_folder_url: property.dropbox_folder_url || null,
            amenities: property.amenities,
            features: property.features,
            is_featured: property.is_featured,
            is_published: property.is_published,
          })
          .select("id")
          .single();

        if (propError) {
          setErrors((prev) => [...prev, `Chyba při importu "${property.name}": ${propError.message}`]);
          stats.properties.skipped++;
          continue;
        }

        stats.properties.imported++;

        // Import images
        if (newProp && property.images.length > 0) {
          const imageInserts = property.images.map((img) => ({
            property_id: newProp.id,
            image_url: img.url,
            alt_text: img.alt_text || null,
            sort_order: img.sort_order,
          }));

          const { error: imgError } = await supabase
            .from("property_images")
            .insert(imageInserts);

          if (imgError) {
            setErrors((prev) => [...prev, `Chyba při importu obrázků pro "${property.name}": ${imgError.message}`]);
          } else {
            stats.images.imported += property.images.length;
          }
        }
      }

      setImportStats(stats);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      queryClient.invalidateQueries({ queryKey: ["developers"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Import dokončen!");
    } catch (error) {
      setErrors((prev) => [...prev, `Neočekávaná chyba: ${error instanceof Error ? error.message : "Neznámá chyba"}`]);
      setStep("done");
    }
  };

  const reset = () => {
    setStep("upload");
    setParsedProperties([]);
    setImportStats({
      areas: { total: 0, imported: 0, skipped: 0 },
      developers: { total: 0, imported: 0, skipped: 0 },
      properties: { total: 0, imported: 0, skipped: 0 },
      images: { total: 0, imported: 0, skipped: 0 },
    });
    setProgress(0);
    setCurrentAction("");
    setErrors([]);
  };

  const selectedCount = parsedProperties.filter((p) => p.selected).length;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import nemovitostí z XML
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nahrajte XML soubor exportovaný z mateřského systému. Soubor může obsahovat nemovitosti, lokality, developery a obrázky.
            </p>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Input
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="hidden"
                id="xml-upload"
              />
              <label
                htmlFor="xml-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <FileText className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Klikněte pro výběr XML souboru
                </span>
                <Button variant="outline" type="button" asChild>
                  <span>Vybrat soubor</span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">Náhled dat k importu</h3>
                <p className="text-sm text-muted-foreground">
                  Vybráno {selectedCount} z {parsedProperties.length} nemovitostí
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Vybrat vše
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Zrušit výběr
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-3">
                {parsedProperties.map((property, index) => (
                  <div
                    key={property.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      property.selected
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <Checkbox
                      checked={property.selected}
                      onCheckedChange={() => toggleProperty(index)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{property.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {property.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {property.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {property.developer && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {property.developer.name}
                          </span>
                        )}
                        {property.area && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {property.area.name}, {property.area.city}
                          </span>
                        )}
                        {property.price_formatted && (
                          <span className="font-medium text-foreground">
                            {property.price_formatted}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {property.images.length} obrázků
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Zpět
              </Button>
              <Button onClick={importData} disabled={selectedCount === 0}>
                Importovat {selectedCount} nemovitostí
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="font-medium">Probíhá import...</h3>
                <p className="text-sm text-muted-foreground">{currentAction}</p>
              </div>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(progress)}% dokončeno
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <div>
                <h3 className="font-medium text-foreground">Import dokončen</h3>
                <p className="text-sm text-muted-foreground">
                  Níže je přehled importovaných dat
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {importStats.areas.imported}
                </div>
                <div className="text-sm text-muted-foreground">
                  Nových lokalit
                </div>
                {importStats.areas.skipped > 0 && (
                  <div className="text-xs text-muted-foreground">
                    ({importStats.areas.skipped} přeskočeno)
                  </div>
                )}
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {importStats.developers.imported}
                </div>
                <div className="text-sm text-muted-foreground">
                  Nových developerů
                </div>
                {importStats.developers.skipped > 0 && (
                  <div className="text-xs text-muted-foreground">
                    ({importStats.developers.skipped} přeskočeno)
                  </div>
                )}
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {importStats.properties.imported}
                </div>
                <div className="text-sm text-muted-foreground">
                  Nových nemovitostí
                </div>
                {importStats.properties.skipped > 0 && (
                  <div className="text-xs text-muted-foreground">
                    ({importStats.properties.skipped} přeskočeno)
                  </div>
                )}
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {importStats.images.imported}
                </div>
                <div className="text-sm text-muted-foreground">
                  Importovaných obrázků
                </div>
              </Card>
            </div>

            {errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Upozornění ({errors.length})</span>
                </div>
                <ScrollArea className="h-[150px] border rounded-lg p-3">
                  <div className="space-y-1">
                    {errors.map((error, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        • {error}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Importovat další soubor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
