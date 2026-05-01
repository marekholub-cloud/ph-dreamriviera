import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plane, Star, Home, BedDouble } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RentalReviewForm } from "@/components/rentals/RentalReviewForm";

interface Stay {
  id: string;
  reservation_code: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  guests_count: number;
  booking_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  property_id: string;
  room_id: string | null;
  property?: { title: string; owner_id: string };
  room?: { name: string } | null;
  has_review?: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700",
  confirmed: "bg-blue-500/20 text-blue-700",
  checked_in: "bg-green-500/20 text-green-700",
  checked_out: "bg-purple-500/20 text-purple-700",
  completed: "bg-green-500/20 text-green-700",
  cancelled_by_guest: "bg-red-500/20 text-red-700",
  cancelled_by_host: "bg-red-500/20 text-red-700",
};

export const MyGuestStaysSection = () => {
  const { user } = useAuth();
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Stay | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("rental_reservations")
      .select("id,reservation_code,check_in_date,check_out_date,nights,guests_count,booking_status,total_amount,currency,created_at,property_id,room_id,property:rental_properties(title,owner_id),room:rental_rooms(name)")
      .eq("guest_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const list = (data || []) as Stay[];
    const reservationIds = list.map((s) => s.id);
    if (reservationIds.length) {
      const { data: existing } = await supabase
        .from("rental_reviews")
        .select("reservation_id")
        .in("reservation_id", reservationIds);
      const reviewedSet = new Set((existing || []).map((r: any) => r.reservation_id));
      list.forEach((s) => { s.has_review = reviewedSet.has(s.id); });
    }
    setStays(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const canReview = (s: Stay) =>
    ["checked_out", "completed"].includes(s.booking_status) && !s.has_review;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" /> Moje pobyty
          </CardTitle>
          <CardDescription>Vaše rezervace pronájmů jako host</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : stays.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Zatím žádné pobyty.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kód</TableHead>
                  <TableHead>Pronájem</TableHead>
                  <TableHead>Příjezd → Odjezd</TableHead>
                  <TableHead>Hosté</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stays.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.reservation_code}</TableCell>
                    <TableCell className="text-sm">
                      <div>{s.property?.title || "—"}</div>
                      <Badge variant="secondary" className="mt-0.5 text-[10px] gap-1 h-4 px-1.5">
                        {s.room_id ? (
                          <><BedDouble className="h-3 w-3" /> {s.room?.name || "Ložnice"}</>
                        ) : (
                          <><Home className="h-3 w-3" /> Celá nemovitost</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(s.check_in_date), "dd.MM.yy")} → {format(new Date(s.check_out_date), "dd.MM.yy")}
                      <div className="text-muted-foreground">{s.nights} nocí</div>
                    </TableCell>
                    <TableCell>{s.guests_count}</TableCell>
                    <TableCell className="font-medium">{s.total_amount.toLocaleString()} {s.currency}</TableCell>
                    <TableCell><Badge className={statusColors[s.booking_status]}>{s.booking_status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {canReview(s) ? (
                        <Button size="sm" variant="outline" onClick={() => setReviewing(s)}>
                          <Star className="h-4 w-4 mr-1" /> Ohodnotit
                        </Button>
                      ) : s.has_review ? (
                        <span className="text-xs text-muted-foreground">Ohodnoceno</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {reviewing && reviewing.property && (
        <RentalReviewForm
          open={!!reviewing}
          onOpenChange={(o) => !o && setReviewing(null)}
          reservationId={reviewing.id}
          propertyId={reviewing.property_id}
          hostId={reviewing.property.owner_id}
          onSubmitted={load}
        />
      )}
    </>
  );
};
