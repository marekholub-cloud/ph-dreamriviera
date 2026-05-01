import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ban, CheckCircle2, CalendarDays, X, Home, BedDouble } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, eachDayOfInterval } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AvailabilityRow {
  id: string;
  date: string;
  status: "available" | "blocked" | "booked" | "pending";
  reservation_id: string | null;
  notes?: string | null;
  room_id?: string | null;
}

interface ReservationRow {
  id: string;
  reservation_code: string | null;
  check_in_date: string;
  check_out_date: string;
  booking_status: string;
  guest_id: string | null;
  guests_count: number | null;
  total_amount: number | null;
  currency: string | null;
  room_id: string | null;
  guest?: { full_name: string | null; email: string | null } | null;
}

interface RoomLite {
  id: string;
  name: string;
}

type TimelineItem =
  | {
      kind: "block";
      start: Date;
      end: Date;
      nights: number;
      note: string | null;
      scopeLabel: string;
      isWholeProperty: boolean;
    }
  | {
      kind: "reservation";
      start: Date;
      end: Date;
      nights: number;
      code: string | null;
      guest: string | null;
      status: string;
      amount: number | null;
      currency: string | null;
      scopeLabel: string;
      isWholeProperty: boolean;
    };

interface Props {
  propertyId: string;
}

const WHOLE = "__whole__"; // Select value for "celá nemovitost"

/**
 * Kalendář dostupnosti pro hostitele.
 * - 1. klik = začátek pobytu (check-in)
 * - 2. klik = konec pobytu (check-out) → otevře dialog s poznámkou
 * - "blocked" = manuálně zablokováno hostem (per-room nebo celá nemovitost)
 * - "booked"  = obsazeno potvrzenou rezervací (read-only)
 */
