import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, ShieldCheck, icons as LucideIcons } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Amenity {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
}

export interface HouseRulesState {
  pets_allowed: boolean;
  smoking_allowed: boolean;
  children_allowed: boolean;
  check_in_time: string;   // "HH:MM"
  check_out_time: string;  // "HH:MM"
  house_rules: string;
}

interface Props {
  propertyId: string;
  rules: HouseRulesState;
  onRulesChange: (r: HouseRulesState) => void;
}

/** Picker vybavení (M:N přes rental_property_amenities) + editor domovních pravidel. */
export const RentalAmenitiesAndRulesManager = ({ propertyId, rules, onRulesChange }: Props) => {
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: amenities }, { data: linked }] = await Promise.all([
      supabase.from("rental_amenities").select("id,name,category,icon").eq("is_active", true).order("category").order("name"),
      supabase.from("rental_property_amenities").select("amenity_id").eq("property_id", propertyId),
    ]);
    setAllAmenities((amenities || []) as Amenity[]);
    setSelectedIds(new Set((linked || []).map((r: any) => r.amenity_id)));
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleAmenity = async (amenityId: string) => {
    setSaving(amenityId);
    const isSelected = selectedIds.has(amenityId);
    if (isSelected) {
      const { error } = await supabase
        .from("rental_property_amenities")
        .delete()
        .eq("property_id", propertyId)
        .eq("amenity_id", amenityId);
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
      } else {
        setSelectedIds(prev => { const n = new Set(prev); n.delete(amenityId); return n; });
      }
    } else {
      const { error } = await supabase
        .from("rental_property_amenities")
        .insert({ property_id: propertyId, amenity_id: amenityId });
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
      } else {
        setSelectedIds(prev => new Set(prev).add(amenityId));
      }
    }
    setSaving(null);
  };

  // Skupiny podle kategorie
  const grouped = allAmenities.reduce<Record<string, Amenity[]>>((acc, a) => {
    const key = a.category || "Ostatní";
    (acc[key] = acc[key] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Vybavení */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Wifi className="h-4 w-4" /> Vybavení
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : allAmenities.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Zatím nejsou v systému žádné položky vybavení. Admin je může přidat ve správě.
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{cat}</div>
                <div className="flex flex-wrap gap-2">
                  {items.map(a => {
                    const active = selectedIds.has(a.id);
                    const iconKey = a.icon
                      ? a.icon
                          .split(/[-_\s]/)
                          .filter(Boolean)
                          .map(s => s[0].toUpperCase() + s.slice(1).toLowerCase())
                          .join("")
                      : null;
                    const IconComp = iconKey ? (LucideIcons as any)[iconKey] : null;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={saving === a.id}
                        onClick={() => toggleAmenity(a.id)}
                        className="disabled:opacity-50"
                      >
                        <Badge
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer hover:opacity-80 transition gap-1"
                        >
                          {saving === a.id && <Loader2 className="h-3 w-3 animate-spin" />}
                          {IconComp && <IconComp className="h-3 w-3" />}
                          {a.name}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pravidla domu */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4" /> Pravidla domu
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={rules.pets_allowed}
              onCheckedChange={(c) => onRulesChange({ ...rules, pets_allowed: c })}
            />
            <Label>Domácí mazlíčci</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={rules.smoking_allowed}
              onCheckedChange={(c) => onRulesChange({ ...rules, smoking_allowed: c })}
            />
            <Label>Kouření</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={rules.children_allowed}
              onCheckedChange={(c) => onRulesChange({ ...rules, children_allowed: c })}
            />
            <Label>Děti vítány</Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Check-in od</Label>
            <Input
              type="time"
              value={rules.check_in_time}
              onChange={(e) => onRulesChange({ ...rules, check_in_time: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>Check-out do</Label>
            <Input
              type="time"
              value={rules.check_out_time}
              onChange={(e) => onRulesChange({ ...rules, check_out_time: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-1">
          <Label>Další pravidla (volitelné)</Label>
          <Textarea
            rows={3}
            value={rules.house_rules}
            onChange={(e) => onRulesChange({ ...rules, house_rules: e.target.value })}
            placeholder="Tichá hodina od 22:00, max 2 auta na příjezdu, ..."
          />
        </div>
      </div>
    </div>
  );
};
