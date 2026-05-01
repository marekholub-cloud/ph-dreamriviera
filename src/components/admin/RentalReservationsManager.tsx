import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Reservation {
  id: string;
  reservation_code: string;
  property_id: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  guests_count: number;
  booking_type: string;
  booking_status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  property?: { title: string };
}

const STATUSES = [
  "inquiry", "pending", "awaiting_payment", "confirmed",
  "checked_in", "checked_out", "cancelled_by_guest",
  "cancelled_by_host", "no_show", "completed", "refunded",
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700",
  awaiting_payment: "bg-orange-500/20 text-orange-700",
  confirmed: "bg-blue-500/20 text-blue-700",
  checked_in: "bg-green-500/20 text-green-700",
  checked_out: "bg-purple-500/20 text-purple-700",
  completed: "bg-green-500/20 text-green-700",
  cancelled_by_guest: "bg-red-500/20 text-red-700",
  cancelled_by_host: "bg-red-500/20 text-red-700",
  no_show: "bg-red-500/20 text-red-700",
  refunded: "bg-gray-500/20 text-gray-700",
  inquiry: "bg-muted text-muted-foreground",
};

export const RentalReservationsManager = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rental_reservations")
      .select("*, property:rental_properties(title)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      setReservations((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("rental_reservations")
      .update({ booking_status: status as any })
      .eq("id", id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status aktualizován" });
      fetch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> Rezervace pronájmů
        </CardTitle>
        <CardDescription>Všechny rezervace v systému ({reservations.length})</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Zatím žádné rezervace.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kód</TableHead>
                <TableHead>Nemovitost</TableHead>
                <TableHead>Termín</TableHead>
                <TableHead>Nocí</TableHead>
                <TableHead>Hostů</TableHead>
                <TableHead>Cena</TableHead>
                <TableHead>Platba</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.reservation_code}</TableCell>
                  <TableCell className="font-medium">{r.property?.title || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(r.check_in_date), "dd.MM.")} – {format(new Date(r.check_out_date), "dd.MM.yyyy")}
                  </TableCell>
                  <TableCell>{r.nights}</TableCell>
                  <TableCell>{r.guests_count}</TableCell>
                  <TableCell>{r.total_amount} {r.currency}</TableCell>
                  <TableCell><Badge variant="outline">{r.payment_status}</Badge></TableCell>
                  <TableCell>
                    <Select value={r.booking_status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue>
                          <Badge className={statusColors[r.booking_status]}>{r.booking_status}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
