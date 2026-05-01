import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, MapPin, BedDouble, Bath, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FavItem {
  id: string;
  property_id: string;
  created_at: string;
  property: {
    id: string;
    title: string;
    slug: string;
    city: string | null;
    country: string;
    property_type: string;
    max_guests: number;
    bedrooms: number;
    bathrooms: number;
    price_per_night: number | null;
    price_per_month: number | null;
    base_currency: string;
    status: string;
  } | null;
  cover?: string | null;
}

export function MyWishlistSection() {
  const { user } = useAuth();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("rental_favorites")
      .select(`
        id, property_id, created_at,
        property:rental_properties(
          id, title, slug, city, country, property_type,
          max_guests, bedrooms, bathrooms,
          price_per_night, price_per_month, base_currency, status
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Nepodařilo se načíst oblíbené");
      setLoading(false);
      return;
    }

    const list = (data || []) as any as FavItem[];
    const ids = list.map(i => i.property_id);
    if (ids.length) {
      const { data: media } = await supabase
        .from("rental_media")
        .select("property_id,url,is_cover,sort_order")
        .in("property_id", ids);
      const coverMap = new Map<string, string>();
      (media || []).forEach((m: any) => {
        if (!coverMap.has(m.property_id) || m.is_cover) coverMap.set(m.property_id, m.url);
      });
      list.forEach(i => { i.cover = coverMap.get(i.property_id) || null; });
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (favId: string) => {
    const { error } = await supabase.from("rental_favorites").delete().eq("id", favId);
    if (error) { toast.error("Nepodařilo se odebrat"); return; }
    setItems(prev => prev.filter(i => i.id !== favId));
    toast.success("Odebráno z oblíbených");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Oblíbené pronájmy
          <Badge variant="secondary" className="ml-2">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Zatím nemáte žádné oblíbené pronájmy.</p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/rentals">Procházet pronájmy</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => {
              const p = it.property;
              if (!p) return (
                <Card key={it.id} className="p-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nemovitost již není dostupná</span>
                  <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
                </Card>
              );
              return (
                <Card key={it.id} className="overflow-hidden group">
                  <Link to={`/rentals/${p.slug}`}>
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      {it.cover ? (
                        <img src={it.cover} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Bez fotky</div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <MapPin className="h-3 w-3" />
                      {[p.city, p.country].filter(Boolean).join(", ")}
                      <Badge variant="secondary" className="ml-auto text-[10px] capitalize">{p.property_type}</Badge>
                    </div>
                    <Link to={`/rentals/${p.slug}`}>
                      <h3 className="font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors">{p.title}</h3>
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.max_guests}</span>
                      <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{p.bedrooms}</span>
                      <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{p.bathrooms}</span>
                    </div>
                    <div className="pt-2 border-t flex items-baseline justify-between">
                      {p.price_per_night ? (
                        <div>
                          <span className="text-lg font-bold">{p.price_per_night.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground"> {p.base_currency}/noc</span>
                        </div>
                      ) : p.price_per_month ? (
                        <div>
                          <span className="text-lg font-bold">{p.price_per_month.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground"> {p.base_currency}/měsíc</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Cena na vyžádání</span>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)} title="Odebrat">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
