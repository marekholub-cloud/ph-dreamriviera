import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RentalMediaManager } from "@/components/rentals/RentalMediaManager";
import { RentalAvailabilityManager } from "@/components/rentals/RentalAvailabilityManager";
import { RentalAmenitiesAndRulesManager, type HouseRulesState } from "@/components/rentals/RentalAmenitiesAndRulesManager";
import { RentalPricingManager } from "@/components/rentals/RentalPricingManager";
import { RentalRoomsManager } from "@/components/rentals/RentalRoomsManager";
import { SmartPricingCalendarTabs } from "@/components/rentals/SmartPricingCalendarTabs";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { ImportFromProjectButton, type ImportPayload } from "@/components/rentals/ImportFromProjectButton";

export interface RentalPropertyRow {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  property_type: string;
  rental_mode: string;
  status: string;
  city: string | null;
  district: string | null;
  country: string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  price_per_night: number | null;
  price_per_month: number | null;
  cleaning_fee: number;
  base_currency: string;
  instant_book_enabled: boolean;
  is_featured: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

const STATUSES_ALL = ["draft", "pending_approval", "approved", "active", "paused", "blocked", "archived"];
const STATUSES_HOST = ["draft", "pending_approval", "active", "paused"];
const RENTAL_MODES = ["entire_property", "rooms_only", "hybrid"];
const PROPERTY_TYPES = ["apartment", "villa", "studio", "house", "townhouse", "cabin", "other"];

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const emptyForm = {
  title: "", slug: "", description: "",
  property_type: "apartment", rental_mode: "entire_property", status: "draft",
  city: "", district: "", country: "Dubai",
  max_guests: 2, bedrooms: 1, bathrooms: 1, beds: 1,
  price_per_night: 0, price_per_month: 0, cleaning_fee: 0,
  base_currency: "USD", instant_book_enabled: false, is_featured: false,
  latitude: "" as string | number, longitude: "" as string | number,
  owner_id: "" as string,
};

type HostOption = { id: string; full_name: string | null; email: string };

const emptyRules: HouseRulesState = {
  pets_allowed: false,
  smoking_allowed: false,
  children_allowed: true,
  check_in_time: "15:00",
  check_out_time: "11:00",
  house_rules: "",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: RentalPropertyRow | null;
  onSaved: () => void;
  /** Admin vidí všechny statusy a může featured. Host má omezené možnosti. */
  isAdmin?: boolean;
}

export const RentalPropertyFormDialog = ({ open, onOpenChange, editing, onSaved, isAdmin = false }: Props) => {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [rules, setRules] = useState<HouseRulesState>(emptyRules);
  const [saving, setSaving] = useState(false);
  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);

  const STATUSES = isAdmin ? STATUSES_ALL : STATUSES_HOST;

  const handleImportFromProject = (p: ImportPayload) => {
    setForm((prev) => ({
      ...prev,
      title: prev.title || p.title,
      slug: prev.slug || slugify(p.title),
      description: prev.description || p.description,
      city: p.city ?? prev.city,
      district: p.district ?? prev.district,
      country: p.country ?? prev.country,
      latitude: p.latitude ?? prev.latitude,
      longitude: p.longitude ?? prev.longitude,
      bedrooms: p.bedrooms ?? prev.bedrooms,
      property_type: p.property_type ?? prev.property_type,
    }));
    setPendingPhotos(p.photoUrls || []);
  };