export const RentalAvailabilityManager = ({ propertyId }: Props) => {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [rooms, setRooms] = useState<RoomLite[]>([]);
  const [scopeRoomId, setScopeRoomId] = useState<string>(WHOLE); // viewing/blocking scope
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [note, setNote] = useState("");
  const [blockScope, setBlockScope] = useState<string>(WHOLE); // scope chosen in dialog

  const roomNameMap = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [rooms]);

  const scopeLabelFor = (room_id: string | null | undefined) =>
    !room_id ? "Celá nemovitost" : `Ložnice: ${roomNameMap.get(room_id) || "—"}`;

  const fetchRooms = useCallback(async () => {
    const { data } = await supabase
      .from("rental_rooms")
      .select("id,name,sort_order")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true });
    setRooms(((data || []) as any[]).map((r) => ({ id: r.id, name: r.name })));
  }, [propertyId]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");

    const [availRes, resvRes] = await Promise.all([
      supabase
        .from("rental_availability")
        .select("id,date,status,reservation_id,notes,room_id")
        .eq("property_id", propertyId)
        .gte("date", today)
        .order("date"),
      supabase
        .from("rental_reservations")
        .select("id,reservation_code,check_in_date,check_out_date,booking_status,guest_id,guests_count,total_amount,currency,room_id")
        .eq("property_id", propertyId)
        .in("booking_status", ["confirmed", "pending"])
        .gte("check_out_date", today)
        .order("check_in_date"),
    ]);

    if (availRes.error) toast({ title: "Chyba načtení", description: availRes.error.message, variant: "destructive" });
    else setRows((availRes.data || []) as AvailabilityRow[]);

    const baseList = ((resvRes.data || []) as any[]) as ReservationRow[];

    // Doplň jména hostů z profiles
    const guestIds = Array.from(new Set(baseList.map(r => r.guest_id).filter(Boolean))) as string[];
    let profileMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (guestIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", guestIds);
      (profs || []).forEach((p: any) => profileMap.set(p.id, { full_name: p.full_name, email: p.email }));
    }
    const resvList: ReservationRow[] = baseList.map(r => ({
      ...r,
      guest: r.guest_id ? profileMap.get(r.guest_id) || null : null,
    }));
    setReservations(resvList);

    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetchRooms(); fetchRows(); }, [fetchRooms, fetchRows]);

  // Filter rows + reservations relevant for currently viewed scope.
  // Scope rules:
  //  - WHOLE view: everything matters (whole-property + all rooms).
  //  - Specific room view: matters if it's whole-property OR for that room.
  const isInScope = (room_id: string | null | undefined) => {
    if (scopeRoomId === WHOLE) return true;
    return !room_id || room_id === scopeRoomId;
  };

  const visibleRows = useMemo(() => rows.filter(r => isInScope(r.room_id)), [rows, scopeRoomId]);
  const visibleReservations = useMemo(
    () => reservations.filter(r => isInScope(r.room_id)),
    [reservations, scopeRoomId]
  );

  const blockedDates = useMemo(
    () => visibleRows.filter(r => r.status === "blocked").map(r => new Date(r.date + "T00:00:00")),
    [visibleRows]
  );

  // Reservation dates for the visible scope
  const reservedDateStrings = useMemo(() => {
    const set = new Set<string>();
    visibleReservations.forEach((r) => {
      const s = new Date(r.check_in_date + "T00:00:00");
      const e = new Date(r.check_out_date + "T00:00:00");
      e.setDate(e.getDate() - 1);
      if (e >= s) {
        eachDayOfInterval({ start: s, end: e }).forEach(d => set.add(format(d, "yyyy-MM-dd")));
      }
    });
    return Array.from(set);
  }, [visibleReservations]);

  const bookedDates = useMemo(() => {
    const set = new Set<string>(reservedDateStrings);
    visibleRows.filter(r => r.status === "booked" || r.status === "pending").forEach(r => set.add(r.date));
    return Array.from(set).map(d => new Date(d + "T00:00:00"));
  }, [visibleRows, reservedDateStrings]);

  const isBooked = (d: Date) =>
    bookedDates.some(b => b.toDateString() === d.toDateString());

  // Seskupení po sobě jdoucích blokovaných dnů do souvislých rozsahů (zachová i scope)
  const blockGroups = useMemo(() => {
    const blocked = rows
      .filter(r => r.status === "blocked")
      .sort((a, b) => a.date.localeCompare(b.date));
    const groups: { start: Date; end: Date; note: string | null; room_id: string | null }[] = [];
    blocked.forEach((row) => {
      const d = new Date(row.date + "T00:00:00");
      const last = groups[groups.length - 1];
      if (last) {
        const next = new Date(last.end);
        next.setDate(next.getDate() + 1);
        if (
          next.toDateString() === d.toDateString() &&
          (last.note || null) === (row.notes || null) &&
          (last.room_id || null) === (row.room_id || null)
        ) {
          last.end = d;
          return;
        }
      }
      groups.push({ start: d, end: d, note: row.notes || null, room_id: row.room_id || null });
    });
    return groups;
  }, [rows]);

  // Chronologický seznam blokací + rezervací (filtrovaný podle scope)
  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    blockGroups.forEach((g) => {
      if (!isInScope(g.room_id)) return;
      const nights = Math.round((+g.end - +g.start) / 86400000) + 1;
      items.push({
        kind: "block",
        start: g.start,
        end: g.end,
        nights,
        note: g.note,
        scopeLabel: scopeLabelFor(g.room_id),
        isWholeProperty: !g.room_id,
      });
    });

    reservations.forEach((r) => {
      if (!isInScope(r.room_id)) return;
      const s = new Date(r.check_in_date + "T00:00:00");
      const e = new Date(r.check_out_date + "T00:00:00");
      const nights = Math.max(1, Math.round((+e - +s) / 86400000));
      items.push({
        kind: "reservation",
        start: s,
        end: e,
        nights,
        code: r.reservation_code,
        guest: r.guest?.full_name || r.guest?.email || null,
        status: r.booking_status,
        amount: r.total_amount,
        currency: r.currency,
        scopeLabel: scopeLabelFor(r.room_id),
        isWholeProperty: !r.room_id,
      });
    });

    return items.sort((a, b) => +a.start - +b.start);
  }, [blockGroups, reservations, scopeRoomId, roomNameMap]);

  // Dny vybrané v aktuálním rozsahu (pouze pro vizualizaci)
  const selectedRangeDays = useMemo(() => {
    if (!rangeStart) return [];
    if (!rangeEnd) return [rangeStart];
    const [s, e] = rangeStart <= rangeEnd ? [rangeStart, rangeEnd] : [rangeEnd, rangeStart];
    return eachDayOfInterval({ start: s, end: e });
  }, [rangeStart, rangeEnd]);

  // Range-select logika: 1. klik = start, 2. klik = end + dialog, 3. klik = restart
  const handleDayClick = (day: Date) => {
    if (isBooked(day) || day < new Date(new Date().toDateString())) return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      // 1. klik (nový výběr)
      setRangeStart(day);
      setRangeEnd(null);
      return;
    }

    // 2. klik
    let start = rangeStart;
    let end = day;
    if (end < start) [start, end] = [end, start];

    // Pokud rozsah obsahuje rezervovaný den, upozorni a nepokračuj
    const days = eachDayOfInterval({ start, end });
    const hasBookedInside = days.some(d => isBooked(d));
    if (hasBookedInside) {
      toast({
        title: "Rozsah obsahuje rezervovaný termín",
        description: "Vyberte rozsah bez již rezervovaných dnů.",
        variant: "destructive",
      });
      return;
    }

    setRangeStart(start);
    setRangeEnd(end);
    setNote("");
    // Default: stejný scope jako aktuálně prohlížený
    setBlockScope(scopeRoomId);
    setNoteDialogOpen(true);
  };

  const resetRange = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setNote("");
  };

  const confirmBlock = async () => {
    if (!rangeStart || !rangeEnd) return;
    setSaving(true);
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const trimmedNote = note.trim() || null;
    const targetRoomId = blockScope === WHOLE ? null : blockScope;
    const payload = days.map(d => ({
      property_id: propertyId,
      room_id: targetRoomId,
      date: format(d, "yyyy-MM-dd"),
      status: "blocked" as const,
      notes: trimmedNote,
    }));
    const { error } = await supabase
      .from("rental_availability")
      .upsert(payload, { onConflict: "property_id,room_id,date" });
    setSaving(false);
    if (error) {
      toast({ title: "Chyba blokace", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Termín zablokován",
      description: `${days.length} dnů (${format(rangeStart, "dd.MM.")} – ${format(rangeEnd, "dd.MM.yyyy")}) — ${
        targetRoomId ? `Ložnice: ${roomNameMap.get(targetRoomId) || "—"}` : "Celá nemovitost"
      }`,
    });
    setNoteDialogOpen(false);
    resetRange();
    fetchRows();
  };

  const unblockRange = async () => {
    if (!rangeStart || !rangeEnd) return;
    setSaving(true);
    const dateStrings = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
      .map(d => format(d, "yyyy-MM-dd"));
    const targetRoomId = blockScope === WHOLE ? null : blockScope;
    let q = supabase
      .from("rental_availability")
      .delete()
      .eq("property_id", propertyId)
      .eq("status", "blocked")
      .in("date", dateStrings);
    if (targetRoomId === null) q = q.is("room_id", null);
    else q = q.eq("room_id", targetRoomId);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast({ title: "Chyba odblokace", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Termíny odblokovány" });
    setNoteDialogOpen(false);
    resetRange();
    fetchRows();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4" /> Kalendář dostupnosti
        </div>

        {rooms.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Zobrazit:</Label>
            <Select value={scopeRoomId} onValueChange={setScopeRoomId}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WHOLE}>
                  <span className="inline-flex items-center gap-2"><Home className="h-3.5 w-3.5" /> Celá nemovitost (vše)</span>
                </SelectItem>
                {rooms.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="inline-flex items-center gap-2"><BedDouble className="h-3.5 w-3.5" /> {r.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="bg-background">Volné</Badge>
        <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20">Vlastní blokace</Badge>
        <Badge className="bg-primary/20 text-primary hover:bg-primary/20">Rezervováno hostem</Badge>
        <Badge className="bg-accent text-accent-foreground hover:bg-accent">Vybraný rozsah</Badge>
      </div>

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm flex items-center justify-between flex-wrap gap-2">
        <div>
          {!rangeStart && <span className="text-muted-foreground">Klikněte na <strong>začátek</strong> pobytu, který chcete zablokovat.</span>}
          {rangeStart && !rangeEnd && (
            <span>
              Začátek: <strong>{format(rangeStart, "dd.MM.yyyy")}</strong> — nyní klikněte na <strong>konec</strong>.
            </span>
          )}
          {rangeStart && rangeEnd && (
            <span>
              Rozsah: <strong>{format(rangeStart, "dd.MM.")} – {format(rangeEnd, "dd.MM.yyyy")}</strong>
            </span>
          )}
        </div>
        {(rangeStart || rangeEnd) && (
          <Button size="sm" variant="ghost" onClick={resetRange} className="gap-1 h-7">
            <X className="h-3.5 w-3.5" /> Zrušit výběr
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto,1fr]">
        <div className="rounded-md border p-2 inline-block">
          <Calendar
            mode="single"
            onDayClick={handleDayClick}
            selected={undefined}
            disabled={[{ before: new Date() }, ...bookedDates]}
            modifiers={{
              blocked: blockedDates,
              booked: bookedDates,
              range: selectedRangeDays,
              rangeStart: rangeStart ? [rangeStart] : [],
              rangeEnd: rangeEnd ? [rangeEnd] : [],
            }}
            modifiersClassNames={{
              blocked: "bg-blue-500/25 text-blue-700 dark:text-blue-300",
              booked: "bg-primary/30 text-primary line-through",
              range: "bg-accent text-accent-foreground rounded-none",
              rangeStart: "!bg-primary !text-primary-foreground rounded-l-md",
              rangeEnd: "!bg-primary !text-primary-foreground rounded-r-md",
            }}
            numberOfMonths={2}
          />
        </div>

        {/* Chronologický seznam blokací a rezervací */}
        <div className="rounded-md border bg-card p-3 space-y-2 min-w-0 lg:max-h-[560px] lg:overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Nadcházející termíny</h4>
            <span className="text-xs text-muted-foreground">{timeline.length}</span>
          </div>
          {timeline.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Žádné blokace ani rezervace.
            </p>
          ) : (
            <ul className="space-y-2">
              {timeline.map((item, idx) => {
                const isBlock = item.kind === "block";
                return (
                  <li
                    key={idx}
                    className={`rounded-md border p-2.5 text-sm ${
                      isBlock
                        ? "border-blue-500/30 bg-blue-500/10"
                        : "border-primary/30 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        {isBlock ? (
                          <Ban className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span>
                          {format(item.start, "dd.MM.")} – {format(item.end, "dd.MM.yyyy")}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isBlock
                            ? "border-blue-500/40 text-blue-700 dark:text-blue-300"
                            : "border-primary/40 text-primary"
                        }`}
                      >
                        {item.nights} {item.nights === 1 ? "noc" : item.nights < 5 ? "noci" : "nocí"}
                      </Badge>
                    </div>

                    {/* Scope badge */}
                    <div className="mt-1.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] gap-1 h-5 px-1.5"
                      >
                        {item.isWholeProperty ? (
                          <Home className="h-3 w-3" />
                        ) : (
                          <BedDouble className="h-3 w-3" />
                        )}
                        {item.scopeLabel}
                      </Badge>
                    </div>

                    {item.kind === "block" ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Vlastní blokace
                        {item.note && <div className="mt-1 italic text-foreground/80">„{item.note}"</div>}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                        {item.guest && <div className="text-foreground">{item.guest}</div>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.code && <span className="font-mono">{item.code}</span>}
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {item.status}
                          </Badge>
                          {item.amount != null && (
                            <span>
                              {item.amount} {item.currency}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Rezervované dny nelze měnit ručně. Pokud vyberete jen jednu ložnici, blokace platí pouze pro ni — ostatní ložnice zůstanou volné.
      </p>

      {/* Dialog pro poznámku k blokaci */}
      <Dialog open={noteDialogOpen} onOpenChange={(open) => {
        setNoteDialogOpen(open);
        if (!open && !saving) resetRange();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4" /> Zablokovat termín
            </DialogTitle>
            <DialogDescription>
              {rangeStart && rangeEnd && (
                <>
                  <strong>{format(rangeStart, "dd.MM.yyyy")} – {format(rangeEnd, "dd.MM.yyyy")}</strong>
                  {" "}
                  ({eachDayOfInterval({ start: rangeStart, end: rangeEnd }).length} dnů)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {rooms.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="block-scope" className="text-xs">Co chcete blokovat?</Label>
                <Select value={blockScope} onValueChange={setBlockScope}>
                  <SelectTrigger id="block-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WHOLE}>
                      <span className="inline-flex items-center gap-2"><Home className="h-3.5 w-3.5" /> Celá nemovitost</span>
                    </SelectItem>
                    {rooms.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        <span className="inline-flex items-center gap-2"><BedDouble className="h-3.5 w-3.5" /> {r.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="block-note">Interní poznámka (volitelné)</Label>
              <Textarea
                id="block-note"
                placeholder="Např. údržba, soukromé využití, rezervace mimo systém…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={unblockRange} disabled={saving} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Uvolnit rozsah
            </Button>
            <Button onClick={confirmBlock} disabled={saving} variant="destructive" className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Zablokovat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Helper pro kontrolu kolize datumového rozsahu s blokacemi a rezervacemi.
 *  Pokud je předáno roomId, uvažují se konflikty pouze pro daný pokoj nebo
 *  rezervace celé nemovitosti (room_id IS NULL). Bez roomId se počítá s blokacemi
 *  na úrovni celé nemovitosti i jednotlivých pokojů (jakákoliv aktivní rezervace blokuje celou nemovitost). */
export const checkDateRangeConflict = async (
  propertyId: string,
  checkIn: string,
  checkOut: string,
  roomId?: string | null
): Promise<{ hasConflict: boolean; conflictDates: string[] }> => {
  const start = new Date(checkIn + "T00:00:00");
  const end = new Date(checkOut + "T00:00:00");
  end.setDate(end.getDate() - 1);
  if (end < start) return { hasConflict: false, conflictDates: [] };

  const days = eachDayOfInterval({ start, end }).map(d => format(d, "yyyy-MM-dd"));

  let availQuery = supabase
    .from("rental_availability")
    .select("date,status,room_id")
    .eq("property_id", propertyId)
    .in("date", days)
    .in("status", ["blocked", "booked", "pending"]);
  if (roomId) {
    availQuery = availQuery.or(`room_id.eq.${roomId},room_id.is.null`);
  }
  const { data: avail } = await availQuery;

  let resQuery = supabase
    .from("rental_reservations")
    .select("check_in_date,check_out_date,booking_status,room_id")
    .eq("property_id", propertyId)
    .in("booking_status", ["confirmed", "pending"])
    .lt("check_in_date", checkOut)
    .gt("check_out_date", checkIn);
  if (roomId) {
    resQuery = resQuery.or(`room_id.eq.${roomId},room_id.is.null`);
  }
  const { data: res } = await resQuery;

  const conflictSet = new Set<string>();
  (avail || []).forEach((a: any) => conflictSet.add(a.date));
  if (res && res.length > 0) {
    res.forEach((r: any) => {
      const s = new Date(r.check_in_date + "T00:00:00");
      const e = new Date(r.check_out_date + "T00:00:00");
      e.setDate(e.getDate() - 1);
      if (e >= s) {
        eachDayOfInterval({ start: s, end: e }).forEach(d => {
          const ds = format(d, "yyyy-MM-dd");
          if (days.includes(ds)) conflictSet.add(ds);
        });
      }
    });
  }

  return { hasConflict: conflictSet.size > 0, conflictDates: Array.from(conflictSet).sort() };
};
