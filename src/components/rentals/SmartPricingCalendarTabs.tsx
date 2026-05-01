import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, DoorOpen, Loader2 } from "lucide-react";
import { SmartPricingCalendar } from "./SmartPricingCalendar";

interface Props {
  propertyId: string;
  basePrice: number | null;
  baseCurrency: string;
  /** Rental mode of the property — controls which tabs are shown. */
  rentalMode: string;
}

type Room = {
  id: string;
  name: string;
  price_per_night: number | null;
};

/**
 * Card-style tabs (kartotéka) for the smart pricing calendar.
 * - "entire_property": shows only the property-wide calendar.
 * - "rooms_only" / "hybrid": shows a tab per room + (for hybrid) a property-wide tab.
 */
export const SmartPricingCalendarTabs = ({ propertyId, basePrice, baseCurrency, rentalMode }: Props) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (rentalMode === "entire_property") {
        setRooms([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("rental_rooms")
        .select("id, name, price_per_night")
        .eq("property_id", propertyId)
        .eq("status", "active")
        .order("sort_order");
      setRooms((data || []) as Room[]);
      setLoading(false);
    };
    load();
  }, [propertyId, rentalMode]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Entire-property only — no tabs needed
  if (rentalMode === "entire_property" || rooms.length === 0) {
    return (
      <SmartPricingCalendar
        propertyId={propertyId}
        basePrice={basePrice}
        baseCurrency={baseCurrency}
      />
    );
  }

  const showPropertyTab = rentalMode === "hybrid";
  const defaultTab = showPropertyTab ? "property" : `room-${rooms[0].id}`;

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
        {showPropertyTab && (
          <TabsTrigger value="property" className="data-[state=active]:bg-background gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Celá nemovitost
          </TabsTrigger>
        )}
        {rooms.map((r) => (
          <TabsTrigger
            key={r.id}
            value={`room-${r.id}`}
            className="data-[state=active]:bg-background gap-1.5"
          >
            <DoorOpen className="h-3.5 w-3.5" />
            {r.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {showPropertyTab && (
        <TabsContent value="property" className="mt-3">
          <SmartPricingCalendar
            propertyId={propertyId}
            basePrice={basePrice}
            baseCurrency={baseCurrency}
          />
        </TabsContent>
      )}

      {rooms.map((r) => (
        <TabsContent key={r.id} value={`room-${r.id}`} className="mt-3">
          <SmartPricingCalendar
            propertyId={propertyId}
            basePrice={r.price_per_night ?? basePrice}
            baseCurrency={baseCurrency}
            roomId={r.id}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
};
