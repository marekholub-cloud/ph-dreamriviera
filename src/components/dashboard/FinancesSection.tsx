import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet, TrendingUp, TrendingDown, Receipt, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  TX_TYPE_LABEL, TX_STATUS_LABEL, formatMoney,
  type RentalTransactionType, type RentalTransactionStatus,
} from "@/lib/rentalTransactions";

interface TxRow {
  id: string;
  reservation_id: string;
  type: RentalTransactionType;
  status: RentalTransactionStatus;
  amount: number;
  currency: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  occurred_at: string;
  reservation?: { reservation_code: string };
  property?: { title: string };
}

interface FinancesSectionProps {
  managerMode?: boolean;
}

export const FinancesSection = ({ managerMode = false }: FinancesSectionProps = {}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("rental_transactions")
      .select("id,reservation_id,type,status,amount,currency,payment_method,reference,notes,occurred_at,reservation:rental_reservations(reservation_code),property:rental_properties(title)")
      .order("occurred_at", { ascending: false });
    if (!managerMode) {
      query = query.eq("host_id", user.id);
    }
    const { data, error } = await query;

    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else setRows((data || []) as any);
    setLoading(false);
  }, [user, managerMode]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const blob = `${r.reservation?.reservation_code} ${r.property?.title} ${r.reference} ${r.notes}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [rows, typeFilter, search]);

  const stats = useMemo(() => {
    const income = filtered.filter((r) => r.amount > 0 && r.status === "completed").reduce((s, r) => s + Number(r.amount), 0);
    const outcome = filtered.filter((r) => r.amount < 0 && r.status === "completed").reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
    const net = income - outcome;
    const currency = filtered[0]?.currency || "USD";
    return { income, outcome, net, currency, count: filtered.length };
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Datum","Rezervace","Nemovitost","Typ","Status","Částka","Měna","Metoda","Reference","Poznámka"];
    const csv = [header.join(",")].concat(
      filtered.map((r) => [
        format(new Date(r.occurred_at), "yyyy-MM-dd HH:mm"),
        r.reservation?.reservation_code || "",
        (r.property?.title || "").replace(/,/g, " "),
        TX_TYPE_LABEL[r.type],
        TX_STATUS_LABEL[r.status],
        r.amount,
        r.currency,
        r.payment_method || "",
        (r.reference || "").replace(/,/g, " "),
        (r.notes || "").replace(/,/g, " ").replace(/\n/g, " "),
      ].join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `finance-${format(new Date(),"yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Příjmy</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(stats.income, stats.currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Odchozí (refundy / slevy)</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(stats.outcome, stats.currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Netto</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(stats.net, stats.currency)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Finanční operace
            </CardTitle>
            <CardDescription>Všechny transakce na vašich rezervacích ({filtered.length})</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Input placeholder="Hledat…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[180px]" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                {Object.entries(TX_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Zatím žádné transakce.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Rezervace</TableHead>
                  <TableHead>Nemovitost</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Metoda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{format(new Date(r.occurred_at), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell className="font-mono text-xs">{r.reservation?.reservation_code || "—"}</TableCell>
                    <TableCell className="text-sm">{r.property?.title || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{TX_TYPE_LABEL[r.type]}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.payment_method || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{TX_STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className={`text-right font-medium ${r.amount < 0 ? "text-destructive" : "text-green-700"}`}>
                      {formatMoney(Number(r.amount), r.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