  // Load potential hosts (admin only) — users with role host or admin
  useEffect(() => {
    if (!isAdmin || !open) return;
    (async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["host", "admin"] as any);
      const ids = Array.from(new Set((roleRows || []).map((r: any) => r.user_id)));
      if (ids.length === 0) { setHosts([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids)
        .order("full_name", { ascending: true });
      setHosts((profs || []) as HostOption[]);
    })();
  }, [isAdmin, open]);

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title, slug: editing.slug, description: editing.description || "",
        property_type: editing.property_type, rental_mode: editing.rental_mode, status: editing.status,
        city: editing.city || "", district: editing.district || "", country: editing.country,
        max_guests: editing.max_guests, bedrooms: editing.bedrooms, bathrooms: editing.bathrooms, beds: editing.beds,
        price_per_night: editing.price_per_night || 0, price_per_month: editing.price_per_month || 0,
        cleaning_fee: editing.cleaning_fee, base_currency: editing.base_currency,
        instant_book_enabled: editing.instant_book_enabled,
        is_featured: editing.is_featured,
        latitude: editing.latitude ?? "",
        longitude: editing.longitude ?? "",
        owner_id: editing.owner_id,
      });
      // Načti pravidla zvlášť (nejsou v RentalPropertyRow)
      supabase
        .from("rental_properties")
        .select("pets_allowed,smoking_allowed,children_allowed,check_in_time,check_out_time,house_rules")
        .eq("id", editing.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setRules({
              pets_allowed: data.pets_allowed ?? false,
              smoking_allowed: data.smoking_allowed ?? false,
              children_allowed: data.children_allowed ?? true,
              check_in_time: (data.check_in_time as string)?.slice(0, 5) || "15:00",
              check_out_time: (data.check_out_time as string)?.slice(0, 5) || "11:00",
              house_rules: data.house_rules || "",
            });
          }
        });
    } else {
      setForm({ ...emptyForm, owner_id: user?.id ?? "" });
      setRules(emptyRules);
    }
  }, [editing, open, user?.id]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast({ title: "Vyplňte název", variant: "destructive" });
      return;
    }
    setSaving(true);

    const slug = form.slug.trim() || slugify(form.title);
    const { owner_id: chosenOwnerId, ...formNoOwner } = form;
    const payload: any = {
      ...formNoOwner,
      slug,
      price_per_night: form.price_per_night || null,
      price_per_month: form.price_per_month || null,
      latitude: form.latitude === "" || form.latitude === null ? null : Number(form.latitude),
      longitude: form.longitude === "" || form.longitude === null ? null : Number(form.longitude),
      // Pravidla domu
      pets_allowed: rules.pets_allowed,
      smoking_allowed: rules.smoking_allowed,
      children_allowed: rules.children_allowed,
      check_in_time: rules.check_in_time,
      check_out_time: rules.check_out_time,
      house_rules: rules.house_rules || null,
      // Host nemůže nastavit featured
      ...(isAdmin ? {} : { is_featured: editing?.is_featured ?? false }),
    };

    if (editing) {
      // Admin can reassign owner. Non-admin cannot change owner_id.
      const updatePayload = isAdmin && chosenOwnerId
        ? { ...payload, owner_id: chosenOwnerId }
        : payload;
      const { error } = await supabase.from("rental_properties").update(updatePayload).eq("id", editing.id);
      if (error) {
        toast({ title: "Chyba uložení", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Nemovitost upravena" });
    } else {
      // Insert RLS requires owner_id = auth.uid(). If admin chose a different host,
      // create as self then immediately reassign via update (allowed by admin policy).
      const { data: created, error } = await supabase
        .from("rental_properties")
        .insert({ ...payload, owner_id: user.id })
        .select("id")
        .maybeSingle();
      if (error) {
        toast({ title: "Chyba vytvoření", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      if (isAdmin && chosenOwnerId && chosenOwnerId !== user.id && created?.id) {
        const { error: reassignErr } = await supabase
          .from("rental_properties")
          .update({ owner_id: chosenOwnerId })
          .eq("id", created.id);
        if (reassignErr) {
          toast({ title: "Nemovitost vytvořena, ale přiřazení hostitele selhalo", description: reassignErr.message, variant: "destructive" });
        }
      }
      toast({ title: "Nemovitost vytvořena", description: "Pošlete ji ke schválení změnou statusu na 'pending_approval'." });
    }

    // Po uložení/vytvoření vlož čekající fotky z projektu (jen u nového záznamu)
    if (!editing && pendingPhotos.length > 0) {
      const targetId = (await supabase
        .from("rental_properties")
        .select("id")
        .eq("slug", slug)
        .maybeSingle()).data?.id;
      if (targetId) {
        const rows = pendingPhotos.map((url, idx) => ({
          property_id: targetId,
          file_url: url,
          file_type: "image" as const,
          sort_order: idx,
          is_cover: idx === 0,
        }));
        const { error: mediaErr } = await supabase.from("rental_media").insert(rows);
        if (mediaErr) {
          toast({ title: "Fotky se nepodařilo importovat", description: mediaErr.message, variant: "destructive" });
        } else {
          toast({ title: `Importováno ${rows.length} fotek z projektu` });
        }
      }
      setPendingPhotos([]);
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[62rem] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{editing ? "Upravit nemovitost" : "Nová nemovitost"}</DialogTitle>
          <DialogDescription>Základní informace o pronájmu. Fotky a kalendář spravujte v detailu (brzy).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {!editing && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/40">
              <div className="text-sm">
                <p className="font-medium">Vytvořit z investičního projektu</p>
                <p className="text-xs text-muted-foreground">
                  Načte lokalitu, souřadnice, popis, parametry a fotografie z katalogu (např. AZIZI Venice).
                </p>
                {pendingPhotos.length > 0 && (
                  <p className="text-xs text-primary mt-1">
                    ✓ Připraveno {pendingPhotos.length} fotek k importu po uložení
                  </p>
                )}
              </div>
              <ImportFromProjectButton onImport={handleImportFromProject} />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Název *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} placeholder="Beachfront Villa Tamarindo" />
          </div>

          <div className="grid gap-2">
            <Label>Slug (URL)</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="beachfront-villa-tamarindo" />
          </div>

          <div className="grid gap-2">
            <Label>Popis</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
          </div>

          {isAdmin && (
            <div className="grid gap-2">
              <Label>Hostitel (vlastník)</Label>
              <Select
                value={form.owner_id || (user?.id ?? "")}
                onValueChange={(v) => setForm({ ...form, owner_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Vyberte hostitele" /></SelectTrigger>
                <SelectContent>
                  {hosts.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.full_name || h.email}{h.full_name ? ` · ${h.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nemovitost bude přiřazena vybranému hostiteli. Hostitelé jsou uživatelé s rolí <strong>host</strong> nebo <strong>admin</strong>.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Typ</Label>
              <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Režim pronájmu</Label>
              <Select value={form.rental_mode} onValueChange={(v) => setForm({ ...form, rental_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RENTAL_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2"><Label>Země</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Město</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Oblast</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Zeměpisná šířka (latitude)</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="např. 10.2993"
                value={form.latitude as any}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Zeměpisná délka (longitude)</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="např. -85.8371"
                value={form.longitude as any}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground -mt-1">
              Souřadnice použité pro zobrazení nemovitosti na mapě v přehledu pronájmů. Najdete je v Google Maps – pravým klikem na místo, nebo použijte tlačítko níže.
            </p>
            <div className="col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMapPicker((v) => !v)}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {showMapPicker ? "Skrýt mapu" : "Vybrat polohu na mapě"}
              </Button>
            </div>
            {showMapPicker && (
              <div className="col-span-2 mt-2">
                <LocationPicker
                  latitude={form.latitude === "" || form.latitude === null ? null : Number(form.latitude)}
                  longitude={form.longitude === "" || form.longitude === null ? null : Number(form.longitude)}
                  propertyName={form.title}
                  onLocationChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="grid gap-2"><Label>Max. hostů</Label><Input type="number" value={form.max_guests} onChange={(e) => setForm({ ...form, max_guests: +e.target.value })} /></div>
            <div className="grid gap-2"><Label>Ložnice</Label><Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: +e.target.value })} /></div>
            <div className="grid gap-2"><Label>Postele</Label><Input type="number" value={form.beds} onChange={(e) => setForm({ ...form, beds: +e.target.value })} /></div>
            <div className="grid gap-2"><Label>Koupelny</Label><Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: +e.target.value })} /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2"><Label>Cena za noc ({form.base_currency})</Label><Input type="number" value={form.price_per_night} onChange={(e) => setForm({ ...form, price_per_night: +e.target.value })} /></div>
            <div className="grid gap-2"><Label>Cena za měsíc</Label><Input type="number" value={form.price_per_month} onChange={(e) => setForm({ ...form, price_per_month: +e.target.value })} /></div>
            <div className="grid gap-2"><Label>Úklid</Label><Input type="number" value={form.cleaning_fee} onChange={(e) => setForm({ ...form, cleaning_fee: +e.target.value })} /></div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={form.instant_book_enabled} onCheckedChange={(c) => setForm({ ...form, instant_book_enabled: c })} />
              <Label>Instant Book</Label>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(c) => setForm({ ...form, is_featured: c })} />
                <Label>Featured</Label>
              </div>
            )}
          </div>

          {editing && (
            <>
              <Separator />
              <RentalAmenitiesAndRulesManager
                propertyId={editing.id}
                rules={rules}
                onRulesChange={setRules}
              />
              <Separator />
              <RentalPricingManager propertyId={editing.id} />
              {(form.rental_mode === "hybrid" || form.rental_mode === "rooms_only") && (
                <>
                  <Separator />
                  <RentalRoomsManager propertyId={editing.id} />
                </>
              )}
              <SmartPricingCalendarTabs
                propertyId={editing.id}
                basePrice={form.price_per_night || null}
                baseCurrency={form.base_currency}
                rentalMode={form.rental_mode}
              />
              <Separator />
              <RentalMediaManager propertyId={editing.id} ownerId={editing.owner_id} />
              <Separator />
              <RentalAvailabilityManager propertyId={editing.id} />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Uložit" : "Vytvořit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
