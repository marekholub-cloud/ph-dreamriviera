import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Home, Plus, ExternalLink, Pencil, Copy } from "lucide-react";
import { RentalPropertyFormDialog, type RentalPropertyRow } from "@/components/rentals/RentalPropertyFormDialog";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-yellow-500/20 text-yellow-700",
  approved: "bg-blue-500/20 text-blue-700",
  active: "bg-green-500/20 text-green-700",
  paused: "bg-orange-500/20 text-orange-700",
  blocked: "bg-red-500/20 text-red-700",
  archived: "bg-gray-500/20 text-gray-700",
};

interface MyRentalsSectionProps {
  managerMode?: boolean;
}

export const MyRentalsSection = ({ managerMode = false }: MyRentalsSectionProps = {}) => {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<RentalPropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RentalPropertyRow | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("rental_properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (!managerMode) {
      query = query.eq("owner_id", user.id);
    }
    const { data } = await query;
    setRentals((data || []) as RentalPropertyRow[]);
    setLoading(false);
  }, [user, managerMode]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: RentalPropertyRow) => { setEditing(r); setDialogOpen(true); };

  const duplicate = async (r: RentalPropertyRow) => {
    if (!user) return;
    if (!confirm(`Duplikovat "${r.title}"? Vznikne nová nemovitost ve stavu draft.`)) return;
    const { id, created_at, updated_at, published_at, slug, average_rating, reviews_count, ...rest } = r as any;
    const baseSlug = (slug || r.title || "rental").toString().replace(/-copy(-\d+)?$/, "");
    const newSlug = `${baseSlug}-copy-${Date.now().toString(36)}`;
    const payload = {
      ...rest,
      title: `${r.title} (kopie)`,
      slug: newSlug,
      status: "draft",
      is_featured: false,
      average_rating: 0,
      reviews_count: 0,
      published_at: null,
      // ensure new owner = current user when not in manager mode
      owner_id: managerMode ? r.owner_id : user.id,
    };
    const { error } = await supabase.from("rental_properties").insert(payload);
    if (error) {
      toast({ title: "Nelze duplikovat", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Nemovitost duplikována", description: "Nová kopie je ve stavu draft." });
    fetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" /> Nemovitosti k pronájmu
          </CardTitle>
          <CardDescription>{managerMode ? "Všechny nemovitosti k pronájmu napříč hostiteli" : "Pronájmy, kterých jste vlastník/hostitel"}</CardDescription>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Přidat nemovitost
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Zatím nemáte žádné nemovitosti k pronájmu. Klikněte na "Přidat nemovitost" a vytvořte první listing.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Lokalita</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cena/noc</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.title}
                    {r.is_featured && <Badge className="ml-2" variant="outline">Featured</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.city || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{r.property_type}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell>{r.price_per_night ? `${r.price_per_night} ${r.base_currency}` : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Upravit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => duplicate(r)} title="Duplikovat"><Copy className="h-4 w-4" /></Button>
                    {r.status === "active" && (
                      <Button asChild size="icon" variant="ghost">
                        <Link to={`/rentals/${r.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <RentalPropertyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={fetch}
        isAdmin={managerMode}
      />
    </Card>
  );
};
