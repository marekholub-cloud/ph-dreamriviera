import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Review {
  id: string;
  property_id: string;
  overall_rating: number;
  public_comment: string | null;
  is_published: boolean;
  created_at: string;
  property?: { title: string };
}

export const RentalReviewsManager = () => {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rental_reviews")
      .select("*, property:rental_properties(title)")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (id: string, is_published: boolean) => {
    await supabase.from("rental_reviews").update({ is_published }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Smazat recenzi?")) return;
    await supabase.from("rental_reviews").delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Recenze pronájmů</CardTitle>
        <CardDescription>Moderace hodnocení od hostů ({items.length})</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Zatím žádné recenze.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead><TableHead>Nemovitost</TableHead>
                <TableHead>Hodnocení</TableHead><TableHead>Komentář</TableHead>
                <TableHead>Publikováno</TableHead><TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(new Date(r.created_at), "dd.MM.yyyy")}</TableCell>
                  <TableCell className="font-medium">{r.property?.title || "—"}</TableCell>
                  <TableCell><div className="flex items-center gap-1">{r.overall_rating} <Star className="h-3 w-3 fill-primary text-primary" /></div></TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.public_comment || "—"}</TableCell>
                  <TableCell><Switch checked={r.is_published} onCheckedChange={(c) => togglePublish(r.id, c)} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
