import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AvailabilityRow = {
  date: string;
  status: "available" | "blocked" | "booked" | "tentative" | "maintenance";
  price_override: number | null;
  min_stay_override: number | null;
};

interface Props {
  propertyId: string;
  basePrice: number | null;
  baseCurrency: string;
  minimumStay: number;
  /** When set, calendar shows availability for this specific room only. */
  roomId?: string | null;
  onRangeSelect?: (checkIn: string, checkOut: string) => void;
}

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const fmtKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const PublicAvailabilityCalendar = ({ propertyId, basePrice, baseCurrency, minimumStay, roomId, onRangeSelect }: Props) => {
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [rows, setRows] = useState<Record<string, AvailabilityRow>>({});
  const [loading, setLoading] = useState(true);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const start = startOfMonth(cursor);
    const end = addMonths(start, 2); // load 2 months
    const startKey = fmtKey(start);
    const endKey = fmtKey(end);

    // Availability blocks: include property-wide rows (room_id IS NULL) and, if a room is selected, also that room's rows.
    let availQuery = supabase
      .from("rental_availability")
      .select("date,status,price_override,min_stay_override,room_id")
      .eq("property_id", propertyId)
      .gte("date", startKey)
      .lt("date", endKey);
    if (roomId) {
      availQuery = availQuery.or(`room_id.eq.${roomId},room_id.is.null`);
    } else {
      availQuery = availQuery.is("room_id", null);
    }

    const [{ data: avail, error: availabilityError }, { data: reservationResponse, error: reservationsError }] = await Promise.all([
      availQuery,
      supabase.functions.invoke("get-public-rental-reservations", {
        body: {
          propertyId,
          startDate: startKey,
          endDate: endKey,
          roomId: roomId ?? null,
        },
      }),
    ]);

    if (availabilityError || reservationsError) {
      toast({
        title: "Failed to load availability",
        description: availabilityError?.message || reservationsError?.message || "Please try again.",
        variant: "destructive",
      });
    }

    const reservations = reservationResponse?.reservations || [];

    const map: Record<string, AvailabilityRow> = {};
    (avail || []).forEach((r: any) => { map[r.date] = r; });

    // Merge active reservations as booked/tentative days
    (reservations || []).forEach((r: any) => {
      const ci = new Date(r.check_in_date + "T00:00:00");
      const co = new Date(r.check_out_date + "T00:00:00");
      const cur = new Date(ci);
      while (cur < co) {
        const k = fmtKey(cur);
        if (k >= startKey && k < endKey) {
          const status = r.booking_status === "confirmed" ? "booked" : "tentative";
          // Don't downgrade an existing blocked/booked entry
          const existing = map[k];
          if (!existing || (existing.status !== "blocked" && existing.status !== "booked")) {
            map[k] = {
              date: k,
              status: status as AvailabilityRow["status"],
              price_override: existing?.price_override ?? null,
              min_stay_override: existing?.min_stay_override ?? null,
            };
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    });

    setRows(map);
    setLoading(false);
  };

  useEffect(() => {
    load();

    // Realtime: refresh calendar when reservations are added/changed
    const channel = supabase
      .channel(`avail-${propertyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rental_reservations", filter: `property_id=eq.${propertyId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rental_availability", filter: `property_id=eq.${propertyId}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, cursor, roomId]);

  const months = useMemo(() => [cursor, addMonths(cursor, 1)], [cursor]);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const isBlocked = (key: string) => {
    const r = rows[key];
    return r && (r.status === "blocked" || r.status === "booked" || r.status === "maintenance");
  };

  const handleDayClick = (d: Date, key: string) => {
    if (!onRangeSelect) return;
    if (d < today || isBlocked(key)) return;

    // First click or restart after complete range
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(key);
      setRangeEnd(null);
      return;
    }

    // Second click — set end
    if (key === rangeStart) {
      setRangeStart(null);
      return;
    }
    let from = rangeStart;
    let to = key;
    if (to < from) { [from, to] = [to, from]; }

    // Check no blocked dates in between (inclusive of from, exclusive of to = checkout day not booked)
    const fromDate = new Date(from + "T00:00:00");
    const toDate = new Date(to + "T00:00:00");
    const cur = new Date(fromDate);
    while (cur < toDate) {
      const k = fmtKey(cur);
      if (isBlocked(k)) {
        toast({ title: "Booked dates in this range", description: "Please choose a different period.", variant: "destructive" });
        setRangeStart(key);
        setRangeEnd(null);
        return;
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Min-stay check
    const nights = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
    if (nights < (minimumStay || 1)) {
      toast({ title: `Minimum stay is ${minimumStay} ${minimumStay === 1 ? "night" : "nights"}`, variant: "destructive" });
      return;
    }

    setRangeStart(from);
    setRangeEnd(to);
    onRangeSelect(from, to);
  };

  const inRange = (key: string) => {
    if (!rangeStart) return false;
    const end = rangeEnd ?? rangeStart;
    const lo = rangeStart < end ? rangeStart : end;
    const hi = rangeStart < end ? end : rangeStart;
    return key >= lo && key <= hi;
  };

  const renderMonth = (month: Date) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const jsDow = firstDay.getDay();
    const startOffset = jsDow === 0 ? 6 : jsDow - 1;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, m, d));
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div key={month.toISOString()} className="space-y-2">
        <div className="text-center font-medium font-serif">
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
        <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground text-center">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = fmtKey(d);
            const row = rows[key];
            const isPast = d < today;
            const blocked = isBlocked(key);
            const tentative = row?.status === "tentative";
            const price = row?.price_override ?? basePrice;
            const selectable = !!onRangeSelect && !isPast && !blocked;
            const selected = inRange(key);
            const isStart = rangeStart === key;
            const isEnd = rangeEnd === key;
            return (
              <button
                type="button"
                key={i}
                onClick={() => handleDayClick(d, key)}
                disabled={!selectable}
                className={[
                  "aspect-square rounded text-center flex flex-col items-center justify-center border text-xs transition-colors",
                  isPast ? "opacity-40 bg-muted cursor-not-allowed" : "",
                  blocked ? "bg-destructive/10 text-destructive line-through border-destructive/30 cursor-not-allowed" : "",
                  tentative && !blocked ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : "",
                  !blocked && !tentative && !isPast && !selected ? "bg-background hover:bg-accent border-border" : "",
                  selected && !isStart && !isEnd ? "bg-primary/20 border-primary/40" : "",
                  (isStart || isEnd) ? "bg-primary text-primary-foreground border-primary" : "",
                  selectable ? "cursor-pointer" : "",
                ].join(" ")}
                title={
                  blocked ? "Booked" :
                  tentative ? "Tentatively reserved" :
                  price ? `${price} ${baseCurrency}` : ""
                }
              >
                <span className="font-medium leading-none">{d.getDate()}</span>
                {!isPast && !blocked && price && (
                  <span className="text-[9px] leading-none mt-0.5 opacity-80">
                    {Math.round(price)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> Availability and pricing
        </CardTitle>
        <CardDescription>
          {onRangeSelect
            ? <>Click your <strong>check-in</strong> and then <strong>check-out</strong> date to start a reservation. Min. stay: <strong>{minimumStay} {minimumStay === 1 ? "night" : "nights"}</strong>.</>
            : <>Minimum stay: <strong>{minimumStay} {minimumStay === 1 ? "night" : "nights"}</strong></>
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {(rangeStart || rangeEnd) && onRangeSelect && (
            <Button variant="ghost" size="sm" onClick={() => { setRangeStart(null); setRangeEnd(null); }}>
              Clear selection
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {months.map(renderMonth)}
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs pt-2 border-t">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-background border" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" /> Booked</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" /> Tentative</span>
          {onRangeSelect && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary border border-primary" /> Selected</span>}
        </div>
      </CardContent>
    </Card>
  );
};
