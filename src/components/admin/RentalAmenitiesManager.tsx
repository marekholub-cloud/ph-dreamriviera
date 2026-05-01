import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Sparkles, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Amenity {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  is_active: boolean;
}

export const RentalAmenitiesManager = () => {
  const [items, setItems] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "", icon: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("rental_amenities").select("*").order("name");
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", category: "", icon: "" });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (a: Amenity) => {
    setEditingId(a.id);
    setForm({ name: a.name, category: a.category || "", icon: a.icon || "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      icon: form.icon.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("rental_amenities").update(payload).eq("id", editingId)
      : await supabase.from("rental_amenities").insert(payload);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else {
      toast({ title: editingId ? "Vybavení upraveno" : "Vybavení přidáno" });
      resetForm();
      setOpen(false);
      load();
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from("rental_amenities").update({ is_active }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Smazat vybavení?")) return;
    await supabase.from("rental_amenities").delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Vybavení (Amenities)</CardTitle>
          <CardDescription>Číselník vybavení pro pronájmy</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Nové vybavení</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Upravit vybavení" : "Nové vybavení"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2"><Label>Název *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Kategorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="basics, features…" /></div>
              <div className="grid gap-2"><Label>Ikona (lucide)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="wifi, car, waves…" /></div>
            </div>
            <DialogFooter><Button onClick={save}>{editingId ? "Uložit" : "Vytvořit"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead><TableHead>Kategorie</TableHead><TableHead>Ikona</TableHead>
                <TableHead>Aktivní</TableHead><TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.category || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{a.icon || "—"}</TableCell>
                  <TableCell><Switch checked={a.is_active} onCheckedChange={(c) => toggleActive(a.id, c)} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
