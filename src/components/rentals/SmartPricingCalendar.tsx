import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateRentalPrice, type PricingRule } from "@/lib/rentalPricing";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";

interface Props {
  propertyId: string;
  basePrice: number | null;
  baseCurrency: string;
  /** Optional room scope — when set, calendar shows pricing for that specific room. */
  roomId?: string | null;
}

const WEEKDAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

/**
 * Visual smart-pricing calendar — preview that shows the resolved
 * price-per-night for each day after applying all active pricing rules.
 * Read-only view; rules are still managed via RentalPricingManager.
 */
export const SmartPricingCalendar = ({ propertyId, basePrice, baseCurrency, roomId }: Props) => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("rental_pricing_rules")
        .select("id, rule_type, adjustment_type, adjustment_value, start_date, end_date, weekdays, min_nights, max_nights, priority, is_active")
        .eq("property_id", propertyId);
      setRules((data || []) as PricingRule[]);
      setLoading(false);
    };
    load();
  }, [propertyId, roomId]);

  const days = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Compute per-day price using calculateRentalPrice with 1-night stay (no LOS rule)
  const priceForDay = (d: Date): { price: number; delta: number; ruleLabel: string | null } => {
    if (!basePrice) return { price: 0, delta: 0, ruleLabel: null };
    const checkIn = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 1);
    const result = calculateRentalPrice(basePrice, checkIn, checkOut, rules);
    const price = result.subtotal;
    const delta = price - basePrice;
    const ruleLabel = result.appliedRules[0]?.label || null;
    return { price, delta, ruleLabel };
  };

  // Stats for current month
  const monthStats = useMemo(() => {
    if (!basePrice) return null;
    const prices = days.map((d) => priceForDay(d).price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { min, max, avg, total: prices.reduce((a, b) => a + b, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, rules, basePrice]);

  // First day padding (Monday-based)
  const firstDayOffset = (getDay(days[0]) + 6) % 7; // Sun=0 → 6, Mon=1 → 0

  if (!basePrice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <CalendarDays className="h-5 w-5" /> Cenový kalendář
          </CardTitle>
          <CardDescription>Nejprve nastavte základní cenu za noc.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif">
              <CalendarDays className="h-5 w-5" /> Cenový kalendář
            </CardTitle>
            <CardDescription>
              Náhled výsledné ceny za noc po aplikaci pravidel. Změny pravidel se projeví okamžitě.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="icon" variant="outline" onClick={() => setCursor((c) => subMonths(c, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium capitalize min-w-[140px] text-center">
              {format(cursor, "LLLL yyyy", { locale: cs })}
            </span>
            <Button size="icon" variant="outline" onClick={() => setCursor((c) => addMonths(c, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats bar */}
              {monthStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                  <Stat label="Nejnižší" value={`${Math.round(monthStats.min)} ${baseCurrency}`} icon={<TrendingDown className="h-3.5 w-3.5 text-emerald-600" />} />
                  <Stat label="Průměr" value={`${Math.round(monthStats.avg)} ${baseCurrency}`} />
                  <Stat label="Nejvyšší" value={`${Math.round(monthStats.max)} ${baseCurrency}`} icon={<TrendingUp className="h-3.5 w-3.5 text-rose-600" />} />
                  <Stat label="Měsíc max." value={`${Math.round(monthStats.total).toLocaleString()} ${baseCurrency}`} />
                </div>
              )}

              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1 mb-1 text-xs font-medium text-muted-foreground">
                {WEEKDAY_LABELS.map((w) => (
                  <div key={w} className="text-center py-1">{w}</div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {days.map((d) => {
                  const { price, delta, ruleLabel } = priceForDay(d);
                  const isToday = isSameDay(d, new Date());
                  const isUp = delta > 0;
                  const isDown = delta < 0;
                  return (
                    <Tooltip key={d.toISOString()}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "aspect-square rounded-md border p-1.5 flex flex-col justify-between cursor-default transition-colors",
                            "hover:border-primary/50",
                            isToday && "ring-2 ring-primary ring-offset-1",
                            isUp && "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900",
                            isDown && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
                            !isUp && !isDown && "bg-card",
                          )}
                        >
                          <div className="text-[11px] font-medium leading-none">
                            {format(d, "d")}
                          </div>
                          <div className="text-right">
                            <div
                              className={cn(
                                "text-[11px] sm:text-xs font-semibold leading-tight tabular-nums",
                                isUp && "text-rose-700 dark:text-rose-400",
                                isDown && "text-emerald-700 dark:text-emerald-400",
                              )}
                            >
                              {Math.round(price)}
                            </div>
                            {delta !== 0 && (
                              <div className="text-[9px] text-muted-foreground tabular-nums leading-none mt-0.5">
                                {delta > 0 ? "+" : ""}{Math.round(delta)}
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-xs space-y-0.5">
                          <div className="font-medium">{format(d, "EEEE d. M. yyyy", { locale: cs })}</div>
                          <div>Cena: <strong>{Math.round(price)} {baseCurrency}</strong></div>
                          {delta !== 0 && (
                            <div className="text-muted-foreground">
                              Základ {basePrice} {baseCurrency} · {delta > 0 ? "+" : ""}{Math.round(delta)}
                            </div>
                          )}
                          {ruleLabel && <div className="text-muted-foreground">Pravidlo: {ruleLabel}</div>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                <LegendDot className="bg-card border" label="Základní cena" />
                <LegendDot className="bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900" label="Příplatek" />
                <LegendDot className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900" label="Sleva" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

const Stat = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="rounded-md border bg-muted/30 px-3 py-2">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="font-semibold flex items-center gap-1 mt-0.5">{icon}{value}</div>
  </div>
);

const LegendDot = ({ className, label }: { className: string; label: string }) => (
  <span className="flex items-center gap-1.5">
    <span className={cn("h-3 w-3 rounded border", className)} />
    {label}
  </span>
);
