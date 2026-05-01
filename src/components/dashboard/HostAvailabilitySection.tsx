import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, Home } from "lucide-react";
import { RentalAvailabilityManager } from "@/components/rentals/RentalAvailabilityManager";

interface PropertyOption {
  id: string;
  title: string;
  city: string | null;
  status: string;
}

interface HostAvailabilitySectionProps {
  managerMode?: boolean;
}

export const HostAvailabilitySection = ({ managerMode = false }: HostAvailabilitySectionProps = {}) => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      let query = supabase
        .from("rental_properties")
        .select("id,title,city,status")
        .order("created_at", { ascending: false });
      if (!managerMode) {
        query = query.eq("owner_id", user.id);
      }
      const { data } = await query;
      const list = (data || []) as PropertyOption[];
      setProperties(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    };
    load();
  }, [user, managerMode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> Kalendář dostupnosti
        </CardTitle>
        <CardDescription>
          Spravujte dostupnost svých nemovitostí. Vyberte nemovitost a blokujte/uvolňujte termíny.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Zatím nemáte žádné nemovitosti. Nejdříve přidejte nemovitost v sekci „Moje pronájmy".</p>
          </div>
        ) : (
          <>
            <div className="max-w-md">
              <label className="text-sm font-medium mb-1.5 block">Nemovitost</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte nemovitost" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}{p.city ? ` — ${p.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedId && (
              <RentalAvailabilityManager key={selectedId} propertyId={selectedId} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
