import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SuperhostBadge } from "@/components/rentals/SuperhostBadge";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";

interface Row {
  host_id: string;
  full_name: string | null;
  email: string;
  is_superhost: boolean;
  superhost_evaluated_at: string | null;
  properties_count: number;
  reservations_completed: number;
  reservations_cancelled: number;
  cancellation_rate_pct: number;
  avg_rating: number;
  reviews_count: number;
  response_rate_pct: number;
}

export const SuperhostManager = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("rental_host_stats")
      .select("*")
      .order("avg_rating", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runEval = async () => {
    setRunning(true);
    const { data, error } = await (supabase as any).rpc("evaluate_all_superhosts");
    setRunning(false);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Hotovo", description: `Vyhodnoceno ${data} hostitelů.` });
    load();
  };

  const superhostCount = rows.filter((r) => r.is_superhost).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>Super-host program</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Aktivních: <span className="font-semibold text-foreground">{superhostCount}</span> z {rows.length} hostitelů
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={runEval} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Přepočítat všechny
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Žádní hostitelé s aktivními pronájmy.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostitel</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Pronájmy</TableHead>
                  <TableHead className="text-right">Pobyty</TableHead>
                  <TableHead className="text-right">★ Rating</TableHead>
                  <TableHead className="text-right">Recenze</TableHead>
                  <TableHead className="text-right">Response</TableHead>
                  <TableHead className="text-right">Storno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.host_id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.is_superhost ? <SuperhostBadge /> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.properties_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.reservations_completed}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.avg_rating).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.reviews_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.response_rate_pct).toFixed(0)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.cancellation_rate_pct).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
