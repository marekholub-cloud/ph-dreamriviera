import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Home, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RentalPropertyFormDialog, type RentalPropertyRow } from "@/components/rentals/RentalPropertyFormDialog";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-yellow-500/20 text-yellow-700",
  approved: "bg-blue-500/20 text-blue-700",
  active: "bg-green-500/20 text-green-700",
  paused: "bg-orange-500/20 text-orange-700",
  blocked: "bg-red-500/20 text-red-700",
  archived: "bg-gray-500/20 text-gray-700",
};

type HostInfo = { full_name: string | null; email: string };

export const RentalPropertiesManager = () => {
  const [properties, setProperties] = useState<RentalPropertyRow[]>([]);
  const [hostsMap, setHostsMap] = useState<Record<string, HostInfo>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RentalPropertyRow | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rental_properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data || []) as RentalPropertyRow[];
    setProperties(rows);

    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean)));
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ownerIds);
      const map: Record<string, HostInfo> = {};
      (profs || []).forEach((p: any) => { map[p.id] = { full_name: p.full_name, email: p.email }; });
      setHostsMap(map);
    } else {
      setHostsMap({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: RentalPropertyRow) => { setEditing(p); setDialogOpen(true); };

  const handleDelete = async (id: string) => {
    if (!confirm("Opravdu smazat tuto nemovitost? Tato akce je nevratná.")) return;
    const { error } = await supabase.from("rental_properties").delete().eq("id", id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Smazáno" }); fetchProperties(); }
  };

  const duplicate = async (p: RentalPropertyRow) => {
    if (!confirm(`Duplikovat "${p.title}"? Vznikne nová nemovitost ve stavu draft.`)) return;
    const { id, created_at, updated_at, published_at, slug, average_rating, reviews_count, ...rest } = p as any;
    const baseSlug = (slug || p.title || "rental").toString().replace(/-copy(-\d+)?$/, "");
    const newSlug = `${baseSlug}-copy-${Date.now().toString(36)}`;
    const payload = {
      ...rest,
      title: `${p.title} (kopie)`,
      slug: newSlug,
      status: "draft",
      published_at: null,
      is_featured: false,
      average_rating: 0,
      reviews_count: 0,
    };
    const { error } = await supabase.from("rental_properties").insert(payload);
    if (error) toast({ title: "Nelze duplikovat", description: error.message, variant: "destructive" });
    else { toast({ title: "Nemovitost duplikována" }); fetchProperties(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" /> Pronájmy – nemovitosti
          </CardTitle>
          <CardDescription>Spravujte všechny listingy v systému (admin)</CardDescription>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nová nemovitost
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Zatím žádné pronájmy. Vytvořte první nemovitost.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Hostitel</TableHead>
                <TableHead>Lokalita</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Režim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cena/noc</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => {
                const host = hostsMap[p.owner_id];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.title}
                      {p.is_featured && <Badge className="ml-2" variant="outline">Featured</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {host ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{host.full_name || host.email}</span>
                          {host.full_name && <span className="text-xs text-muted-foreground">{host.email}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{p.property_type}</Badge></TableCell>
                    <TableCell className="text-xs">{p.rental_mode}</TableCell>
                    <TableCell><Badge className={statusColors[p.status]}>{p.status}</Badge></TableCell>
                    <TableCell>{p.price_per_night ? `${p.price_per_night} ${p.base_currency}` : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Upravit / přiřadit hostitele"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => duplicate(p)} title="Duplikovat"><Copy className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <RentalPropertyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={fetchProperties}
        isAdmin={true}
      />
    </Card>
  );
};
