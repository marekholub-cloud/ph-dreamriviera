import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BedDouble, Pencil, Plus, Trash2, Images, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RentalMediaManager } from "@/components/rentals/RentalMediaManager";
import { toast } from "@/hooks/use-toast";

type RentalRoomRow = Database["public"]["Tables"]["rental_rooms"]["Row"];
type RentalRoomType = Database["public"]["Enums"]["rental_room_type"];
type RentalRoomStatus = Database["public"]["Enums"]["rental_property_status"];

type RoomDraft = {
  name: string;
  description: string;
  room_type: RentalRoomType;
  max_guests: number;
  beds: number;
  price_per_night: string;
  price_per_month: string;
  has_private_bathroom: boolean;
  status: RentalRoomStatus;
  sort_order: number;
};

const ROOM_TYPE_LABELS: Record<RentalRoomType, string> = {
  private_room: "Soukromý pokoj",
  shared_room: "Sdílený pokoj",
  master_bedroom: "Master bedroom",
};

const STATUS_LABELS: Record<RentalRoomStatus, string> = {
  draft: "draft",
  pending_approval: "pending_approval",
  approved: "approved",
  active: "active",
  paused: "paused",
  blocked: "blocked",
  archived: "archived",
};

const createEmptyDraft = (sortOrder = 0): RoomDraft => ({
  name: "",
  description: "",
  room_type: "private_room",
  max_guests: 2,
  beds: 1,
  price_per_night: "",
  price_per_month: "",
  has_private_bathroom: false,
  status: "draft",
  sort_order: sortOrder,
});

