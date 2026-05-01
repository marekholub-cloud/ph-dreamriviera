import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { CalendarDays, Loader2, Search, BedDouble, Users, MapPin, Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { calculateRentalPrice, type PricingRule } from "@/lib/rentalPricing";
import { checkDateRangeConflict } from "@/components/rentals/RentalAvailabilityManager";
import { cn } from "@/lib/utils";

type Property = {
  id: string;
  title: string;
  city: string | null;
  status: string;
  max_guests: number;
  price_per_night: number | null;
  cleaning_fee: number;
  base_currency: string;
  owner_id: string;
};

type GuestProfile = { id: string; full_name: string | null; email: string; phone: string | null };

type Breakdown = ReturnType<typeof calculateRentalPrice>;

export const OfflineReservationSection = () => {
  const { user } = useAuth();

  // Search filters
  const [checkIn, setCheckIn] = useState<Date | undefined>(addDays(new Date(), 1));
  const [checkOut, setCheckOut] = useState<Date | undefined>(addDays(new Date(), 3));
  const [guests, setGuests] = useState(2);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ property: Property; breakdown: Breakdown | null; total: number }[]>([]);
  const [searched, setSearched] = useState(false);

  // Booking state
  const [selected, setSelected] = useState<Property | null>(null);
  const [requests, setRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Guest selection
  const [guestMode, setGuestMode] = useState<"existing" | "manual">("existing");
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  const [profiles, setProfiles] = useState<GuestProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<GuestProfile | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0;

  // Search profiles (debounced via popover open)
  useEffect(() => {
    if (!profilePopoverOpen) return;
    const t = setTimeout(async () => {
      const term = profileSearch.trim();
      let q = supabase.from("profiles").select("id,full_name,email,phone").limit(20);
      if (term) {
        q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }
      const { data } = await q;
      setProfiles((data || []) as GuestProfile[]);
    }, 200);
    return () => clearTimeout(t);
  }, [profileSearch, profilePopoverOpen]);

  const search = async () => {
    if (!checkIn || !checkOut || nights <= 0) {
      toast({ title: "Vyberte termín", description: "Datum odjezdu musí být po datu příjezdu.", variant: "destructive" });
      return;
    }
    setSearching(true);
    setSearched(true);
    setResults([]);
    setSelected(null);
    try {
      const ci = format(checkIn, "yyyy-MM-dd");
      const co = format(checkOut, "yyyy-MM-dd");

      // 1. all active properties matching capacity
      const { data: props, error: pErr } = await supabase
        .from("rental_properties")
        .select("id,title,city,status,max_guests,price_per_night,cleaning_fee,base_currency,owner_id")
        .eq("status", "active")
        .gte("max_guests", guests)
        .order("title", { ascending: true });
      if (pErr) throw pErr;

      const candidates = (props || []) as Property[];
      if (candidates.length === 0) {
        setSearching(false);
        return;
      }

      // 2. for each, check conflict (entire property level) in parallel
      const conflicts = await Promise.all(
        candidates.map((p) => checkDateRangeConflict(p.id, ci, co, null))
      );

      const free = candidates.filter((_, i) => !conflicts[i].hasConflict);
      if (free.length === 0) {
        setSearching(false);
        return;
      }

      // 3. fetch pricing rules for available
      const { data: rules } = await supabase
        .from("rental_pricing_rules")
        .select("*")
        .in("property_id", free.map((p) => p.id));
      const rulesByProp = new Map<string, PricingRule[]>();
      (rules || []).forEach((r: any) => {
        const arr = rulesByProp.get(r.property_id) || [];
        arr.push(r as PricingRule);
        rulesByProp.set(r.property_id, arr);
      });

      const computed = free.map((p) => {
        if (!p.price_per_night) return { property: p, breakdown: null, total: 0 };
        const breakdown = calculateRentalPrice(p.price_per_night, checkIn, checkOut, rulesByProp.get(p.id) || []);
        const total = breakdown.total + (breakdown.nights > 0 ? p.cleaning_fee : 0);
        return { property: p, breakdown, total };
      });

      setResults(computed);
    } catch (err: any) {
      toast({ title: "Chyba vyhledávání", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const selectedComputed = useMemo(
    () => results.find((r) => r.property.id === selected?.id) || null,
    [results, selected]
  );

  const submit = async () => {
    if (!user || !selected || !checkIn || !checkOut || !selectedComputed) return;

    let guestId: string | null = null;
    let guestNote = "";

    if (guestMode === "existing") {
      if (!selectedProfile) {
        toast({ title: "Vyberte hosta", description: "Vyhledejte existujícího uživatele nebo přepněte na ruční zadání.", variant: "destructive" });
        return;
      }
      guestId = selectedProfile.id;
    } else {
      if (!manualName.trim() || !manualEmail.trim()) {
        toast({ title: "Doplňte údaje hosta", description: "Jméno a email jsou povinné.", variant: "destructive" });
        return;
      }
      // For offline manual guest, store host-as-guest with contact embedded in special_requests
      // (avoids creating auth account silently from admin panel)
      guestId = user.id;
      guestNote = `OFFLINE — Host: ${manualName} | ${manualEmail}${manualPhone ? ` | ${manualPhone}` : ""}\n`;
    }

    setSubmitting(true);
    try {
      // re-check just before insert
      const ci = format(checkIn, "yyyy-MM-dd");
      const co = format(checkOut, "yyyy-MM-dd");
      const { hasConflict, conflictDates } = await checkDateRangeConflict(selected.id, ci, co, null);
      if (hasConflict) {
        toast({
          title: "Termín už není volný",
          description: `Konflikt: ${conflictDates.slice(0, 3).join(", ")}${conflictDates.length > 3 ? "…" : ""}`,
          variant: "destructive",
        });
        return;
      }

      const subtotal = selectedComputed.breakdown?.total ?? 0;
      const total = selectedComputed.total;
      const finalNote = `${guestNote}${requests ? requests : ""}`.trim() || null;

      const { error } = await supabase.from("rental_reservations").insert({
        property_id: selected.id,
        room_id: null,
        guest_id: guestId,
        host_id: selected.owner_id,
        check_in_date: ci,
        check_out_date: co,
        nights,
        guests_count: guests,
        adults: guests,
        booking_type: "entire_property" as any,
        booking_status: "confirmed",
        payment_status: "unpaid",
        price_base: subtotal,
        cleaning_fee: selected.cleaning_fee,
        total_amount: total,
        currency: selected.base_currency,
        special_requests: finalNote,
      });
      if (error) throw error;

      toast({ title: "Offline rezervace vytvořena", description: `${selected.title}: ${ci} → ${co}` });

      // reset booking state but keep search
      setSelected(null);
      setRequests("");
      setSelectedProfile(null);
      setManualName(""); setManualEmail(""); setManualPhone("");
      // refresh search to remove now-booked property
      search();
    } catch (err: any) {
      toast({ title: "Chyba při vytváření rezervace", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> Offline rezervace
        </CardTitle>
        <CardDescription>
          Vyhledejte volné nemovitosti pro daný termín a vytvořte rezervaci jménem hosta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search bar */}
        <div className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
          <div className="grid gap-1">
            <Label>Termín pobytu (klikněte příjezd, poté odjezd)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start font-normal">
                  <CalendarDays className="mr-2 h-4 w-4 opacity-60" />
                  {checkIn ? format(checkIn, "PPP") : "Příjezd"}
                  <span className="mx-2 opacity-60">→</span>
                  {checkOut ? format(checkOut, "PPP") : "Odjezd"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={{ from: checkIn, to: checkOut }}
                  onSelect={(range) => {
                    setCheckIn(range?.from);
                    setCheckOut(range?.to);
                  }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-1">
            <Label>Hosté</Label>
            <Input type="number" min={1} value={guests} onChange={(e) => setGuests(Math.max(1, +e.target.value || 1))} />
          </div>
          <Button onClick={search} disabled={searching} className="gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Vyhledat
          </Button>
        </div>

        {/* Results */}
        {searched && !searching && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {results.length === 0
                ? "Žádné volné nemovitosti pro zvolený termín a počet hostů."
                : `Nalezeno ${results.length} volných nemovitostí (${nights} ${nights === 1 ? "noc" : nights < 5 ? "noci" : "nocí"}).`}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {results.map(({ property, total, breakdown }) => {
                const isSelected = selected?.id === property.id;
                return (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => setSelected(property)}
                    className={cn(
                      "text-left rounded-lg border p-4 transition hover:border-primary/50 hover:shadow-md",
                      isSelected && "border-primary ring-1 ring-primary/40 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{property.title}</div>
                      {isSelected && <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Vybráno</Badge>}
                    </div>
                    {property.city && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />{property.city}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />max {property.max_guests}</span>
                      <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{property.price_per_night ?? "—"} {property.base_currency}/noc</span>
                    </div>
                    {breakdown && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Celkem</span>
                        <span className="font-semibold">{total.toLocaleString()} {property.base_currency}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Booking form */}
        {selected && selectedComputed && (
          <div className="rounded-lg border-2 border-primary/30 bg-card p-4 space-y-4">
            <div>
              <h3 className="text-lg">Vytvořit rezervaci — {selected.title}</h3>
              <p className="text-xs text-muted-foreground">
                {checkIn && format(checkIn, "PPP")} → {checkOut && format(checkOut, "PPP")} • {nights} {nights === 1 ? "noc" : "nocí"} • {guests} {guests === 1 ? "host" : "hostů"}
              </p>
            </div>

            {/* Guest selector */}
            <div className="space-y-2">
              <div className="inline-flex w-full max-w-sm rounded-md border p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setGuestMode("existing")}
                  className={cn("flex-1 rounded px-3 py-1.5 transition", guestMode === "existing" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  Existující uživatel
                </button>
                <button
                  type="button"
                  onClick={() => setGuestMode("manual")}
                  className={cn("flex-1 rounded px-3 py-1.5 transition", guestMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  Ručně zadat
                </button>
              </div>

              {guestMode === "existing" ? (
                <Popover open={profilePopoverOpen} onOpenChange={setProfilePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      {selectedProfile ? (
                        <span className="truncate">{selectedProfile.full_name || selectedProfile.email}</span>
                      ) : (
                        <span className="text-muted-foreground">Vyhledat hosta podle jména/emailu/telefonu…</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Hledat…" value={profileSearch} onValueChange={setProfileSearch} />
                      <CommandList>
                        <CommandEmpty>Žádné výsledky.</CommandEmpty>
                        <CommandGroup>
                          {profiles.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.id}
                              onSelect={() => {
                                setSelectedProfile(p);
                                setProfilePopoverOpen(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{p.full_name || "(bez jména)"}</span>
                                <span className="text-xs text-muted-foreground">{p.email}{p.phone ? ` • ${p.phone}` : ""}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-1">
                    <Label className="text-xs">Jméno *</Label>
                    <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Jan Novák" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="jan@example.com" />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Telefon</Label>
                    <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="+420…" />
                  </div>
                </div>
              )}
            </div>

            {/* Special requests */}
            <div className="grid gap-1">
              <Label>Poznámka k rezervaci</Label>
              <Textarea rows={3} value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="Zvláštní požadavky, doplňující informace…" />
            </div>

            {/* Price summary */}
            {selectedComputed.breakdown && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Mezisoučet ({selectedComputed.breakdown.nights} nocí)</span><span>{selectedComputed.breakdown.subtotal.toLocaleString()} {selected.base_currency}</span></div>
                {selectedComputed.breakdown.lengthOfStayDiscount !== 0 && (
                  <div className="flex justify-between text-primary"><span>Sleva za délku pobytu</span><span>{selectedComputed.breakdown.lengthOfStayDiscount.toLocaleString()} {selected.base_currency}</span></div>
                )}
                {selected.cleaning_fee > 0 && (
                  <div className="flex justify-between text-muted-foreground"><span>Úklid</span><span>{selected.cleaning_fee} {selected.base_currency}</span></div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Celkem</span><span>{selectedComputed.total.toLocaleString()} {selected.base_currency}</span></div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)} disabled={submitting}>Zrušit</Button>
              <Button onClick={submit} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Vytvořit rezervaci
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
