import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, MapPin, Users, BedDouble, Bath, Search, SlidersHorizontal, X, Map as MapIcon, LayoutGrid, Star, CalendarIcon, ArrowRight, Sparkles, Compass, CalendarRange, BellRing } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { RentalsMap } from "@/components/rentals/RentalsMap";
import { SuperhostBadge } from "@/components/rentals/SuperhostBadge";
import { RentalFavoriteButton } from "@/components/rentals/RentalFavoriteButton";
import rentalsHero from "@/assets/rentals-hero-dubai.jpg";
import { localizeAmenity } from "@/lib/amenityLabels";

interface RentalListItem {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  country: string;
  property_type: string;
  rental_mode: string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  price_per_night: number | null;
  price_per_month: number | null;
  base_currency: string;
  is_featured: boolean;
  latitude: number | null;
  longitude: number | null;
  cover_image?: string | null;
  amenity_ids?: string[];
  avg_rating?: number | null;
  review_count?: number;
  owner_id?: string;
  is_superhost?: boolean;
}

interface Amenity { id: string; name: string }

const Rentals = () => {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<RentalListItem[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [guests, setGuests] = useState<number>(1);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set());
  const [superhostOnly, setSuperhostOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"recommended" | "price_asc" | "price_desc" | "rating_desc">("recommended");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: props }, { data: amen }] = await Promise.all([
        supabase
          .from("rental_properties")
          .select("id,title,slug,city,country,property_type,rental_mode,max_guests,bedrooms,bathrooms,price_per_night,price_per_month,base_currency,is_featured,latitude,longitude,owner_id")
          .eq("status", "active")
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("rental_amenities").select("id,name").order("name"),
      ]);

      const list = (props || []) as RentalListItem[];
      setAmenities((amen || []) as Amenity[]);

      if (list.length) {
        const ids = list.map((p) => p.id);
        const ownerIds = [...new Set(list.map((p) => p.owner_id).filter(Boolean) as string[])];
        const [{ data: media }, { data: pa }, { data: revs }, { data: hosts }] = await Promise.all([
          supabase
            .from("rental_media")
            .select("property_id,file_url,is_cover,sort_order")
            .in("property_id", ids)
            .order("is_cover", { ascending: false })
            .order("sort_order", { ascending: true }),
          supabase
            .from("rental_property_amenities")
            .select("property_id,amenity_id")
            .in("property_id", ids),
          supabase
            .from("rental_reviews")
            .select("property_id,overall_rating")
            .in("property_id", ids)
            .eq("is_published", true),
          ownerIds.length
            ? supabase.from("profiles").select("id,is_superhost").in("id", ownerIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const coverMap = new Map<string, string>();
        (media || []).forEach((m: any) => {
          if (!coverMap.has(m.property_id)) coverMap.set(m.property_id, m.file_url);
        });
        const amenMap = new Map<string, string[]>();
        (pa || []).forEach((r: any) => {
          const arr = amenMap.get(r.property_id) || [];
          arr.push(r.amenity_id);
          amenMap.set(r.property_id, arr);
        });
        const ratingMap = new Map<string, { sum: number; count: number }>();
        (revs || []).forEach((r: any) => {
          const cur = ratingMap.get(r.property_id) || { sum: 0, count: 0 };
          cur.sum += r.overall_rating;
          cur.count += 1;
          ratingMap.set(r.property_id, cur);
        });
        const hostMap = new Map<string, boolean>();
        (hosts || []).forEach((h: any) => hostMap.set(h.id, !!h.is_superhost));
        list.forEach((p) => {
          p.cover_image = coverMap.get(p.id) || null;
          p.amenity_ids = amenMap.get(p.id) || [];
          const r = ratingMap.get(p.id);
          p.avg_rating = r ? r.sum / r.count : null;
          p.review_count = r ? r.count : 0;
          p.is_superhost = p.owner_id ? hostMap.get(p.owner_id) || false : false;
        });
      }

      setItems(list);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Načti obsazené nemovitosti pro vybraný rozsah dat
  useEffect(() => {
    const checkAvailability = async () => {
      if (!checkIn || !checkOut || checkIn >= checkOut) {
        setUnavailableIds(new Set());
        return;
      }
      const availRes: any = await supabase
        .from("rental_availability")
        .select("property_id")
        .gte("date", checkIn)
        .lt("date", checkOut)
        .in("status", ["blocked", "booked"]);
      const resvRes: any = await (supabase as any)
        .from("rental_reservations")
        .select("property_id")
        .lt("check_in_date", checkOut)
        .gt("check_out_date", checkIn)
        .in("booking_status", ["confirmed", "pending", "checked_in"]);
      const blocked = new Set<string>();
      ((availRes.data as any[]) || []).forEach((r) => blocked.add(r.property_id));
      ((resvRes.data as any[]) || []).forEach((r) => blocked.add(r.property_id));
      setUnavailableIds(blocked);
    };
    checkAvailability();
  }, [checkIn, checkOut]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    items.forEach((p) => p.city && s.add(p.city));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const list = items.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !(p.city || "").toLowerCase().includes(q)) return false;
      }
      if (type !== "all" && p.property_type !== type) return false;
      if (city !== "all" && p.city !== city) return false;
      if (guests > 1 && p.max_guests < guests) return false;
      const price = p.price_per_night ?? 0;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if (selectedAmenities.length && !selectedAmenities.every((a) => p.amenity_ids?.includes(a))) return false;
      if (unavailableIds.has(p.id)) return false;
      if (superhostOnly && !p.is_superhost) return false;
      if (minRating > 0 && (p.avg_rating ?? 0) < minRating) return false;
      return true;
    });
    const sorted = [...list];
    if (sortBy === "price_asc") sorted.sort((a, b) => (a.price_per_night ?? Infinity) - (b.price_per_night ?? Infinity));
    else if (sortBy === "price_desc") sorted.sort((a, b) => (b.price_per_night ?? -1) - (a.price_per_night ?? -1));
    else if (sortBy === "rating_desc") sorted.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    return sorted;
  }, [items, search, type, city, guests, priceRange, selectedAmenities, unavailableIds, superhostOnly, minRating, sortBy]);

  const resetFilters = () => {
    setSearch(""); setType("all"); setCity("all"); setGuests(1);
    setPriceRange([0, 1000]); setCheckIn(""); setCheckOut(""); setSelectedAmenities([]);
    setSuperhostOnly(false); setMinRating(0); setSortBy("recommended");
  };

  const activeFilterCount = [
    type !== "all", city !== "all", guests > 1,
    priceRange[0] > 0 || priceRange[1] < 1000,
    checkIn && checkOut, selectedAmenities.length > 0,
    superhostOnly, minRating > 0,
  ].filter(Boolean).length;

  const FiltersContent = (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label>{t("rentals.checkInOut")}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !checkIn && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {checkIn && checkOut ? (
                <>{format(new Date(checkIn), "d. M. yyyy")} – {format(new Date(checkOut), "d. M. yyyy")}</>
              ) : checkIn ? (
                <>{format(new Date(checkIn), "d. M. yyyy")} – ...</>
              ) : (
                <span>{t("rentals.selectDates")}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={{
                from: checkIn ? new Date(checkIn) : undefined,
                to: checkOut ? new Date(checkOut) : undefined,
              } as DateRange}
              onSelect={(range: DateRange | undefined) => {
                const toIso = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : "");
                setCheckIn(toIso(range?.from));
                setCheckOut(toIso(range?.to));
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
            {(checkIn || checkOut) && (
              <div className="flex justify-end p-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => { setCheckIn(""); setCheckOut(""); }}>
                    {t("rentals.clear")}
                  </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-2">
        <Label>{t("rentals.guests")}: {guests}</Label>
        <Slider min={1} max={20} step={1} value={[guests]} onValueChange={(v) => setGuests(v[0])} />
      </div>

      <div className="grid gap-2">
        <Label>{t("rentals.pricePerNight")}: {priceRange[0]} – {priceRange[1]}</Label>
        <Slider min={0} max={1000} step={10} value={priceRange} onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])} />
      </div>

      <div className="grid gap-2">
        <Label>{t("rentals.location")}</Label>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("rentals.allLocations")}</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{t("rentals.propertyType")}</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("rentals.allTypes")}</SelectItem>
            <SelectItem value="apartment">{t("rentals.types.apartment")}</SelectItem>
            <SelectItem value="villa">{t("rentals.types.villa")}</SelectItem>
            <SelectItem value="studio">{t("rentals.types.studio")}</SelectItem>
            <SelectItem value="house">{t("rentals.types.house")}</SelectItem>
            <SelectItem value="townhouse">{t("rentals.types.townhouse")}</SelectItem>
            <SelectItem value="cabin">{t("rentals.types.cabin")}</SelectItem>
            <SelectItem value="other">{t("rentals.types.other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {amenities.length > 0 && (
        <div className="grid gap-2">
          <Label>{t("rentals.amenities")}</Label>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-auto pr-1">
            {amenities.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedAmenities.includes(a.id)}
                  onCheckedChange={(c) => {
                    setSelectedAmenities((prev) => c ? [...prev, a.id] : prev.filter((x) => x !== a.id));
                  }}
                />
                {localizeAmenity(a.name, i18n.language)}
              </label>
            ))}
          </div>
        </div>
      )}

        <div className="grid gap-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={superhostOnly} onCheckedChange={(c) => setSuperhostOnly(!!c)} />
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            {t("rentals.superhostsOnly")}
          </span>
        </label>
      </div>

      <div className="grid gap-2">
        <Label>{t("rentals.minRating")}: {minRating > 0 ? `${minRating.toFixed(1)}+` : t("rentals.all")}</Label>
        <Slider min={0} max={5} step={0.5} value={[minRating]} onValueChange={(v) => setMinRating(v[0])} />
      </div>

      <Button variant="outline" className="w-full" onClick={resetFilters}>
        <X className="h-4 w-4 mr-2" /> {t("rentals.clearFilters")}
      </Button>
    </div>
  );

  return (
    <>
      <SEO
        title={t("rentals.seoTitle")}
        description={t("rentals.seoDesc")}
      />
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Editorial header — bez hero obrázku, sjednoceno se vzorem */}
        <section className="pt-32 md:pt-36 pb-10 md:pb-14">
          <div className="container mx-auto px-8">
            <span className="editorial-eyebrow block mb-8 text-muted-foreground">
              — {t("rentals.heroEyebrow")}
            </span>
            <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-end">
              <div className="md:col-span-7">
                <h1 className="editorial-headline text-foreground text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-balance">
                  {t("rentals.pageTitle")}
                </h1>
              </div>
              <div className="md:col-span-5">
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light max-w-md md:ml-auto">
                  {t("rentals.pageSubtitle")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div id="rentals-results" className="container mx-auto px-8 pb-20 md:pb-28">

          {/* Search bar — full width, bez rámečku, podtržení */}
          <div className="mb-10 md:mb-14 border-b border-border">
            <div className="flex items-center gap-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder={t("rentals.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-12 text-base bg-transparent"
              />
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="lg:hidden gap-2 text-xs uppercase tracking-[0.18em]">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t("rentals.filters")} {activeFilterCount > 0 && <Badge className="ml-1">{activeFilterCount}</Badge>}
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto flex flex-col">
                  <SheetHeader><SheetTitle className="font-serif">{t("rentals.filters")}</SheetTitle></SheetHeader>
                  <div className="mt-6 flex-1">{FiltersContent}</div>
                  <div className="sticky bottom-0 bg-background pt-4 border-t mt-4">
                    <Button className="w-full" size="lg" onClick={() => setFiltersOpen(false)}>
                      <Search className="h-4 w-4 mr-2" />
                      {filtered.length > 0
                        ? t("rentals.showResults", { count: filtered.length })
                        : t("rentals.search")}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-12">
            <aside className="hidden lg:block">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground font-medium mb-6 pb-4 border-b border-border">
                {t("rentals.filters")}
              </div>
              {FiltersContent}
            </aside>

            <div>
              <div className="mb-6 flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-border">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground font-medium">
                  {loading ? t("rentals.loading") : `${filtered.length} ${filtered.length === 1 ? t("rentals.propertyOne") : t("rentals.propertyMany")}`}
                </div>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[200px] border-0 shadow-none text-xs uppercase tracking-[0.18em] focus:ring-0 h-auto py-1 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">{t("rentals.sort.recommended")}</SelectItem>
                    <SelectItem value="price_asc">{t("rentals.sort.priceAsc")}</SelectItem>
                    <SelectItem value="price_desc">{t("rentals.sort.priceDesc")}</SelectItem>
                    <SelectItem value="rating_desc">{t("rentals.sort.ratingDesc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p>{t("rentals.noMatch")}</p>
                  <Button variant="link" onClick={resetFilters}>{t("rentals.clearFilters")}</Button>
                </div>
              ) : (
                <Tabs defaultValue="grid" className="w-full">
                  <TabsList className="mb-8 bg-transparent p-0 h-auto border-b border-border w-full justify-start rounded-none gap-6">
                    <TabsTrigger
                      value="grid"
                      className="gap-2 text-xs uppercase tracking-[0.22em] font-medium px-0 pb-3 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground border-b-2 border-transparent"
                    >
                      <LayoutGrid className="h-4 w-4" /> {t("rentals.list")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="map"
                      className="gap-2 text-xs uppercase tracking-[0.22em] font-medium px-0 pb-3 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground border-b-2 border-transparent"
                    >
                      <MapIcon className="h-4 w-4" /> {t("rentals.map")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="grid">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filtered.map((p) => (
                        <Link key={p.id} to={`/rentals/${p.slug}`} className="group block">
                          <article className="h-full bg-transparent">
                            <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                              {p.cover_image ? (
                                <img
                                  src={p.cover_image}
                                  alt={p.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                                />
                              ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("rentals.noPhoto")}</div>
                              )}
                              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                                {p.is_superhost && <SuperhostBadge size="md" />}
                                {p.is_featured && (
                                <Badge className="bg-primary text-primary-foreground rounded-none text-[10px] tracking-[0.18em] uppercase font-medium">{t("rentals.featured")}</Badge>
                                )}
                              </div>
                              <div className="absolute top-3 right-3">
                                <RentalFavoriteButton propertyId={p.id} size="md" />
                              </div>
                            </div>
                            <div className="pt-5 space-y-3">
                              <div className="flex items-center text-xs text-muted-foreground gap-1">
                                <MapPin className="h-3 w-3" />
                                {[p.city, p.country].filter(Boolean).join(", ")}
                                {p.avg_rating && (
                                  <span className="ml-auto flex items-center gap-1 text-foreground">
                                    <Star className="h-3 w-3 fill-primary text-primary" />
                                    <span className="font-medium">{p.avg_rating.toFixed(1)}</span>
                                    <span className="text-muted-foreground">({p.review_count})</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="editorial-headline text-xl leading-tight line-clamp-2 text-foreground">{p.title}</h3>
                              {(p.rental_mode === "hybrid" || p.rental_mode === "rooms_only") && (
                                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5 rounded-none uppercase tracking-[0.16em]">
                                  {t("rentals.roomBookable")}
                                </Badge>
                              )}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.max_guests}</span>
                                <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{p.bedrooms}</span>
                                <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{p.bathrooms}</span>
                                <Badge variant="secondary" className="ml-auto text-[10px] capitalize rounded-none uppercase tracking-[0.16em]">{p.property_type}</Badge>
                              </div>
                              <div className="pt-3 border-t border-border flex items-baseline justify-between">
                                {p.price_per_night ? (
                                  <div>
                                    <span className="text-xl font-semibold tracking-tight">{p.price_per_night.toLocaleString()}</span>
                                    <span className="text-sm text-muted-foreground font-light"> {p.base_currency} {t("rentals.perNight")}</span>
                                  </div>
                                ) : p.price_per_month ? (
                                  <div>
                                    <span className="text-xl font-semibold tracking-tight">{p.price_per_month.toLocaleString()}</span>
                                    <span className="text-sm text-muted-foreground font-light"> {p.base_currency} {t("rentals.perMonth")}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">{t("rentals.priceOnRequest")}</span>
                                )}
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="map">
                    <RentalsMap items={filtered} />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>

        {/* Why book with us — tmavá premium sekce */}
        <section className="py-28 md:py-36 bg-foreground text-background">
          <div className="container mx-auto px-8">
            <div className="grid md:grid-cols-12 gap-8 mb-20 items-end">
              <div className="md:col-span-5">
                <span className="editorial-eyebrow block mb-6 text-background/60">{t("rentals.whyEyebrow")}</span>
              </div>
              <div className="md:col-span-7">
                <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-balance">
                  {t("rentals.whyTitle")}
                </h2>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {[
                { icon: Sparkles, title: t("rentals.why1Title"), desc: t("rentals.why1Desc") },
                { icon: Compass, title: t("rentals.why2Title"), desc: t("rentals.why2Desc") },
                { icon: CalendarRange, title: t("rentals.why3Title"), desc: t("rentals.why3Desc") },
                { icon: BellRing, title: t("rentals.why4Title"), desc: t("rentals.why4Desc") },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="space-y-4">
                    <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                    <h3 className="editorial-headline text-xl">{item.title}</h3>
                    <p className="text-sm text-background/70 leading-relaxed font-light">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-28 md:py-36 bg-background">
          <div className="container mx-auto px-8">
            <div className="max-w-3xl mx-auto text-center">
              <span className="editorial-eyebrow block mb-8">— 03 / Get in touch</span>
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance">
                {t("rentals.ctaTitle")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed font-light">
                {t("rentals.ctaSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full px-7 h-12 text-sm group"
                  asChild
                >
                  <Link to="/#contact" className="flex items-center gap-2">
                    {t("rentals.ctaContact")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-foreground/20 hover:bg-foreground hover:text-background rounded-full px-7 h-12 text-sm font-medium"
                  asChild
                >
                  <Link to="/invest">{t("rentals.ctaInvest")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Rentals;
