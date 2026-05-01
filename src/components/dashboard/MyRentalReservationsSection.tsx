import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CalendarDays, Check, X, Plus, Ban, CreditCard, Home, BedDouble, Search, FilterX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RentalTransactionDialog } from "@/components/rentals/RentalTransactionDialog";
import { CancelReservationDialog } from "@/components/rentals/CancelReservationDialog";
import { TX_TYPE_LABEL, formatMoney, type RentalTransactionType, type RentalTransactionStatus } from "@/lib/rentalTransactions";

interface IncomingReservation {
  id: string;
  reservation_code: string;
  property_id: string;
  host_id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  guests_count: number;
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  pets?: number | null;
  booking_status: string;
  payment_status?: string;
  total_amount: number;
  currency: string;
  special_requests: string | null;
  created_at: string;
  room_id: string | null;
  property?: { title: string };
  room?: { name: string } | null;
  guest?: { full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null } | null;
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

interface MyRentalReservationsSectionProps {
  managerMode?: boolean;
}

export const MyRentalReservationsSection = ({ managerMode = false }: MyRentalReservationsSectionProps = {}) => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<IncomingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IncomingReservation | null>(null);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [defaultTxType, setDefaultTxType] = useState<RentalTransactionType>("balance");
  const [defaultTxAmount, setDefaultTxAmount] = useState<number | undefined>();
  const [txs, setTxs] = useState<Array<{ id: string; type: RentalTransactionType; status: RentalTransactionStatus; amount: number; currency: string; payment_method: string | null; notes: string | null; occurred_at: string }>>([]);
  const [balance, setBalance] = useState<{ paid: number; refunded: number; outstanding: number; total: number } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const loadTransactions = useCallback(async (resId: string) => {
    const { data } = await supabase
      .from("rental_transactions")
      .select("id,type,status,amount,currency,payment_method,notes,occurred_at")
      .eq("reservation_id", resId)
      .order("occurred_at", { ascending: false });
    setTxs((data || []) as any);

    const { data: bal } = await supabase.rpc("rental_reservation_balance", { p_reservation_id: resId });
    if (bal && bal[0]) {
      setBalance({
        paid: Number(bal[0].paid),
        refunded: Number(bal[0].refunded),
        outstanding: Number(bal[0].outstanding),
        total: Number(bal[0].total),
      });
    }
  }, []);

  useEffect(() => {
    if (selected) loadTransactions(selected.id);
    else { setTxs([]); setBalance(null); }
  }, [selected, loadTransactions]);

  const fetch = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("rental_reservations")
      .select("id,reservation_code,property_id,host_id,guest_id,room_id,check_in_date,check_out_date,nights,guests_count,adults,children,infants,pets,booking_status,payment_status,total_amount,currency,special_requests,created_at,property:rental_properties(title),room:rental_rooms(name)")
      .order("created_at", { ascending: false });

