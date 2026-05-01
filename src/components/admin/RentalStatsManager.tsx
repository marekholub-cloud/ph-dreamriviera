import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Home, CalendarCheck, CalendarDays, MapPin, DollarSign, TrendingUp } from "lucide-react";

interface PropertyRow {
  id: string;
  city: string | null;
  country: string;
  status: string;
  base_currency: string;
}
interface ReservationRow {
  id: string;
  property_id: string;
  booking_status: string;
  total_amount: number | null;
  currency: string | null;
  check_in_date: string;
  check_out_date: string;
}

const ACTIVE_STATUSES = ["confirmed", "checked_in"];
const REVENUE_STATUSES = ["confirmed", "checked_in", "checked_out", "completed"];

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export const RentalStatsManager = () => {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: props }, { data: res }] = await Promise.all([
        supabase.from("rental_properties").select("id, city, country, status, base_currency"),
        supabase.from("rental_reservations").select("id, property_id, booking_status, total_amount, currency, check_in_date, check_out_date"),
      ]);
      setProperties((props || []) as PropertyRow[]);
      setReservations((res || []) as ReservationRow[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const totalProps = properties.length;
    const activeProps = properties.filter((p) => p.status === "active").length;

    const activeRes = reservations.filter((r) => ACTIVE_STATUSES.includes(r.booking_status)).length;
    const totalRes = reservations.length;

    const propMap = new Map(properties.map((p) => [p.id, p]));

    // City counts (interest by area – reservations per city)
    const cityCounts = new Map<string, number>();
    reservations.forEach((r) => {
      const p = propMap.get(r.property_id);
      const city = p?.city?.trim() || "Neznámá";
      cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
    });

    // Distinct locations across properties
    const locations = new Set<string>();
    properties.forEach((p) => { if (p.city?.trim()) locations.add(p.city.trim()); });

    // Revenue by currency (only realized/confirmed)
    const revenueByCurrency = new Map<string, number>();
    reservations.forEach((r) => {
      if (!REVENUE_STATUSES.includes(r.booking_status)) return;
      const c = r.currency || "USD";
      revenueByCurrency.set(c, (revenueByCurrency.get(c) || 0) + Number(r.total_amount || 0));
    });

    return {
      totalProps,
      activeProps,
      activeRes,
      totalRes,
      cityCounts: Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1]),
      locations: Array.from(locations).sort(),
      revenueByCurrency: Array.from(revenueByCurrency.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [properties, reservations]);

  if (loading) {
    return (
      <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
    );
  }

  const revenueDisplay = stats.revenueByCurrency.length === 0
    ? "0"
    : stats.revenueByCurrency.map(([c, v]) => `${v.toLocaleString()} ${c}`).join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" /> Statistiky pronájmů
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Souhrnný přehled napříč všemi nemovitostmi v systému</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Home className="h-5 w-5" />}
          label="Počet nemovitostí"
          value={stats.totalProps}
          sub={`${stats.activeProps} aktivních`}
        />
        <StatCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Aktivní rezervace"
          value={stats.activeRes}
          sub="potvrzené + probíhající pobyty"
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Celkový počet rezervací"
          value={stats.totalRes}
          sub="všechny statusy"
        />
        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          label="Lokality"
          value={stats.locations.length}
          sub={stats.locations.slice(0, 4).join(", ") || "—"}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Celkový obrat (pronájem)"
          value={revenueDisplay}
          sub="potvrzené + dokončené rezervace"
        />
      </div>

      {/* Interest by city */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Zájem dle oblastí
          </CardTitle>
          <CardDescription>Počet rezervací podle města / lokality</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.cityCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Zatím žádné rezervace.</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const max = Math.max(...stats.cityCounts.map(([, n]) => n));
                return stats.cityCounts.map(([city, count]) => (
                  <div key={city} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{city}</span>
                      <Badge variant="secondary">{count} {count === 1 ? "rezervace" : count < 5 ? "rezervace" : "rezervací"}</Badge>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locations list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Všechny lokality nemovitostí
          </CardTitle>
          <CardDescription>Seznam unikátních měst, kde má systém pronájem</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné lokality.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.locations.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
