import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SuperhostBadge } from "@/components/rentals/SuperhostBadge";
import { Loader2, Star, MessageSquare, XCircle, CheckCircle2, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  host_id: string;
  is_superhost: boolean;
  superhost_evaluated_at: string | null;
  properties_count: number;
  reservations_total: number;
  reservations_completed: number;
  reservations_cancelled: number;
  cancellation_rate_pct: number;
  avg_rating: number;
  reviews_count: number;
  threads_total: number;
  threads_responded: number;
  response_rate_pct: number;
}

const Requirement = ({ label, value, target, suffix = "", ok, invert = false }: {
  label: string; value: number; target: number; suffix?: string; ok: boolean; invert?: boolean;
}) => {
  const pct = invert
    ? Math.max(0, Math.min(100, ((target * 2 - value) / (target * 2)) * 100))
    : Math.min(100, (value / target) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
          {label}
        </span>
        <span className={cn("font-medium tabular-nums", ok ? "text-primary" : "text-foreground")}>
          {value}{suffix} <span className="text-muted-foreground text-xs">/ {invert ? "≤" : "≥"} {target}{suffix}</span>
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
};

export const SuperhostStatusSection = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("rental_host_stats")
        .select("*")
        .eq("host_id", user.id)
        .maybeSingle();
      setStats(data);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p>Statistiky budou dostupné, jakmile přidáte alespoň jeden aktivní pronájem.</p>
        </CardContent>
      </Card>
    );
  }

  const meetsCompleted = stats.reservations_completed >= 10;
  const meetsRating = Number(stats.avg_rating) >= 4.7;
  const meetsCancel = Number(stats.cancellation_rate_pct) <= 1;
  const meetsResponse = Number(stats.response_rate_pct) >= 90;
  const allOk = meetsCompleted && meetsRating && meetsCancel && meetsResponse;
  const okCount = [meetsCompleted, meetsRating, meetsCancel, meetsResponse].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card className={cn("overflow-hidden", stats.is_superhost && "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent")}>
        <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className={cn(
            "flex-shrink-0 h-20 w-20 rounded-full flex items-center justify-center",
            stats.is_superhost ? "bg-primary/15" : "bg-muted"
          )}>
            <Award className={cn("h-10 w-10", stats.is_superhost ? "text-primary fill-primary/20" : "text-muted-foreground")} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">
                {stats.is_superhost ? "Jste Super-host" : "Stát se Super-hostem"}
              </h2>
              {stats.is_superhost && <SuperhostBadge size="md" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.is_superhost
                ? "Splňujete všechny standardy kvality. Váš profil získává odznak ve výpisech."
                : `Splňujete ${okCount} ze 4 kritérií. Pokračujte ve skvělé práci!`}
            </p>
            {stats.superhost_evaluated_at && (
              <p className="text-xs text-muted-foreground">
                Naposledy vyhodnoceno: {new Date(stats.superhost_evaluated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kritéria Super-host programu</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <Requirement label="Dokončené pobyty" value={stats.reservations_completed} target={10} ok={meetsCompleted} />
          <Requirement label="Průměrné hodnocení" value={Number(stats.avg_rating)} target={4.7} suffix="★" ok={meetsRating} />
          <Requirement label="Response rate" value={Number(stats.response_rate_pct)} target={90} suffix="%" ok={meetsResponse} />
          <Requirement label="Storno rate" value={Number(stats.cancellation_rate_pct)} target={1} suffix="%" ok={meetsCancel} invert />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground">Aktivní pronájmy</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.properties_count}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" />Recenze</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.reviews_count}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" />Konverzace</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.threads_responded}<span className="text-sm text-muted-foreground">/{stats.threads_total}</span></p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground">Celkem rezervací</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.reservations_total}</p></CardContent></Card>
      </div>
    </div>
  );
};
