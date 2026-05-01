import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GoogleMap, OverlayView } from "@react-google-maps/api";
import { GoogleMapsLoader } from "@/components/maps/GoogleMapsLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapItem {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  price_per_night: number | null;
  price_per_month: number | null;
  base_currency: string;
  cover_image?: string | null;
  is_featured: boolean;
  property_type: string;
}

interface Props {
  items: MapItem[];
  height?: string;
}

const containerStyle = { width: "100%", height: "100%" };

const defaultCenter = { lat: 9.7489, lng: -83.7534 }; // Dubai

export const RentalsMap = ({ items, height = "70vh" }: Props) => {
  const [active, setActive] = useState<MapItem | null>(null);

  const geo = useMemo(
    () => items.filter((i) => typeof i.latitude === "number" && typeof i.longitude === "number"),
    [items]
  );

  const center = useMemo(() => {
    if (!geo.length) return defaultCenter;
    const avgLat = geo.reduce((s, i) => s + (i.latitude as number), 0) / geo.length;
    const avgLng = geo.reduce((s, i) => s + (i.longitude as number), 0) / geo.length;
    return { lat: avgLat, lng: avgLng };
  }, [geo]);

  return (
    <div className="relative rounded-xl overflow-hidden border" style={{ height }}>
      <GoogleMapsLoader>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={15}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            ],
          }}
        >
          {geo.map((p) => (
            <OverlayView
              key={p.id}
              position={{ lat: p.latitude as number, lng: p.longitude as number }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <button
                onClick={() => setActive(p)}
                className={`px-3 py-1.5 rounded-full font-semibold text-xs shadow-lg border-2 transition-transform hover:scale-110 ${
                  active?.id === p.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-background hover:border-primary"
                }`}
                style={{ transform: "translate(-50%, -50%)" }}
                aria-label={p.title}
              >
                {p.price_per_night
                  ? `${p.price_per_night.toLocaleString()} ${p.base_currency}`
                  : p.price_per_month
                  ? `${p.price_per_month.toLocaleString()}/m`
                  : "—"}
              </button>
            </OverlayView>
          ))}
        </GoogleMap>
      </GoogleMapsLoader>

      {/* Empty state overlay */}
      {!geo.length && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="text-center text-muted-foreground text-sm max-w-sm p-4">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>None of the matching rentals have map coordinates yet.</p>
          </div>
        </div>
      )}

      {/* Active card */}
      {active && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-10">
          <Card className="shadow-xl">
            <CardContent className="p-0 relative">
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-7 w-7 z-10 rounded-full"
                onClick={() => setActive(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Link to={`/rentals/${active.slug}`} className="block group">
                {active.cover_image && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={active.cover_image}
                      alt={active.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <MapPin className="h-3 w-3" />
                    {[active.city, active.country].filter(Boolean).join(", ")}
                    {active.is_featured && <Badge className="ml-auto text-[10px]">Featured</Badge>}
                  </div>
                  <h3 className="font-serif font-semibold leading-tight line-clamp-2">{active.title}</h3>
                  <div className="flex items-baseline justify-between pt-1 border-t">
                    {active.price_per_night ? (
                      <div>
                        <span className="text-lg font-bold">{active.price_per_night.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground"> {active.base_currency} / night</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Price on request</span>
                    )}
                    <Badge variant="secondary" className="text-xs capitalize">{active.property_type}</Badge>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
