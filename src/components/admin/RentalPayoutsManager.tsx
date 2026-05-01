import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Row {
  id: string;
  host_id: string;
  reservation_id: string;
  property_id: string;
  gross_amount: number;
  service_fee: number;
  net_amount: number;
  currency: string;
  status: string;
  payout_method: string | null;
  payout_reference: string | null;
  scheduled_at: string | null;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
  host_name?: string;
  reservation_code?: string;
  property_title?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Čeká",
  processing: "Zpracovává se",
  paid: "Vyplaceno",
  failed: "Selhalo",
  cancelled: "Zrušeno",
};

export const RentalPayoutsManager = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [editMethod, setEditMethod] = useState("");
  const [editRef, setEditRef] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rental_payouts")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data || []) as Row[];
    if (list.length) {
      const hostIds = [...new Set(list.map((r) => r.host_id))];
      const propIds = [...new Set(list.map((r) => r.property_id))];
      const resIds = [...new Set(list.map((r) => r.reservation_id))];
      const [{ data: profiles }, { data: props }, { data: ress }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").in("id", hostIds),
        supabase.from("rental_properties").select("id,title").in("id", propIds),
        supabase.from("rental_reservations").select("id,reservation_code").in("id", resIds),
      ]);
      const hostMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || p.email]));
      const propMap = new Map((props || []).map((p: any) => [p.id, p.title]));
      const resMap = new Map((ress || []).map((r: any) => [r.id, r.reservation_code]));
      list.forEach((r) => {
        r.host_name = hostMap.get(r.host_id);
        r.property_title = propMap.get(r.property_id);
        r.reservation_code = resMap.get(r.reservation_id);
      });
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (r: Row) => {
    setEditing(r);
    setEditStatus(r.status);
    setEditMethod(r.payout_method || "");
    setEditRef(r.payout_reference || "");
    setEditNotes(r.notes || "");
  };

  const save = async () => {
    if (!editing) return;
    const payload: any = {
      status: editStatus,
      payout_method: editMethod || null,
      payout_reference: editRef || null,
      notes: editNotes || null,
    };
    if (editStatus === "paid" && !editing.paid_at) payload.paid_at = new Date().toISOString();
    if (editStatus !== "paid") payload.paid_at = null;

    const { error } = await supabase.from("rental_payouts").update(payload).eq("id", editing.id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Uloženo", description: "Výplata byla aktualizována." });
    setEditing(null);
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const totals = filtered.reduce((acc, r) => {
    acc.net += Number(r.net_amount);
    acc.fees += Number(r.service_fee);
    return acc;
  }, { net: 0, fees: 0 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>Výplaty hostitelům</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Celkem čisté: {totals.net.toLocaleString()} • Service fee: {totals.fees.toLocaleString()}</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vše</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Žádné výplaty.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Hostitel</TableHead>
                  <TableHead>Rezervace</TableHead>
                  <TableHead>Pronájem</TableHead>
                  <TableHead className="text-right">Hrubé</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Čisté</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd.MM.yyyy")}</TableCell>
                    <TableCell>{r.host_name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.reservation_code}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.property_title}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.gross_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{Number(r.service_fee).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{Number(r.net_amount).toLocaleString()} {r.currency}</TableCell>
                    <TableCell><Badge variant={r.status === "paid" ? "default" : "outline"}>{STATUS_LABEL[r.status] || r.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Upravit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upravit výplatu</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="text-sm text-muted-foreground">
                {editing.host_name} • {editing.reservation_code} • <span className="font-semibold text-foreground">{Number(editing.net_amount).toLocaleString()} {editing.currency}</span>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Způsob platby</Label>
                <Input value={editMethod} onChange={(e) => setEditMethod(e.target.value)} placeholder="bankovní převod, Wise, ..." />
              </div>
              <div className="grid gap-2">
                <Label>Reference / VS</Label>
                <Input value={editRef} onChange={(e) => setEditRef(e.target.value)} placeholder="Číslo transakce" />
              </div>
              <div className="grid gap-2">
                <Label>Poznámka</Label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Zrušit</Button>
            <Button onClick={save}><CheckCircle2 className="h-4 w-4 mr-2" />Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
