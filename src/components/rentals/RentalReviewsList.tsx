import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Review {
  id: string;
  overall_rating: number;
  cleanliness_rating: number | null;
  communication_rating: number | null;
  checkin_rating: number | null;
  accuracy_rating: number | null;
  location_rating: number | null;
  value_rating: number | null;
  public_comment: string | null;
  created_at: string;
  guest_id: string;
}

interface Props {
  propertyId: string;
}

const Stars = ({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) => {
  const px = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(px, n <= value ? "fill-primary text-primary" : "text-muted-foreground/40")} />
      ))}
    </div>
  );
};

export const RentalReviewsList = ({ propertyId }: Props) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("rental_reviews")
        .select("id,overall_rating,cleanliness_rating,communication_rating,checkin_rating,accuracy_rating,location_rating,value_rating,public_comment,created_at,guest_id")
        .eq("property_id", propertyId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setReviews(data || []);
      setLoading(false);
    };
    load();
  }, [propertyId]);

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No reviews yet.</p>;
  }

  const avg = reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length;
  const avgBy = (key: keyof Review) => {
    const vals = reviews.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const categories: { key: keyof Review; label: string }[] = [
    { key: "cleanliness_rating", label: "Cleanliness" },
    { key: "communication_rating", label: "Communication" },
    { key: "checkin_rating", label: "Check-in" },
    { key: "accuracy_rating", label: "Accuracy" },
    { key: "location_rating", label: "Location" },
    { key: "value_rating", label: "Value" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-serif">{avg.toFixed(1)}</span>
          <div>
            <Stars value={Math.round(avg)} size="md" />
            <p className="text-xs text-muted-foreground mt-1">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm flex-1 min-w-[260px]">
          {categories.map((c) => {
            const v = avgBy(c.key);
            return (
              <div key={c.key} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-medium">{v ? v.toFixed(1) : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3">
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Stars value={r.overall_rating} />
                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MM/dd/yyyy")}</span>
              </div>
              {r.public_comment && <p className="text-sm leading-relaxed">{r.public_comment}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
