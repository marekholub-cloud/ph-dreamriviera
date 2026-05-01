import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface PropertyRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  short_description: string | null;
  bedrooms: string | null;
  area_sqm: string | null;
  hero_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  area_id: string | null;
  areas?: { name: string; city: string; country: string } | null;
}

interface UnitTypeRow {
  id: string;
  name: string;
  category: string;
}

export interface ImportPayload {
  title: string;
  description: string;
  city?: string;
  district?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number;
  property_type?: string;
  square_meters?: number;
  photoUrls: string[];
}

interface Props {
  onImport: (payload: ImportPayload) => void;
}

const RENTAL_TYPE_MAP: Record<string, string> = {
  Apartment: "apartment",
  Villa: "villa",
  Studio: "studio",
  Townhouse: "townhouse",
  Penthouse: "apartment",
  House: "house",
};

export const ImportFromProjectButton = ({ onImport }: Props) => {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<PropertyRow[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitTypeRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedUnitTypeId, setSelectedUnitTypeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("properties")
        .select("id, name, slug, type, description, short_description, bedrooms, area_sqm, hero_image_url, latitude, longitude, area_id, areas:areas(name, city, country)")
        .eq("is_published", true)
        .order("name", { ascending: true }),
      supabase.from("unit_types").select("id, name, category").eq("is_active", true).order("sort_order"),
    ])
      .then(([projRes, unitRes]) => {
        setProjects((projRes.data as any) || []);
        setUnitTypes((unitRes.data as any) || []);
      })
      .catch(() => {
        toast({ title: "Import se nepodařilo načíst", variant: "destructive" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const selectedUnit = useMemo(
    () => unitTypes.find((u) => u.id === selectedUnitTypeId),
    [unitTypes, selectedUnitTypeId],
  );

  const handleImport = async () => {
    if (!selectedProject) {
      toast({ title: "Vyberte projekt", variant: "destructive" });
      return;
    }
    setImporting(true);

    // Načti fotky projektu
    const { data: imgs } = await supabase
      .from("property_images")
      .select("image_url, sort_order")
      .eq("property_id", selectedProject.id)
      .order("sort_order", { ascending: true });

    const photoUrls: string[] = [];
    if (selectedProject.hero_image_url) photoUrls.push(selectedProject.hero_image_url);
    (imgs || []).forEach((i: any) => {
      if (i.image_url && !photoUrls.includes(i.image_url)) photoUrls.push(i.image_url);
    });

    // Bedrooms parse (může být "1", "1BR", "Studio" apod.)
    let bedrooms: number | undefined;
    const bedSrc = selectedUnit?.name || selectedProject.bedrooms || "";
    if (/studio/i.test(bedSrc)) bedrooms = 0;
    else {
      const m = bedSrc.match(/(\d+)/);
      if (m) bedrooms = parseInt(m[1], 10);
    }

    // Plocha
    let square_meters: number | undefined;
    if (selectedProject.area_sqm) {
      const m = selectedProject.area_sqm.match(/(\d+)/);
      if (m) square_meters = parseInt(m[1], 10);
    }

    // Property type
    const property_type =
      RENTAL_TYPE_MAP[selectedProject.type] ||
      (selectedUnit?.category && /studio/i.test(selectedUnit.category) ? "studio" : "apartment");

    const title = selectedUnit
      ? `${selectedProject.name} – ${selectedUnit.name}`
      : selectedProject.name;

    const description =
      selectedProject.description ||
      selectedProject.short_description ||
      "";

    const payload: ImportPayload = {
      title,
      description,
      city: selectedProject.areas?.city || undefined,
      district: selectedProject.areas?.name || undefined,
      country: selectedProject.areas?.country || undefined,
      latitude: selectedProject.latitude,
      longitude: selectedProject.longitude,
      bedrooms,
      property_type,
      square_meters,
      photoUrls,
    };

    onImport(payload);
    setImporting(false);
    setOpen(false);
    setSelectedProjectId("");
    setSelectedUnitTypeId("");
    toast({
      title: "Údaje načteny z projektu",
      description: `${photoUrls.length} fotek bude přidáno po uložení nemovitosti.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Načíst z projektu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Import z investičního projektu</DialogTitle>
          <DialogDescription>
            Vyberte projekt a případně konkrétní jednotku. Předvyplníme lokalitu, souřadnice, název, popis, parametry a připravíme fotografie.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Projekt *</p>
                {selectedProject && (
                  <p className="text-xs text-muted-foreground">
                    Vybráno: {selectedProject.name} · {[selectedProject.areas?.name, selectedProject.areas?.city].filter(Boolean).join(", ") || "—"}
                  </p>
                )}
              </div>
              <Command className="rounded-md border bg-background">
                <CommandInput placeholder="Hledat projekt..." />
                <CommandList className="max-h-64">
                  <CommandEmpty>Žádný projekt nenalezen.</CommandEmpty>
                  <CommandGroup>
                    {projects.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.name} ${p.areas?.name || ""} ${p.areas?.city || ""}`}
                        onSelect={() => setSelectedProjectId(p.id)}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedProjectId === p.id ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {[p.areas?.name, p.areas?.city].filter(Boolean).join(", ") || "—"}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Typ jednotky (volitelné)</p>
                <p className="text-xs text-muted-foreground">
                  Když vyberete jednotku, doplníme přesnější název a parametry bytu.
                </p>
              </div>
              <Command className="rounded-md border bg-background">
                <CommandInput placeholder="Hledat typ jednotky..." />
                <CommandList className="max-h-64">
                  <CommandEmpty>Žádný typ nenalezen.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="Bez konkrétní jednotky" onSelect={() => setSelectedUnitTypeId("") }>
                      <Check className={cn("mr-2 h-4 w-4", !selectedUnitTypeId ? "opacity-100" : "opacity-0")} />
                      Bez konkrétní jednotky
                    </CommandItem>
                    {unitTypes.map((u) => (
                      <CommandItem
                        key={u.id}
                        value={`${u.name} ${u.category}`}
                        onSelect={() => setSelectedUnitTypeId(u.id)}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedUnitTypeId === u.id ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span>{u.name}</span>
                          <span className="text-xs text-muted-foreground">{u.category}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground lg:col-span-2">
              <p className="font-medium text-foreground">K importu</p>
              <ul className="mt-2 space-y-1">
                <li>• Lokalita: město, oblast a souřadnice</li>
                <li>• Obsah: název, popis a typ nemovitosti</li>
                <li>• Parametry: ložnice a plocha</li>
                <li>• Média: hlavní fotka a galerie projektu</li>
              </ul>
              {selectedUnit && (
                <p className="mt-3 text-xs">Vybraná jednotka: {selectedUnit.name}</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleImport} disabled={!selectedProjectId || importing || loading} className="gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Načíst údaje
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
