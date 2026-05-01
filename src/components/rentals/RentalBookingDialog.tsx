import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { checkDateRangeConflict } from "@/components/rentals/RentalAvailabilityManager";
import { calculateRentalPrice, type PricingRule } from "@/lib/rentalPricing";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  property: {
    id: string;
    title: string;
    max_guests: number;
    price_per_night: number | null;
    cleaning_fee: number;
    base_currency: string;
  };
  hostId: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  /** Optional room being booked. If provided, room price/capacity overrides property's. */
  room?: {
    id: string;
    name: string;
    max_guests: number;
    price_per_night: number | null;
  } | null;
}

type Step = "details" | "contact";
type ContactMode = "signin" | "guest";

export const RentalBookingDialog = ({ open, onOpenChange, property, hostId, initialCheckIn, initialCheckOut, room }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [requests, setRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);

  // Contact / auth step
  const [contactMode, setContactMode] = useState<ContactMode>("guest");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [guestFullName, setGuestFullName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initialCheckIn) setCheckIn(initialCheckIn);
    if (initialCheckOut) setCheckOut(initialCheckOut);
    setStep("details");
    setContactMode(user ? "signin" : "guest");
    supabase.from("rental_pricing_rules").select("*").eq("property_id", property.id)
      .then(({ data }) => setPricingRules((data as PricingRule[]) || []));

    // Load unavailable dates: blocks + active reservations (next 18 months)
    (async () => {
      const today = new Date();
      const horizon = new Date();
      horizon.setMonth(horizon.getMonth() + 18);
      const todayStr = format(today, "yyyy-MM-dd");
      const horizonStr = format(horizon, "yyyy-MM-dd");

      let availQuery = supabase
        .from("rental_availability")
        .select("date,status,room_id")
        .eq("property_id", property.id)
        .gte("date", todayStr)
        .lte("date", horizonStr)
        .in("status", ["blocked", "booked", "pending"]);
      if (room?.id) {
        availQuery = availQuery.or(`room_id.eq.${room.id},room_id.is.null`);
      } else {
        availQuery = availQuery.is("room_id", null);
      }

      const [{ data: avail }, reservationResp] = await Promise.all([
        availQuery,
        supabase.functions.invoke("get-public-rental-reservations", {
          body: { propertyId: property.id, startDate: todayStr, endDate: horizonStr, roomId: room?.id ?? null },
        }),
      ]);

      const reservations = (reservationResp.data?.reservations as any[]) || [];

      const set = new Set<string>();
      (avail || []).forEach((a: any) => set.add(a.date));
      reservations.forEach((r: any) => {
        const s = new Date(r.check_in_date + "T00:00:00");
        const e = new Date(r.check_out_date + "T00:00:00");
        // checkout day is departure — not occupied as a night
        for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
          set.add(format(d, "yyyy-MM-dd"));
        }
      });
      setUnavailableDates(Array.from(set).map(s => new Date(s + "T00:00:00")));
    })();
  }, [open, property.id, initialCheckIn, initialCheckOut, user]);

  const isDateUnavailable = (d: Date) => {
    const ds = format(d, "yyyy-MM-dd");
    return unavailableDates.some(u => format(u, "yyyy-MM-dd") === ds);
  };

  // Detect if a selected range straddles any unavailable date
  const rangeContainsUnavailable = (from?: Date, to?: Date) => {
    if (!from || !to) return false;
    for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
      if (isDateUnavailable(d)) return true;
    }
    return false;
  };

  const effectivePricePerNight = room?.price_per_night ?? property.price_per_night;
  const effectiveMaxGuests = room?.max_guests ?? property.max_guests;

  const breakdown = useMemo(() => {
    if (!checkIn || !checkOut || !effectivePricePerNight) return null;
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (co <= ci) return null;
    return calculateRentalPrice(effectivePricePerNight, ci, co, pricingRules);
  }, [checkIn, checkOut, effectivePricePerNight, pricingRules]);

  const nights = breakdown?.nights ?? 0;
  const subtotal = breakdown?.total ?? 0;
  const total = subtotal + (nights > 0 ? property.cleaning_fee : 0);

  const goToContact = () => {
    if (!checkIn || !checkOut || nights <= 0) {
      toast({ title: "Select dates", description: "Check-out must be after check-in.", variant: "destructive" });
      return;
    }
    if (guests > effectiveMaxGuests) {
      toast({ title: "Capacity exceeded", description: `Max. ${effectiveMaxGuests} guests.`, variant: "destructive" });
      return;
    }
    setStep("contact");
  };

  const createReservation = async (guestUserId: string) => {
    const { hasConflict, conflictDates } = await checkDateRangeConflict(property.id, checkIn, checkOut, room?.id ?? null);
    if (hasConflict) {
      toast({
        title: "Dates not available",
        description: `Conflict: ${conflictDates.slice(0, 3).join(", ")}${conflictDates.length > 3 ? "..." : ""}`,
        variant: "destructive",
      });
      return false;
    }

    const guestNote = contactMode === "guest"
      ? `Guest contact: ${guestFullName} | ${guestEmail}${guestPhone ? ` | ${guestPhone}` : ""}\n\n${requests || ""}`.trim()
      : (requests || null);

    const { error } = await supabase.from("rental_reservations").insert({
      property_id: property.id,
      room_id: room?.id ?? null,
      guest_id: guestUserId,
      host_id: hostId,
      check_in_date: checkIn,
      check_out_date: checkOut,
      nights,
      guests_count: guests,
      adults: guests,
      booking_type: (room ? "room" : "entire_property") as any,
      booking_status: "pending",
      payment_status: "unpaid",
      price_base: subtotal,
      cleaning_fee: property.cleaning_fee,
      total_amount: total,
      currency: property.base_currency,
      special_requests: guestNote,
    });

    if (error) {
      toast({ title: "Booking error", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Already logged in
      if (user) {
        const ok = await createReservation(user.id);
        if (ok) finishSuccess();
        return;
      }

      if (contactMode === "signin") {
        if (!signInEmail || !signInPassword) {
          toast({ title: "Missing credentials", description: "Enter email and password.", variant: "destructive" });
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email: signInEmail.trim(),
          password: signInPassword,
        });
        if (error || !data.user) {
          toast({ title: "Sign-in failed", description: error?.message || "Invalid credentials.", variant: "destructive" });
          return;
        }
        const ok = await createReservation(data.user.id);
        if (ok) finishSuccess();
        return;
      }

      // Guest mode → create account from contact info
      if (!guestFullName || !guestEmail) {
        toast({ title: "Missing details", description: "Full name and email are required.", variant: "destructive" });
        return;
      }
      const tempPassword = `${crypto.randomUUID()}Aa1!`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: guestEmail.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: guestFullName, phone: guestPhone || null },
        },
      });
      if (signUpError || !signUpData.user) {
        const msg = signUpError?.message || "";
        if (msg.toLowerCase().includes("registered")) {
          toast({
            title: "Email already registered",
            description: "Please switch to sign-in to continue.",
            variant: "destructive",
          });
          setContactMode("signin");
          setSignInEmail(guestEmail);
        } else {
          toast({ title: "Could not create account", description: msg, variant: "destructive" });
        }
        return;
      }
      const ok = await createReservation(signUpData.user.id);
      if (ok) {
        toast({
          title: "Account created",
          description: "Check your email to confirm your address and set a password.",
        });
        finishSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const finishSuccess = () => {
    toast({ title: "Reservation submitted", description: "The host will confirm as soon as possible." });
    onOpenChange(false);
    setCheckIn(""); setCheckOut(""); setRequests("");
    setGuestFullName(""); setGuestEmail(""); setGuestPhone("");
    setSignInEmail(""); setSignInPassword("");
    setStep("details");
  };

  const PriceSummary = () => (
    breakdown && effectivePricePerNight ? (
      <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span>Subtotal ({nights} {nights === 1 ? "night" : "nights"})</span>
          <span>{breakdown.subtotal.toLocaleString()} {property.base_currency}</span>
        </div>
        {breakdown.lengthOfStayDiscount !== 0 && (
          <div className="flex justify-between text-primary">
            <span>Length-of-stay discount</span>
            <span>{breakdown.lengthOfStayDiscount.toLocaleString()} {property.base_currency}</span>
          </div>
        )}
        {property.cleaning_fee > 0 && (
          <div className="flex justify-between text-muted-foreground"><span>Cleaning</span><span>{property.cleaning_fee} {property.base_currency}</span></div>
        )}
        <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total</span><span>{total.toLocaleString()} {property.base_currency}</span></div>
        {breakdown.appliedRules.length > 0 && (
          <p className="text-xs text-muted-foreground pt-1">{breakdown.appliedRules.length} pricing {breakdown.appliedRules.length === 1 ? "rule" : "rules"} applied.</p>
        )}
      </div>
    ) : null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "flex flex-col p-0 gap-0",
        // Mobile: full-screen, pinned bottom; Desktop: centered modal
        "max-sm:!top-0 max-sm:!left-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!max-w-none max-sm:w-screen max-sm:h-[100dvh] max-sm:!rounded-none max-sm:border-0",
        "sm:max-h-[90vh]",
        step === "details" ? "sm:max-w-3xl" : "sm:max-w-md"
      )}>
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="font-serif">
            {step === "details" ? "Book your stay" : "Your contact details"}
          </DialogTitle>
          <DialogDescription>
            {step === "details"
              ? (room ? `${property.title} — ${room.name}` : property.title)
              : "Step 2 of 2 — sign in or continue as a guest"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
        {step === "details" && (
          <div className="grid gap-6 py-2 md:grid-cols-2">
            {/* Left column: calendar */}
            <div className="grid gap-2">
              <Label>Select your stay (click check-in, then check-out)</Label>
              <div className="rounded-md border flex justify-center">
                <Calendar
                  mode="range"
                  numberOfMonths={1}
                  selected={{
                    from: checkIn ? new Date(checkIn) : undefined,
                    to: checkOut ? new Date(checkOut) : undefined,
                  }}
                  onSelect={(range) => {
                    if (!range) {
                      setCheckIn(""); setCheckOut("");
                      return;
                    }
                    if (rangeContainsUnavailable(range.from, range.to)) {
                      toast({
                        title: "Dates not available",
                        description: "Your selection includes already booked or blocked nights.",
                        variant: "destructive",
                      });
                      setCheckIn(range.from ? format(range.from, "yyyy-MM-dd") : "");
                      setCheckOut("");
                      return;
                    }
                    setCheckIn(range.from ? format(range.from, "yyyy-MM-dd") : "");
                    setCheckOut(range.to ? format(range.to, "yyyy-MM-dd") : "");
                  }}
                  disabled={(d) =>
                    d < new Date(new Date().setHours(0, 0, 0, 0)) || isDateUnavailable(d)
                  }
                  modifiers={{ unavailable: unavailableDates }}
                  modifiersClassNames={{
                    unavailable:
                      "line-through text-muted-foreground/60 bg-muted/50 hover:bg-muted/50",
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-sm bg-muted/70 align-middle mr-1" />
                Crossed-out dates are already booked or unavailable.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border px-3 py-2">
                  <div className="text-xs text-muted-foreground">Check-in</div>
                  <div className="font-medium">
                    {checkIn ? format(new Date(checkIn), "PPP") : <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <div className="text-xs text-muted-foreground">Check-out</div>
                  <div className="font-medium">
                    {checkOut ? format(new Date(checkOut), "PPP") : <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: guests, requests, price */}
            <div className="grid gap-4 content-start">
              <div className="grid gap-1">
                <Label>Number of guests (max {effectiveMaxGuests})</Label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: effectiveMaxGuests }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setGuests(n)}
                      className={cn(
                        "h-10 min-w-10 px-3 rounded-md border text-sm font-medium transition-colors",
                        guests === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-pressed={guests === n}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-1">
                <Label>Special requests (optional)</Label>
                <Textarea rows={4} value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="Late arrival, allergies, ..." />
              </div>

              <PriceSummary />
            </div>
          </div>
        )}

        {step === "contact" && (
          <div className="grid gap-4 py-2">
            {user ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                Signed in as <span className="font-medium">{user.email}</span>
              </div>
            ) : (
              <>
                <div className="inline-flex w-full rounded-md border p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setContactMode("guest")}
                    className={cn(
                      "flex-1 rounded px-3 py-1.5 transition",
                      contactMode === "guest" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Continue as guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactMode("signin")}
                    className={cn(
                      "flex-1 rounded px-3 py-1.5 transition",
                      contactMode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Sign in
                  </button>
                </div>

                {contactMode === "guest" && (
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label>Full name *</Label>
                      <Input value={guestFullName} onChange={(e) => setGuestFullName(e.target.value)} placeholder="Jane Doe" maxLength={100} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Email *</Label>
                      <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@example.com" maxLength={255} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Phone (optional)</Label>
                      <Input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+1 555 123 4567" maxLength={30} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll create an account so you can track your reservation. A confirmation email will be sent.
                    </p>
                  </div>
                )}

                {contactMode === "signin" && (
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <Label>Email</Label>
                      <Input type="email" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} maxLength={255} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Password</Label>
                      <Input type="password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => { onOpenChange(false); navigate("/auth"); }}
                      className="text-xs text-muted-foreground hover:text-foreground text-left"
                    >
                      Need a full account or password reset? Open sign-in page →
                    </button>
                  </div>
                )}
              </>
            )}

            <PriceSummary />
          </div>
        )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 px-6 py-4 border-t bg-background shrink-0 sticky bottom-0">
          {step === "details" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={goToContact} disabled={nights <= 0}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("details")} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit reservation
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
