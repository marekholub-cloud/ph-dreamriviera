import { useEffect, useState, MouseEvent } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RentalFavoriteButtonProps {
  propertyId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};
const iconSizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function RentalFavoriteButton({ propertyId, className, size = "md" }: RentalFavoriteButtonProps) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("rental_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("property_id", propertyId)
        .maybeSingle();
      if (!cancelled) setIsFav(!!data);
    })();
    return () => { cancelled = true; };
  }, [user, propertyId]);

  const toggle = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to save favorites");
      return;
    }
    setLoading(true);
    try {
      if (isFav) {
        const { error } = await supabase
          .from("rental_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);
        if (error) throw error;
        setIsFav(false);
        toast.success("Removed from favorites");
      } else {
        const { error } = await supabase
          .from("rental_favorites")
          .insert({ user_id: user.id, property_id: propertyId });
        if (error && (error as any).code !== "23505") throw error;
        setIsFav(true);
        toast.success("Added to favorites");
      }
    } catch (err) {
      console.error(err);
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "flex items-center justify-center rounded-full bg-background/90 backdrop-blur shadow-sm border border-border/50 transition-all hover:scale-110 hover:bg-background",
        sizeClasses[size],
        className,
      )}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className={cn(iconSizeClasses[size], "animate-spin text-muted-foreground")} />
      ) : (
        <Heart
          className={cn(
            iconSizeClasses[size],
            "transition-colors",
            isFav ? "fill-primary text-primary" : "text-muted-foreground",
          )}
        />
      )}
    </button>
  );
}
