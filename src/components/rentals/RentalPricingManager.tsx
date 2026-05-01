import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2, Tag, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type RuleType = "seasonal" | "weekend" | "length_of_stay";
type AdjustmentType = "percentage" | "fixed_amount" | "override_price";

interface PricingRule {
  id: string;
  property_id: string;
  room_id: string | null;
  name: string;
  rule_type: RuleType;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  start_date: string | null;
  end_date: string | null;
  weekdays: number[] | null;
  min_nights: number | null;
  max_nights: number | null;
  priority: number;
  is_active: boolean;
  notes: string | null;
}

interface RentalRoomLite { id: string; name: string; }

const WEEKDAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const emptyRule = (propertyId: string): Omit<PricingRule, "id"> => ({
  property_id: propertyId,
  room_id: null,
  name: "",
  rule_type: "seasonal",
  adjustment_type: "percentage",
  adjustment_value: 0,
  start_date: null,
  end_date: null,
  weekdays: null,
  min_nights: null,
  max_nights: null,
  priority: 0,
  is_active: true,
  notes: null,
});

export const RentalPricingManager = ({ propertyId }: { propertyId: string }) => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [rooms, setRooms] = useState<RentalRoomLite[]>([]);
  const [rentalMode, setRentalMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<(Omit<PricingRule, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const isHybrid = rentalMode === "hybrid";

  const load = async () => {
    setLoading(true);
    const [rulesRes, propRes, roomsRes] = await Promise.all([
      supabase.from("rental_pricing_rules").select("*").eq("property_id", propertyId).order("priority", { ascending: false }),
      supabase.from("rental_properties").select("rental_mode").eq("id", propertyId).maybeSingle(),
      supabase.from("rental_rooms").select("id,name").eq("property_id", propertyId).order("sort_order"),
    ]);
    if (rulesRes.error) toast({ title: "Chyba načtení pravidel", description: rulesRes.error.message, variant: "destructive" });
    else setRules((rulesRes.data as PricingRule[]) || []);
    setRentalMode((propRes.data as any)?.rental_mode ?? null);
    setRooms((roomsRes.data as RentalRoomLite[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [propertyId]);

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast({ title: "Vyplňte název pravidla", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { id, ...payload } = draft;
    const { error } = id
      ? await supabase.from("rental_pricing_rules").update(payload).eq("id", id)
      : await supabase.from("rental_pricing_rules").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Chyba uložení", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: id ? "Pravidlo upraveno" : "Pravidlo přidáno" });
    setDraft(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("rental_pricing_rules").delete().eq("id", id);
    if (error) toast({ title: "Chyba mazání", description: error.message, variant: "destructive" });
    else { toast({ title: "Pravidlo smazáno" }); load(); }
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("rental_pricing_rules").update({ is_active }).eq("id", id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else load();
  };

  const renderRuleSummary = (r: PricingRule) => {
    const adj =
      r.adjustment_type === "percentage" ? `${r.adjustment_value > 0 ? "+" : ""}${r.adjustment_value}%`
      : r.adjustment_type === "fixed_amount" ? `${r.adjustment_value > 0 ? "+" : ""}${r.adjustment_value}`
      : `= ${r.adjustment_value}`;
    if (r.rule_type === "seasonal") return `${r.start_date} → ${r.end_date}: ${adj}`;
    if (r.rule_type === "weekend") return `Dny: ${(r.weekdays || []).map((d) => WEEKDAY_LABELS[d]).join(", ")} → ${adj}`;
    return `${r.min_nights}+ nocí${r.max_nights ? ` (max ${r.max_nights})` : ""}: ${adj}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif"><Tag className="h-5 w-5" /> Cenotvorba</CardTitle>
        <CardDescription>Sezónní ceny, víkendové přirážky a slevy za délku pobytu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatím žádná pravidla. Použije se základní cena za noc.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="outline">{r.rule_type}</Badge>
                    <Badge variant="secondary">priorita {r.priority}</Badge>
                    {isHybrid && (
                      <Badge variant="outline" className="bg-primary/10">
                        {r.room_id ? (rooms.find(rm => rm.id === r.room_id)?.name || "Pokoj") : "Celá nemovitost"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{renderRuleSummary(r)}</p>
                </div>
                <Switch checked={r.is_active} onCheckedChange={(c) => handleToggleActive(r.id, c)} />
                <Button variant="ghost" size="icon" onClick={() => setDraft({ ...r })} title="Upravit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} title="Smazat">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!draft ? (
          <Button variant="outline" onClick={() => setDraft(emptyRule(propertyId))}>
            <Plus className="h-4 w-4 mr-2" /> Přidat pravidlo
          </Button>
        ) : (
          <div className="rounded-md border p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Název</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Např. Vysoká sezóna" />
              </div>
              <div className="grid gap-2">
                <Label>Typ pravidla</Label>
                <Select value={draft.rule_type} onValueChange={(v: RuleType) => setDraft({ ...draft, rule_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seasonal">Sezónní (datum)</SelectItem>
                    <SelectItem value="weekend">Víkend / dny v týdnu</SelectItem>
                    <SelectItem value="length_of_stay">Sleva za délku pobytu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isHybrid && (
              <div className="grid gap-2">
                <Label>Platí pro</Label>
                <Select
                  value={draft.room_id ?? "__all__"}
                  onValueChange={(v) => setDraft({ ...draft, room_id: v === "__all__" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Celá nemovitost (všechny pokoje)</SelectItem>
                    {rooms.map((rm) => (
                      <SelectItem key={rm.id} value={rm.id}>{rm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  V hybridním režimu lze nastavit cenotvorbu zvlášť pro každý pokoj nebo pro celý objekt.
                </p>
              </div>
            )}

            {draft.rule_type === "seasonal" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Od</Label>
                  <Input type="date" value={draft.start_date || ""} onChange={(e) => setDraft({ ...draft, start_date: e.target.value || null })} />
                </div>
                <div className="grid gap-2">
                  <Label>Do</Label>
                  <Input type="date" value={draft.end_date || ""} onChange={(e) => setDraft({ ...draft, end_date: e.target.value || null })} />
                </div>
              </div>
            )}

            {draft.rule_type === "weekend" && (
              <div className="grid gap-2">
                <Label>Vyberte dny</Label>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAY_LABELS.map((label, idx) => {
                    const checked = draft.weekdays?.includes(idx) ?? false;
                    return (
                      <Button
                        key={idx}
                        type="button"
                        variant={checked ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const cur = new Set(draft.weekdays || []);
                          if (checked) cur.delete(idx); else cur.add(idx);
                          setDraft({ ...draft, weekdays: Array.from(cur).sort() });
                        }}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {draft.rule_type === "length_of_stay" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Min. nocí</Label>
                  <Input type="number" value={draft.min_nights ?? ""} onChange={(e) => setDraft({ ...draft, min_nights: e.target.value ? +e.target.value : null })} />
                </div>
                <div className="grid gap-2">
                  <Label>Max. nocí (volitelné)</Label>
                  <Input type="number" value={draft.max_nights ?? ""} onChange={(e) => setDraft({ ...draft, max_nights: e.target.value ? +e.target.value : null })} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Typ úpravy</Label>
                <Select value={draft.adjustment_type} onValueChange={(v: AdjustmentType) => setDraft({ ...draft, adjustment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Procenta (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixní částka</SelectItem>
                    {draft.rule_type !== "length_of_stay" && (
                      <SelectItem value="override_price">Přepsat cenu</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Hodnota {draft.rule_type === "length_of_stay" && draft.adjustment_type === "percentage" && "(záporné = sleva)"}</Label>
                <Input type="number" step="0.01" value={draft.adjustment_value} onChange={(e) => setDraft({ ...draft, adjustment_value: +e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Priorita</Label>
                <Input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: +e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDraft(null)}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {draft.id ? "Uložit změny" : "Uložit pravidlo"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
