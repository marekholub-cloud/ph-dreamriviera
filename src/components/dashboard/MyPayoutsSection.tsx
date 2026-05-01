import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, TrendingUp, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface PayoutRow {
  id: string;
  reservation_id: string;
  property_id: string;
  gross_amount: number;
  service_fee: number;
  net_amount: number;
  currency: string;
  status: string;
  scheduled_at: string | null;
  paid_at: string | null;
  created_at: string;
  property_title?: string;
  reservation_code?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Čeká", variant: "outline" },
  processing: { label: "Zpracovává se", variant: "secondary" },
  paid: { label: "Vyplaceno", variant: "default" },
  failed: { label: "Selhalo", variant: "destructive" },
  cancelled: { label: "Zrušeno", variant: "outline" },
};

interface MyPayoutsSectionProps {
  managerMode?: boolean;
}

export const MyPayoutsSection = ({ managerMode = false }: MyPayoutsSectionProps = {}) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("rental_payouts")
        .select("id,reservation_id,property_id,gross_amount,service_fee,net_amount,currency,status,scheduled_at,paid_at,created_at")
        .order("created_at", { ascending: false });
      if (!managerMode) {
        query = query.eq("host_id", user.id);
      }
      const { data: payouts } = await query;

      const list = (payouts || []) as PayoutRow[];
      if (list.length) {
        const propIds = [...new Set(list.map((r) => r.property_id))];
        const resIds = [...new Set(list.map((r) => r.reservation_id))];
        const [{ data: props }, { data: ress }] = await Promise.all([
          supabase.from("rental_properties").select("id,title").in("id", propIds),
          supabase.from("rental_reservations").select("id,reservation_code").in("id", resIds),
        ]);
        const titleMap = new Map((props || []).map((p: any) => [p.id, p.title]));
        const codeMap = new Map((ress || []).map((r: any) => [r.id, r.reservation_code]));
        list.forEach((r) => {
          r.property_title = titleMap.get(r.property_id);
          r.reservation_code = codeMap.get(r.reservation_id);
        });
      }
      setRows(list);
      setLoading(false);
    };
    load();
  }, [user, managerMode]);

  const stats = useMemo(() => {
    const totalNet = rows.reduce((s, r) => s + Number(r.net_amount), 0);
    const totalFees = rows.reduce((s, r) => s + Number(r.service_fee), 0);
    const pending = rows.filter((r) => r.status === "pending" || r.status === "processing")
      .reduce((s, r) => s + Number(r.net_amount), 0);
    const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.net_amount), 0);
    const currency = rows[0]?.currency || "USD";
    return { totalNet, totalFees, pending, paid, currency };
  }, [rows]);

  const exportCsv = () => {
    const header = ["Datum", "Rezervace", "Pronájem", "Hrubé", "Service fee", "Čisté", "Měna", "Status", "Vyplaceno"];
    const lines = rows.map((r) => [
      format(new Date(r.created_at), "yyyy-MM-dd"),
      r.reservation_code || "",
      r.property_title || "",
      Number(r.gross_amount).toFixed(2),
      Number(r.service_fee).toFixed(2),
      Number(r.net_amount).toFixed(2),
      r.currency,
      statusConfig[r.status]?.label || r.status,
      r.paid_at ? format(new Date(r.paid_at), "yyyy-MM-dd") : "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const fmt = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${stats.currency}`;
  const filterByStatus = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status));

  const renderTable = (data: PayoutRow[]) => (
    data.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">Zatím žádné výplaty.</p>
    ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Rezervace</TableHead>
              <TableHead>Pronájem</TableHead>
              <TableHead className="text-right">Hrubé</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Čisté</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd.MM.yyyy")}</TableCell>
                <TableCell className="font-mono text-xs">{r.reservation_code}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.property_title}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.gross_amount).toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">−{Number(r.service_fee).toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{Number(r.net_amount).toLocaleString()} {r.currency}</TableCell>
                <TableCell><Badge variant={statusConfig[r.status]?.variant || "outline"}>{statusConfig[r.status]?.label || r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Výdělky a výplaty</h2>
          <p className="text-sm text-muted-foreground">Přehled vašich příjmů z pronájmů.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2"><TrendingUp className="h-3 w-3" />Celkem hrubé</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{fmt(stats.totalNet + stats.totalFees)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2"><Wallet className="h-3 w-3" />Service fee</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-muted-foreground">−{fmt(stats.totalFees)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2"><Clock className="h-3 w-3" />Čeká na výplatu</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{fmt(stats.pending)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-3 w-3" />Vyplaceno</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-primary">{fmt(stats.paid)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Vše ({rows.length})</TabsTrigger>
              <TabsTrigger value="pending">Čeká ({filterByStatus(["pending","processing"]).length})</TabsTrigger>
              <TabsTrigger value="paid">Vyplaceno ({filterByStatus(["paid"]).length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">{renderTable(rows)}</TabsContent>
            <TabsContent value="pending" className="mt-4">{renderTable(filterByStatus(["pending","processing"]))}</TabsContent>
            <TabsContent value="paid" className="mt-4">{renderTable(filterByStatus(["paid"]))}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