    if (!managerMode) {
      const { data: props, error: propsError } = await supabase
        .from("rental_properties")
        .select("id")
        .eq("owner_id", user.id);

      if (propsError) {
        toast({ title: "Chyba", description: propsError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const propIds = (props || []).map((p: any) => p.id);
      if (propIds.length === 0) {
        setReservations([]);
        setLoading(false);
        return;
      }
      query = query.in("property_id", propIds);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = (data || []) as IncomingReservation[];
    const guestIds = Array.from(new Set(rows.map((r) => r.guest_id).filter(Boolean)));

    if (guestIds.length > 0) {
      const { data: guests } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,avatar_url")
        .in("id", guestIds);
      const map = new Map((guests || []).map((g: any) => [g.id, g]));
      rows.forEach((r) => { r.guest = map.get(r.guest_id) || null; });
    }

    setReservations(rows);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [user, managerMode]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("rental_reservations")
      .update({ booking_status: status as any })
      .eq("id", id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Status aktualizován" }); fetch(); }
  };

  // Apply filters
  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    reservations.forEach((r) => {
      if (r.property_id) map.set(r.property_id, r.property?.title || "—");
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [reservations]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r) => r.booking_status && set.add(r.booking_status));
    return Array.from(set);
  }, [reservations]);

  const paymentOptions = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r) => r.payment_status && set.add(r.payment_status));
    return Array.from(set);
  }, [reservations]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.booking_status !== statusFilter) return false;
      if (paymentFilter !== "all" && (r.payment_status || "") !== paymentFilter) return false;
      if (propertyFilter !== "all" && r.property_id !== propertyFilter) return false;
      if (dateFrom && r.check_out_date < dateFrom) return false;
      if (dateTo && r.check_in_date > dateTo) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          r.reservation_code,
          r.property?.title,
          r.guest?.full_name,
          r.guest?.email,
          r.guest?.phone,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reservations, search, statusFilter, paymentFilter, propertyFilter, dateFrom, dateTo]);

  const hasActiveFilters = !!(search || statusFilter !== "all" || paymentFilter !== "all" || propertyFilter !== "all" || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setPaymentFilter("all"); setPropertyFilter("all"); setDateFrom(""); setDateTo("");
  };

  const guestName = (r: IncomingReservation) =>
    r.guest?.full_name || r.guest?.email || "Host";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> {managerMode ? "Všechny rezervace" : "Příchozí rezervace"}
          </CardTitle>
          <CardDescription>
            {managerMode ? `Přehled napříč všemi pronájmy (${filtered.length} z ${reservations.length})` : "Rezervace pro vaše pronájmy"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {!loading && reservations.length > 0 && (
            <div className="grid gap-2 mb-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Kód, host, pronájem…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny statusy</SelectItem>
                  {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Platba" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny platby</SelectItem>
                  {paymentOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {managerMode && (
                <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Nemovitost" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny nemovitosti</SelectItem>
                    {propertyOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-1">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" title="Od" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" title="Do" />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 lg:col-span-1">
                  <FilterX className="h-4 w-4" /> Vymazat
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Zatím žádné rezervace.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Žádné rezervace neodpovídají filtru.</p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3 gap-1">
                <FilterX className="h-4 w-4" /> Vymazat filtry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kód</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Pronájem</TableHead>
                  <TableHead>Příjezd → Odjezd</TableHead>
                  <TableHead>Hosté</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Platba</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs">{r.reservation_code}</TableCell>
                    <TableCell className="font-medium text-sm">{guestName(r)}</TableCell>
                    <TableCell className="text-sm">
                      <div>{r.property?.title || "—"}</div>
                      <Badge variant="secondary" className="mt-0.5 text-[10px] gap-1 h-4 px-1.5">
                        {r.room_id ? (
                          <><BedDouble className="h-3 w-3" /> {r.room?.name || "Ložnice"}</>
                        ) : (
                          <><Home className="h-3 w-3" /> Celá nemovitost</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(r.check_in_date), "dd.MM.yy")} → {format(new Date(r.check_out_date), "dd.MM.yy")}
                      <div className="text-muted-foreground">{r.nights} nocí</div>
                    </TableCell>
                    <TableCell>{r.guests_count}</TableCell>
                    <TableCell className="font-medium">{r.total_amount.toLocaleString()} {r.currency}</TableCell>
                    <TableCell><Badge variant="outline">{r.payment_status || "—"}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[r.booking_status]}>{r.booking_status}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {r.booking_status === "pending" && (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "confirmed")}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "cancelled_by_host")}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="">Detail rezervace</DialogTitle>
                <DialogDescription className="font-mono text-xs">{selected.reservation_code}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground mb-1">Host</div>
                  <div className="font-medium">{guestName(selected)}</div>
                  {selected.guest?.email && <div className="text-muted-foreground text-xs">{selected.guest.email}</div>}
                  {selected.guest?.phone && <div className="text-muted-foreground text-xs">{selected.guest.phone}</div>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Pronájem</div>
                    <div className="font-medium">{selected.property?.title || "—"}</div>
                    <Badge variant="secondary" className="mt-1 text-[10px] gap-1 h-5 px-1.5">
                      {selected.room_id ? (
                        <><BedDouble className="h-3 w-3" /> {selected.room?.name || "Ložnice"}</>
                      ) : (
                        <><Home className="h-3 w-3" /> Celá nemovitost</>
                      )}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge className={statusColors[selected.booking_status]}>{selected.booking_status}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Příjezd</div>
                    <div>{format(new Date(selected.check_in_date), "dd.MM.yyyy")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Odjezd</div>
                    <div>{format(new Date(selected.check_out_date), "dd.MM.yyyy")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Nocí</div>
                    <div>{selected.nights}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Hosté</div>
                    <div>
                      {selected.guests_count}
                      {(selected.adults || selected.children || selected.infants || selected.pets) ? (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({selected.adults ?? 0} dosp. · {selected.children ?? 0} dětí
                          {selected.infants ? ` · ${selected.infants} kojenců` : ""}
                          {selected.pets ? ` · ${selected.pets} mazlíčků` : ""})
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Celková cena</div>
                    <div className="font-semibold">{selected.total_amount.toLocaleString()} {selected.currency}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Platba</div>
                    <Badge variant="outline">{selected.payment_status || "—"}</Badge>
                  </div>
                </div>

                {selected.special_requests && (
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground mb-1">Speciální požadavky</div>
                    <div className="whitespace-pre-wrap">{selected.special_requests}</div>
                  </div>
                )}

                {/* Finanční přehled */}
                {balance && (
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium uppercase text-muted-foreground">Finance</div>
                      <Button size="sm" variant="ghost" onClick={() => { setDefaultTxType("balance"); setDefaultTxAmount(Math.max(0, balance.outstanding)); setTxDialogOpen(true); }}>
                        <Plus className="h-3 w-3" /> Transakce
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Zaplaceno</div>
                        <div className="font-semibold text-green-700">{formatMoney(balance.paid, selected.currency)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Vráceno</div>
                        <div className="font-semibold text-destructive">{formatMoney(balance.refunded, selected.currency)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Dlužné</div>
                        <div className={`font-semibold ${balance.outstanding > 0 ? "text-orange-600" : "text-foreground"}`}>
                          {formatMoney(balance.outstanding, selected.currency)}
                        </div>
                      </div>
                    </div>

                    {balance.outstanding > 0 && (
                      <Button
                        size="sm"
                        className="mt-3 w-full gap-2"
                        onClick={() => { setDefaultTxType("full_payment"); setDefaultTxAmount(balance.outstanding); setTxDialogOpen(true); }}
                      >
                        <CreditCard className="h-3 w-3" /> Označit jako zaplaceno ({formatMoney(balance.outstanding, selected.currency)})
                      </Button>
                    )}

                    {txs.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {txs.map((t) => (
                          <div key={t.id} className="flex items-center justify-between text-xs border-t pt-1.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">{TX_TYPE_LABEL[t.type]}</Badge>
                              <span className="text-muted-foreground">{format(new Date(t.occurred_at), "dd.MM.yy")}</span>
                              {t.payment_method && <span className="text-muted-foreground">· {t.payment_method}</span>}
                            </div>
                            <div className={`font-medium ${t.amount < 0 ? "text-destructive" : "text-green-700"}`}>
                              {formatMoney(Number(t.amount), t.currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Vytvořeno: {format(new Date(selected.created_at), "dd.MM.yyyy HH:mm")}
                </div>

                <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
                  {selected.booking_status === "pending" && (
                    <>
                      <Button variant="outline" onClick={() => { updateStatus(selected.id, "cancelled_by_host"); setSelected(null); }}>
                        <X className="h-4 w-4" /> Zamítnout
                      </Button>
                      <Button onClick={() => { updateStatus(selected.id, "confirmed"); }}>
                        <Check className="h-4 w-4" /> Potvrdit
                      </Button>
                    </>
                  )}
                  {selected.booking_status === "confirmed" && (
                    <>
                      <Button variant="outline" onClick={() => updateStatus(selected.id, "checked_in")}>Check-in</Button>
                    </>
                  )}
                  {selected.booking_status === "checked_in" && (
                    <Button variant="outline" onClick={() => updateStatus(selected.id, "checked_out")}>Check-out</Button>
                  )}
                  {!["cancelled_by_host","cancelled_by_guest","completed","checked_out"].includes(selected.booking_status) && (
                    <Button variant="destructive" onClick={() => setCancelDialogOpen(true)} className="gap-2">
                      <Ban className="h-4 w-4" /> Stornovat
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RentalTransactionDialog
        open={txDialogOpen}
        onOpenChange={setTxDialogOpen}
        reservation={selected}
        defaultType={defaultTxType}
        defaultAmount={defaultTxAmount}
        onSaved={() => selected && loadTransactions(selected.id)}
      />

      <CancelReservationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        reservation={selected}
        onCancelled={() => { fetch(); setSelected(null); }}
      />
    </>
  );
};

