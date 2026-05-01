import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CalendarRange, Clock, Percent, Tag } from "lucide-react";

type RuleType = "seasonal" | "weekend" | "length_of_stay";
type AdjustmentType = "percentage" | "fixed_amount" | "override_price";

interface PricingRule {
  id: string;
  name: string;
  rule_type: RuleType;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  start_date: string | null;
  end_date: string | null;
  weekdays: number[] | null;
  min_nights: number | null;
  max_nights: number | null;
  is_active: boolean;
  room_id: string | null;
}

interface Props {
  propertyId: string;
  roomId?: string | null;
  baseCurrency?: string;
}

const isOfferRule = (r: PricingRule) => {
  if (!r.is_active) return false;
  if (r.rule_type === "length_of_stay") {
    if (r.adjustment_type === "percentage") return r.adjustment_value < 0;
    if (r.adjustment_type === "fixed_amount") return r.adjustment_value < 0;
    return false;
  }
  if (r.rule_type === "seasonal") {
    if (r.adjustment_type === "percentage") return r.adjustment_value < 0;
    if (r.adjustment_type === "fixed_amount") return r.adjustment_value < 0;
    if (r.adjustment_type === "override_price") return true;
    return false;
  }
  return false;
};

const ruleIcon = (r: PricingRule) => {
  if (r.rule_type === "length_of_stay") return Clock;
  if (r.rule_type === "seasonal") return CalendarRange;
  return Percent;
};

export const RentalSpecialOffers = ({ propertyId, roomId }: Props) => {
  const { t, i18n } = useTranslation();
  const [offers, setOffers] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fmtDate = (d: string | null) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });
    } catch {
      return d;
    }
  };

  const ruleHeadline = (r: PricingRule): string => {
    if (r.rule_type === "length_of_stay") {
      if (r.adjustment_type === "percentage") return t("specialOffers.percentOff", { value: Math.abs(r.adjustment_value) });
      return t("specialOffers.discount", { value: Math.abs(r.adjustment_value) });
    }
    if (r.rule_type === "seasonal") {
      if (r.adjustment_type === "percentage") return t("specialOffers.percentOff", { value: Math.abs(r.adjustment_value) });
      if (r.adjustment_type === "fixed_amount") return t("specialOffers.discount", { value: Math.abs(r.adjustment_value) });
      return t("specialOffers.specialPrice", { value: r.adjustment_value });
    }
    return r.name;
  };

  const ruleSubline = (r: PricingRule): string => {
    if (r.rule_type === "length_of_stay") {
      const min = r.min_nights ?? 1;
      const max = r.max_nights;
      return max
        ? t("specialOffers.stayRangeNights", { min, max })
        : t("specialOffers.stayMinNights", { min });
    }
    if (r.rule_type === "seasonal") {
      return t("specialOffers.dateRange", { start: fmtDate(r.start_date), end: fmtDate(r.end_date) });
    }
    return "";
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("rental_pricing_rules")
        .select("*")
        .eq("property_id", propertyId)
        .eq("is_active", true);
      if (!error && data) {
        const filtered = (data as PricingRule[])
          .filter((r) => (roomId ? r.room_id === roomId || r.room_id === null : r.room_id === null))
          .filter(isOfferRule)
          .sort((a, b) => {
            const av = a.adjustment_type === "percentage" ? a.adjustment_value : a.adjustment_value / 100;
            const bv = b.adjustment_type === "percentage" ? b.adjustment_value : b.adjustment_value / 100;
            return av - bv;
          });
        setOffers(filtered);
      }
      setLoading(false);
    };
    load();
  }, [propertyId, roomId]);

  if (loading || offers.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-serif text-xl font-semibold leading-tight">{t("specialOffers.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("specialOffers.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {offers.map((r) => {
          const Icon = ruleIcon(r);
          return (
            <div
              key={r.id}
              className="relative overflow-hidden rounded-xl border border-primary/20 bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10" />
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-primary leading-tight">
                    {ruleHeadline(r)}
                  </div>
                  <div className="text-sm text-foreground/80 mt-0.5">
                    {ruleSubline(r)}
                  </div>
                  {r.name && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Tag className="h-3 w-3" /> {r.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RentalSpecialOffers;
