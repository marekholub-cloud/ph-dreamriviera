import { useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SEO } from "@/components/SEO";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Maximize2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertiesGoogleMap, type PropertiesMapMarker, type PropertiesGoogleMapHandle } from "@/components/PropertiesGoogleMap";

interface PropertyOnMap {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  hero_image_url: string | null;
  price_formatted: string | null;
  bedrooms: string | null;
  area_sqm: string | null;
  type: string;
  areas: { name: string; city: string } | null;
  developers: { id: string; name: string; logo_url: string | null } | null;
}

interface Developer {
  id: string;
  name: string;
}

const ALL_VALUE = "__all__";
const LISTING_ALL = "__all__";
const LISTING_SALE = "sale";
const LISTING_RENTAL = "rental";

const PropertiesMap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSaleMode = location.pathname.startsWith("/map-for-sale");
  const mapRef = useRef<PropertiesGoogleMapHandle>(null);
  const [cityFilter, setCityFilter] = useState<string>(ALL_VALUE);
  const [developerFilter, setDeveloperFilter] = useState<string>(ALL_VALUE);
  const [typeFilter, setTypeFilter] = useState<string>(ALL_VALUE);
  const listingFilter = isSaleMode ? LISTING_SALE : LISTING_RENTAL;
  const [filtersOpen, setFiltersOpen] = useState(true);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          id,
          name,
          slug,
          latitude,
          longitude,
          hero_image_url,
          price_formatted,
          bedrooms,
          area_sqm,
          type,
          areas(name, city),
          developers(id, name, logo_url)
        `
        )
        .eq("is_published", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) throw error;
      return data as PropertyOnMap[];
    },
  });

  // Fetch rentals
  const { data: rentals } = useQuery({
    queryKey: ["rentals-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_properties")
        .select(
          "id, title, slug, latitude, longitude, city, country, property_type, price_per_night, base_currency"
        )
        .eq("status", "active")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (error) throw error;
      return data as Array<{
        id: string;
        title: string;
        slug: string;
        latitude: number | null;
        longitude: number | null;
        city: string | null;
        country: string | null;
        property_type: string | null;
        price_per_night: number | null;
        base_currency: string | null;
      }>;
    },
  });

  // Fetch developers list
  const { data: developers } = useQuery({
    queryKey: ["developers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Developer[];
    },
  });

  // Extract unique cities from properties + rentals
  const cities = useMemo(() => {
    const set = new Set<string>();
    (properties ?? []).forEach((p) => {
      if (p.areas?.city) set.add(p.areas.city);
    });
    (rentals ?? []).forEach((r) => {
      if (r.city) set.add(r.city);
    });
    return Array.from(set).sort();
  }, [properties, rentals]);

  // Extract unique property types from properties + rentals
  const propertyTypes = useMemo(() => {
    const set = new Set<string>();
    (properties ?? []).forEach((p) => {
      if (p.type) set.add(p.type);
    });
    (rentals ?? []).forEach((r) => {
      if (r.property_type) set.add(r.property_type);
    });
    return Array.from(set).sort();
  }, [properties, rentals]);

  // Filter properties
  const filteredProperties = useMemo(() => {
    let list = properties ?? [];
    if (cityFilter !== ALL_VALUE) {
      list = list.filter((p) => p.areas?.city === cityFilter);
    }
    if (developerFilter !== ALL_VALUE) {
      list = list.filter((p) => p.developers?.id === developerFilter);
    }
    if (typeFilter !== ALL_VALUE) {
      list = list.filter((p) => p.type === typeFilter);
    }
    return list;
  }, [properties, cityFilter, developerFilter, typeFilter]);

  const markers: PropertiesMapMarker[] = useMemo(() => {
    const saleList: PropertiesMapMarker[] =
      listingFilter === LISTING_RENTAL
        ? []
        : filteredProperties
            .filter((p) => p.latitude != null && p.longitude != null)
            .map((p) => ({
              id: `sale-${p.id}`,
              lat: Number(p.latitude),
              lng: Number(p.longitude),
              name: p.name,
              slug: `sale::${p.slug}`,
              propertyType: p.type,
              heroImageUrl: p.hero_image_url,
              areaLabel: p.areas ? `${p.areas.name}, ${p.areas.city}` : null,
              priceFormatted: p.price_formatted,
              bedrooms: p.bedrooms,
              areaSqm: p.area_sqm,
              developerLogoUrl: p.developers?.logo_url ?? null,
              developerName: p.developers?.name ?? null,
            }));

    const rentalList: PropertiesMapMarker[] =
      listingFilter === LISTING_SALE
        ? []
        : (rentals ?? [])
            .filter((r) => {
              if (cityFilter !== ALL_VALUE && r.city !== cityFilter) return false;
              if (typeFilter !== ALL_VALUE && r.property_type !== typeFilter) return false;
              // Developer filter doesn't apply to rentals
              if (developerFilter !== ALL_VALUE) return false;
              return r.latitude != null && r.longitude != null;
            })
            .map((r) => ({
              id: `rental-${r.id}`,
              lat: Number(r.latitude),
              lng: Number(r.longitude),
              name: r.title,
              slug: `rental::${r.slug}`,
              propertyType: r.property_type,
              heroImageUrl: null,
              areaLabel: [r.city, r.country].filter(Boolean).join(", ") || null,
              priceFormatted: r.price_per_night
                ? `${r.price_per_night.toLocaleString()} ${r.base_currency} / night`
                : null,
              bedrooms: null,
              areaSqm: null,
              developerLogoUrl: null,
              developerName: null,
            }));

    return [...saleList, ...rentalList];
  }, [filteredProperties, rentals, listingFilter, cityFilter, typeFilter, developerFilter]);

  const center: [number, number] = useMemo(() => {
    if (markers.length === 0) return [25.2048, 55.2708];
    const lat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
    const lng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
    return [lat, lng];
  }, [markers]);

  const zoom = markers.length > 1 ? 4 : 12;

  const resetFilters = () => {
    setCityFilter(ALL_VALUE);
    setDeveloperFilter(ALL_VALUE);
    setTypeFilter(ALL_VALUE);
  };

  const hasActiveFilters =
    cityFilter !== ALL_VALUE ||
    developerFilter !== ALL_VALUE ||
    typeFilter !== ALL_VALUE;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Property Map | go2dubai.online"
        description="Browse all our properties on an interactive map. Find your dream investment in Dubai or Dubai."
      />
      <Navbar />

      <main className="flex-1 relative pt-[72px]">
        {/* Filters overlay — editorial style */}
        <div className="absolute top-[88px] right-4 z-30 bg-background/95 backdrop-blur-md rounded-2xl border border-border shadow-xl w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-start justify-between gap-3 px-6 pt-6 pb-4 text-left"
            aria-expanded={filtersOpen}
          >
            <div className="flex-1">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                — Filter
              </span>
              <h2 className="editorial-headline text-xl text-foreground leading-tight">
                {isSaleMode ? (
                  <>Development <span className="italic text-accent">projects</span></>
                ) : (
                  <>Find your <span className="italic text-accent">rental</span></>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-2 font-light">
                {markers.length} {isSaleMode ? "projects" : "rentals"}
              </p>
            </div>
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground mt-1" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" />
            )}
          </button>

          {filtersOpen && (
          <div className="flex flex-col gap-3 px-6 pb-6">
            <Select value={cityFilter} onValueChange={(val) => setCityFilter(val)}>
              <SelectTrigger className="w-full bg-secondary border-0 rounded-full h-10 text-sm">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent className="z-[1001]">
                <SelectItem value={ALL_VALUE}>All cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isSaleMode && (
              <Select value={developerFilter} onValueChange={(val) => setDeveloperFilter(val)}>
                <SelectTrigger className="w-full bg-secondary border-0 rounded-full h-10 text-sm">
                  <SelectValue placeholder="Developer" />
                </SelectTrigger>
                <SelectContent className="z-[1001]">
                  <SelectItem value={ALL_VALUE}>All developers</SelectItem>
                  {(developers ?? []).map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val)}>
              <SelectTrigger className="w-full bg-secondary border-0 rounded-full h-10 text-sm">
                <SelectValue placeholder="Property type" />
              </SelectTrigger>
              <SelectContent className="z-[1001]">
                <SelectItem value={ALL_VALUE}>All types</SelectItem>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => mapRef.current?.fitBounds()}
                className="flex-1 bg-foreground text-background hover:bg-foreground/90 rounded-full h-10 text-xs font-medium"
                title="Show all"
              >
                <Maximize2 className="mr-2 h-3.5 w-3.5" />
                Show all
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="flex-1 rounded-full h-10 text-xs font-medium"
                >
                  Clear
                </Button>
              )}
            </div>
            <Link to={isSaleMode ? "/villas" : "/rentals"}>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full h-10 text-xs font-medium border-border hover:bg-secondary"
              >
                <Building2 className="mr-2 h-3.5 w-3.5" />
                View as list
              </Button>
            </Link>

            {/* Legend */}
            <div className="pt-4 border-t border-border mt-2">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                — Legend
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[hsl(217_91%_60%)]"></span>
                  <span className="text-muted-foreground font-light">Apartments</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[hsl(160_84%_39%)]"></span>
                  <span className="text-muted-foreground font-light">Villas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[hsl(258_90%_66%)]"></span>
                  <span className="text-muted-foreground font-light">Penthouses</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[hsl(38_92%_50%)]"></span>
                  <span className="text-muted-foreground font-light">Townhouses</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Full screen map */}
        <section className="absolute inset-0 top-[72px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : markers.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? "No properties match the selected filters."
                    : "No properties with coordinates."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <PropertiesGoogleMap
              ref={mapRef}
              center={center}
              zoom={zoom}
              markers={markers}
              onOpenProperty={(slug) => {
                const [kind, ...rest] = slug.split("::");
                const realSlug = rest.join("::");
                if (kind === "rental") navigate(`/rentals/${realSlug}`);
                else navigate(`/nemovitost/${realSlug}`);
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
};

export default PropertiesMap;

