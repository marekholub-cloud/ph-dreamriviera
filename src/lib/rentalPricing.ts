// Utilita pro výpočet ceny rezervace s aplikací cenových pravidel
// Pravidla: seasonal (datum), weekend (dny v týdnu), length_of_stay (počet nocí)

export type PricingRule = {
  id: string;
  rule_type: "seasonal" | "weekend" | "length_of_stay";
  adjustment_type: "percentage" | "fixed_amount" | "override_price";
  adjustment_value: number;
  start_date: string | null;
  end_date: string | null;
  weekdays: number[] | null;
  min_nights: number | null;
  max_nights: number | null;
  priority: number;
  is_active: boolean;
};

const dateInRange = (d: Date, start: string | null, end: string | null) => {
  if (!start || !end) return false;
  const t = d.getTime();
  return t >= new Date(start).getTime() && t <= new Date(end).getTime();
};

// Vrací cenu pro 1 noc s aplikací nejvyšší-priority seasonal/weekend pravidla
const priceForNight = (
  basePrice: number,
  date: Date,
  rules: PricingRule[]
): number => {
  // Po=0 ... Ne=6 (JS má Ne=0, převedeme)
  const jsDow = date.getDay();
  const dow = jsDow === 0 ? 6 : jsDow - 1;

  const candidates = rules
    .filter((r) => r.is_active)
    .filter((r) => {
      if (r.rule_type === "seasonal") return dateInRange(date, r.start_date, r.end_date);
      if (r.rule_type === "weekend") return r.weekdays?.includes(dow);
      return false;
    })
    .sort((a, b) => b.priority - a.priority);

  let price = basePrice;
  // Aplikuj jen nejvyšší prioritu
  const top = candidates[0];
  if (top) {
    if (top.adjustment_type === "override_price") price = top.adjustment_value;
    else if (top.adjustment_type === "fixed_amount") price = basePrice + top.adjustment_value;
    else if (top.adjustment_type === "percentage") price = basePrice * (1 + top.adjustment_value / 100);
  }
  return Math.max(0, price);
};

export type PricingBreakdown = {
  nights: number;
  subtotal: number;
  lengthOfStayDiscount: number;
  total: number;
  appliedRules: { id: string; label: string }[];
};

export function calculateRentalPrice(
  basePrice: number,
  checkIn: Date,
  checkOut: Date,
  rules: PricingRule[]
): PricingBreakdown {
  const ms = checkOut.getTime() - checkIn.getTime();
  const nights = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));

  let subtotal = 0;
  const applied = new Set<string>();
  for (let i = 0; i < nights; i++) {
    const d = new Date(checkIn);
    d.setDate(d.getDate() + i);
    const before = subtotal;
    const p = priceForNight(basePrice, d, rules);
    subtotal += p;
    if (p !== basePrice) {
      // Najdi pravidlo
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const r = rules
        .filter((x) => x.is_active && (x.rule_type === "seasonal" || x.rule_type === "weekend"))
        .sort((a, b) => b.priority - a.priority)
        .find((x) =>
          x.rule_type === "seasonal"
            ? dateInRange(d, x.start_date, x.end_date)
            : x.weekdays?.includes(dow)
        );
      if (r) applied.add(r.id);
    }
  }

  // Aplikuj length_of_stay slevu (nejvyšší vyhovující priorita)
  const losRule = rules
    .filter((r) => r.is_active && r.rule_type === "length_of_stay")
    .filter((r) => (r.min_nights ?? 0) <= nights && (r.max_nights ?? 9999) >= nights)
    .sort((a, b) => b.priority - a.priority)[0];

  let lengthOfStayDiscount = 0;
  if (losRule) {
    if (losRule.adjustment_type === "percentage") {
      lengthOfStayDiscount = subtotal * (losRule.adjustment_value / 100) * -1;
      // pokud je hodnota záporná = sleva
    } else if (losRule.adjustment_type === "fixed_amount") {
      lengthOfStayDiscount = losRule.adjustment_value;
    }
    applied.add(losRule.id);
  }

  const total = Math.max(0, subtotal + lengthOfStayDiscount);

  return {
    nights,
    subtotal,
    lengthOfStayDiscount,
    total,
    appliedRules: Array.from(applied).map((id) => {
      const r = rules.find((x) => x.id === id)!;
      return { id, label: r.rule_type };
    }),
  };
}