export const RentalRoomsManager = ({ propertyId, ownerId }: { propertyId: string; ownerId?: string }) => {
  const [rooms, setRooms] = useState<RentalRoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoomDraft | null>(null);
  const [openMediaId, setOpenMediaId] = useState<string | null>(null);
  const [resolvedOwnerId, setResolvedOwnerId] = useState<string | null>(ownerId ?? null);

  useEffect(() => {
    if (ownerId) { setResolvedOwnerId(ownerId); return; }
    (async () => {
      const { data } = await supabase.from("rental_properties").select("owner_id").eq("id", propertyId).maybeSingle();
      if (data?.owner_id) setResolvedOwnerId(data.owner_id);
    })();
  }, [ownerId, propertyId]);

  const loadRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rental_rooms")
      .select("*")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true });

    if (error) {
      toast({ title: "Chyba načtení pokojů", description: error.message, variant: "destructive" });
    } else {
      setRooms((data as RentalRoomRow[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRooms();
  }, [propertyId]);

  const startCreate = () => {
    const nextSortOrder = rooms.length > 0 ? Math.max(...rooms.map((room) => room.sort_order || 0)) + 1 : 0;
    setEditingId(null);
    setDraft(createEmptyDraft(nextSortOrder));
  };

  const startEdit = (room: RentalRoomRow) => {
    setEditingId(room.id);
    setDraft({
      name: room.name,
      description: room.description || "",
      room_type: room.room_type,
      max_guests: room.max_guests,
      beds: room.beds,
      price_per_night: room.price_per_night?.toString() || "",
      price_per_month: room.price_per_month?.toString() || "",
      has_private_bathroom: room.has_private_bathroom,
      status: room.status,
      sort_order: room.sort_order,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleSave = async () => {
    if (!draft || !draft.name.trim()) {
      toast({ title: "Vyplňte název pokoje", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      property_id: propertyId,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      room_type: draft.room_type,
      max_guests: draft.max_guests,
      beds: draft.beds,
      price_per_night: draft.price_per_night === "" ? null : Number(draft.price_per_night),
      price_per_month: draft.price_per_month === "" ? null : Number(draft.price_per_month),
      has_private_bathroom: draft.has_private_bathroom,
      status: draft.status,
      sort_order: draft.sort_order,
    };

    const query = editingId
      ? supabase.from("rental_rooms").update(payload).eq("id", editingId)
      : supabase.from("rental_rooms").insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      toast({
        title: editingId ? "Chyba uložení pokoje" : "Chyba vytvoření pokoje",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: editingId ? "Pokoj upraven" : "Pokoj přidán" });
    resetForm();
    loadRooms();
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm("Opravdu smazat tento pokoj?")) return;

    const { error } = await supabase.from("rental_rooms").delete().eq("id", roomId);
    if (error) {
      toast({ title: "Chyba mazání pokoje", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Pokoj smazán" });
    if (editingId === roomId) resetForm();
    loadRooms();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-serif">
            <BedDouble className="h-4 w-4" /> Pokoje
          </CardTitle>
          <CardDescription>Zde zadáte jednotlivé pokoje pro hybridní nebo pokojový pronájem.</CardDescription>
        </div>
        {!draft && (
          <Button type="button" variant="outline" size="sm" onClick={startCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Přidat pokoj
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatím nejsou založené žádné pokoje.</p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => {
              const isMediaOpen = openMediaId === room.id;
              return (
                <div key={room.id} className="rounded-md border p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{room.name}</span>
                        <Badge variant="outline">{ROOM_TYPE_LABELS[room.room_type]}</Badge>
                        <Badge variant="secondary">{STATUS_LABELS[room.status]}</Badge>
                        {room.has_private_bathroom && <Badge variant="outline">Privátní koupelna</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {room.max_guests} hosté • {room.beds} lůžka • noc {room.price_per_night ?? "—"} • měsíc {room.price_per_month ?? "—"}
                      </p>
                      {room.description && <p className="text-sm text-muted-foreground">{room.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(room)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(room.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Collapsible open={isMediaOpen} onOpenChange={(o) => setOpenMediaId(o ? room.id : null)}>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="gap-2">
                        <Images className="h-4 w-4" />
                        {isMediaOpen ? "Skrýt fotogalerii" : "Spravovat fotogalerii"}
                        <ChevronDown className={`h-4 w-4 transition ${isMediaOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      {resolvedOwnerId ? (
                        <RentalMediaManager
                          roomId={room.id}
                          ownerId={resolvedOwnerId}
                          storageKey={propertyId}
                          title={`Fotky pokoje "${room.name}"`}
                          description="Fotky jsou viditelné na detailu pokoje. První nahraná je hlavní."
                        />
                      ) : (
                        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}

        {draft && (
          <div className="space-y-3 rounded-md border bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <Label>Název pokoje</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Např. Ložnice 1" />
              </div>
              <div className="grid gap-2">
                <Label>Typ pokoje</Label>
                <Select value={draft.room_type} onValueChange={(value: RentalRoomType) => setDraft({ ...draft, room_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private_room">Soukromý pokoj</SelectItem>
                    <SelectItem value="shared_room">Sdílený pokoj</SelectItem>
                    <SelectItem value="master_bedroom">Master bedroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Popis</Label>
              <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Max. hostů</Label>
                <Input type="number" min={1} value={draft.max_guests} onChange={(e) => setDraft({ ...draft, max_guests: Number(e.target.value) || 1 })} />
              </div>
              <div className="grid gap-2">
                <Label>Lůžka</Label>
                <Input type="number" min={1} value={draft.beds} onChange={(e) => setDraft({ ...draft, beds: Number(e.target.value) || 1 })} />
              </div>
              <div className="grid gap-2">
                <Label>Pořadí</Label>
                <Input type="number" min={0} value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Cena za noc</Label>
                <Input type="number" min={0} value={draft.price_per_night} onChange={(e) => setDraft({ ...draft, price_per_night: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Cena za měsíc</Label>
                <Input type="number" min={0} value={draft.price_per_month} onChange={(e) => setDraft({ ...draft, price_per_month: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(value: RentalRoomStatus) => setDraft({ ...draft, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="pending_approval">pending_approval</SelectItem>
                    <SelectItem value="approved">approved</SelectItem>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="paused">paused</SelectItem>
                    <SelectItem value="blocked">blocked</SelectItem>
                    <SelectItem value="archived">archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={draft.has_private_bathroom} onCheckedChange={(checked) => setDraft({ ...draft, has_private_bathroom: checked })} />
              <Label>Privátní koupelna</Label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>Zrušit</Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Uložit pokoj" : "Vytvořit pokoj"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};