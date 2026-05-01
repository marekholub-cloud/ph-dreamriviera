import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Users, BedDouble, Bath, Home, Star, ArrowLeft, Check, DoorOpen } from "lucide-react";
import { RentalBookingDialog } from "@/components/rentals/RentalBookingDialog";
import { RentalReviewsList } from "@/components/rentals/RentalReviewsList";
import { PublicAvailabilityCalendar } from "@/components/rentals/PublicAvailabilityCalendar";
import { RentalSpecialOffers } from "@/components/rentals/RentalSpecialOffers";
import { localizeAmenity } from "@/lib/amenityLabels";
import { ContactHostButton } from "@/components/rentals/ContactHostButton";
import { RentalFavoriteButton } from "@/components/rentals/RentalFavoriteButton";
import { RentalGallery } from "@/components/rentals/RentalGallery";
import { PropertyMap } from "@/components/PropertyMap";
import { cn } from "@/lib/utils";

interface RentalProperty {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  property_type: string;
  rental_mode: string;
  city: string | null;
  district: string | null;
  country: string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  price_per_night: number | null;
  price_per_month: number | null;
  cleaning_fee: number;
  base_currency: string;
  instant_book_enabled: boolean;
  minimum_stay: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  max_guests: number;
  beds: number;
  has_private_bathroom: boolean;
  price_per_night: number | null;
}

const RentalDetail = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<{ name: string; icon: string | null }[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [presetCheckIn, setPresetCheckIn] = useState<string | undefined>();
  const [presetCheckOut, setPresetCheckOut] = useState<string | undefined>();
  // null = entire property; otherwise selected room
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!slug) return;
      setLoading(true);

      const { data: p } = await supabase
        .from("rental_properties")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (!p) { setLoading(false); return; }
      setProperty(p as RentalProperty);

      const [{ data: media }, { data: amen }, { data: rev }, { data: rms }] = await Promise.all([
        supabase.from("rental_media").select("file_url,sort_order,is_cover").eq("property_id", p.id).order("is_cover", { ascending: false }).order("sort_order"),
        supabase.from("rental_property_amenities").select("amenity:rental_amenities(name,icon)").eq("property_id", p.id),
        supabase.from("rental_reviews").select("overall_rating").eq("property_id", p.id).eq("is_published", true),
        supabase.from("rental_rooms").select("id,name,description,room_type,max_guests,beds,has_private_bathroom,price_per_night").eq("property_id", p.id).eq("status", "active").order("sort_order"),
      ]);

      setImages((media || []).map((m: any) => m.file_url));
      setAmenities(((amen || []) as any[]).map((a) => a.amenity).filter(Boolean));
      setReviews(rev || []);
      setRooms((rms || []) as Room[]);

      // For rooms_only, default to the first room
      if (p.rental_mode === "rooms_only" && rms && rms.length > 0) {
        setSelectedRoom(rms[0] as Room);
      } else {
        setSelectedRoom(null);
      }

      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!property) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-serif mb-4">{t("rentalDetail.notFound")}</h1>
          <Button asChild><Link to="/rentals">{t("rentalDetail.backToListings")}</Link></Button>
        </main>
        <Footer />
      </>
    );
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.overall_rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const isRoomsOnly = property.rental_mode === "rooms_only";
  const canShowEntireProperty = !isRoomsOnly;
  const showRoomsSection = (property.rental_mode === "hybrid" || isRoomsOnly) && rooms.length > 0;

  // Effective sidebar values based on selection
  const sidebarPrice = selectedRoom ? selectedRoom.price_per_night : property.price_per_night;
  const sidebarLabel = selectedRoom ? selectedRoom.name : t("rentalDetail.entireProperty", { defaultValue: "Entire property" });

  const openBookingFor = (room: Room | null) => {
    setSelectedRoom(room);
    setBookingOpen(true);
  };

  return (
    <>
      <SEO
        title={`${property.title} | Rental`}
        description={property.description?.slice(0, 160) || `Rental in ${property.city || property.country}`}
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-28 pb-20">
        <div className="container mx-auto px-6 lg:px-10 max-w-7xl">
          {/* Editorial back link */}
          <Link
            to="/rentals"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("rentalDetail.back")}
          </Link>

          {/* Header — editorial */}
          <header className="mb-10 flex items-start justify-between gap-6">
            <div className="flex-1">
              {/* Eyebrow with em-dash */}
              <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-4">
                <span className="h-px w-6 bg-foreground/40" />
                <span className="font-medium">{property.property_type}</span>
              </div>

              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight mb-5">
                {property.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] tracking-[0.12em] uppercase text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {[property.district, property.city, property.country].filter(Boolean).join(" · ")}
                </span>
                {avgRating && (
                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-foreground">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    <span className="font-medium">{avgRating}</span>
                    <span className="text-muted-foreground">({reviews.length})</span>
                  </span>
                )}
              </div>
            </div>
            <RentalFavoriteButton propertyId={property.id} size="lg" className="mt-1 shrink-0" />
          </header>

          {/* Subtle divider before gallery */}
          <div className="h-px bg-border mb-8" />

          {/* Gallery */}
          {images.length > 0 ? (
            <RentalGallery images={images} title={property.title} />
          ) : (
            <div className="aspect-[16/9] bg-muted rounded-sm flex items-center justify-center text-muted-foreground mb-12">
              {t("rentalDetail.noPhotos")}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 mt-4">
            {/* Main */}
            <div className="lg:col-span-2 space-y-12">
              {/* Quick stats — editorial inline row, no card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-border">
                <div>
                  <Users className="h-5 w-5 mb-2 text-foreground/70" />
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{t("rentalDetail.guests")}</div>
                  <div className="font-serif text-xl">{property.max_guests}</div>
                </div>
                <div>
                  <BedDouble className="h-5 w-5 mb-2 text-foreground/70" />
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{t("rentalDetail.bedrooms")}</div>
                  <div className="font-serif text-xl">{property.bedrooms}</div>
                </div>
                <div>
                  <Home className="h-5 w-5 mb-2 text-foreground/70" />
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{t("rentalDetail.beds")}</div>
                  <div className="font-serif text-xl">{property.beds}</div>
                </div>
                <div>
                  <Bath className="h-5 w-5 mb-2 text-foreground/70" />
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{t("rentalDetail.bathrooms")}</div>
                  <div className="font-serif text-xl">{property.bathrooms}</div>
                </div>
              </div>

              {property.description && (
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="h-px w-8 bg-foreground/40" />
                    <h2 className="text-[11px] tracking-[0.22em] uppercase font-medium">{t("rentalDetail.about")}</h2>
                  </div>
                  <p className="font-serif text-lg md:text-xl leading-relaxed text-foreground/85 whitespace-pre-line">
                    {property.description}
                  </p>
                </section>
              )}

              {amenities.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="h-px w-8 bg-foreground/40" />
                    <h2 className="text-[11px] tracking-[0.22em] uppercase font-medium">{t("rentalDetail.amenities")}</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                    {amenities.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm py-1 border-b border-border/50">
                        <Check className="h-4 w-4 text-accent shrink-0" /> {localizeAmenity(a.name, i18n.language)}
                      </div>
                    ))}
                  </div>
                </section>
              )}



              {/* Přepínač ložnic nad kalendářem (jen pokud existují) */}
              {rooms.length > 0 && (
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm font-medium">
                      {t("rentalDetail.viewAvailabilityFor", { defaultValue: "Zobrazit dostupnost pro:" })}
                    </div>
                    <Badge variant="outline" className="text-xs gap-1">
                      {selectedRoom ? (
                        <><BedDouble className="h-3 w-3" /> {selectedRoom.name}</>
                      ) : (
                        <><Home className="h-3 w-3" /> {t("rentalDetail.entireProperty", { defaultValue: "Celá nemovitost" })}</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canShowEntireProperty && (
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedRoom === null ? "default" : "outline"}
                        onClick={() => setSelectedRoom(null)}
                        className="gap-1.5"
                      >
                        <Home className="h-3.5 w-3.5" />
                        {t("rentalDetail.entireProperty", { defaultValue: "Celá nemovitost" })}
                      </Button>
                    )}
                    {rooms.map((r) => (
                      <Button
                        key={r.id}
                        type="button"
                        size="sm"
                        variant={selectedRoom?.id === r.id ? "default" : "outline"}
                        onClick={() => setSelectedRoom(r)}
                        className="gap-1.5"
                      >
                        <BedDouble className="h-3.5 w-3.5" />
                        {r.name}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("rentalDetail.calendarScopeHint", { defaultValue: "V kalendáři níže vidíte obsazenost pouze pro vybraný prostor. Ostatní ložnice mohou být v té samé chvíli stále volné." })}
                  </p>
                </div>
              )}

              <RentalSpecialOffers
                propertyId={property.id}
                roomId={selectedRoom?.id ?? null}
                baseCurrency={property.base_currency}
              />

              <PublicAvailabilityCalendar
                propertyId={property.id}
                roomId={selectedRoom?.id ?? null}
                basePrice={selectedRoom?.price_per_night ?? property.price_per_night}
                baseCurrency={property.base_currency}
                minimumStay={property.minimum_stay || 1}
                onRangeSelect={(ci, co) => {
                  setPresetCheckIn(ci);
                  setPresetCheckOut(co);
                  setBookingOpen(true);
                }}
              />

              <section>
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-px w-8 bg-foreground/40" />
                  <h2 className="text-[11px] tracking-[0.22em] uppercase font-medium">{t("rentalDetail.guestReviews")}</h2>
                </div>
                <RentalReviewsList propertyId={property.id} />
              </section>

              {property.latitude != null && property.longitude != null && (
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="h-px w-8 bg-foreground/40" />
                    <h2 className="text-[11px] tracking-[0.22em] uppercase font-medium">
                      {t("rentalDetail.location", { defaultValue: "Location" })}
                    </h2>
                  </div>
                  <PropertyMap
                    latitude={Number(property.latitude)}
                    longitude={Number(property.longitude)}
                    propertyName={property.title}
                    address={
                      [property.address, property.district, property.city, property.country]
                        .filter(Boolean)
                        .join(", ") || undefined
                    }
                  />
                </section>
              )}

              <section className="pt-4">
                <Link
                  to={`/rentals/host/${property.owner_id}`}
                  className="inline-flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase text-foreground hover:text-accent transition-colors group"
                >
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  {t("rentalDetail.viewHost")}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </section>
            </div>

            {/* Booking sidebar — editorial */}
            <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
              <div className="border border-border bg-card p-7 space-y-5 rounded-sm shadow-[0_2px_24px_-12px_rgba(0,0,0,0.12)]">
                {/* Selection indicator (hybrid only) */}
                {property.rental_mode === "hybrid" && rooms.length > 0 && (
                  <div className="text-[11px] tracking-[0.16em] uppercase text-muted-foreground pb-2 border-b border-border">
                    {t("rentalDetail.bookingFor", { defaultValue: "Booking" })}{" "}
                    <span className="font-medium text-foreground normal-case tracking-normal">{sidebarLabel}</span>
                    {selectedRoom && (
                      <button
                        type="button"
                        onClick={() => setSelectedRoom(null)}
                        className="ml-2 text-accent hover:underline normal-case tracking-normal"
                      >
                        {t("rentalDetail.switchToEntire", { defaultValue: "Switch to entire property" })}
                      </button>
                    )}
                  </div>
                )}

                {sidebarPrice ? (
                  <div>
                    <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
                      {t("rentalDetail.perNight")}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-4xl font-medium">{sidebarPrice.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">{property.base_currency}</span>
                    </div>
                  </div>
                ) : !selectedRoom && property.price_per_month && canShowEntireProperty ? (
                  <div>
                    <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
                      {t("rentalDetail.perMonth")}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-4xl font-medium">{property.price_per_month.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">{property.base_currency}</span>
                    </div>
                  </div>
                ) : (
                  <div className="font-serif text-xl">{t("rentalDetail.priceOnRequest")}</div>
                )}

                {property.cleaning_fee > 0 && (
                  <div className="text-xs text-muted-foreground border-t border-border pt-3">
                    {t("rentalDetail.cleaning")} <span className="text-foreground font-medium">{property.cleaning_fee} {property.base_currency}</span>
                  </div>
                )}

                {property.instant_book_enabled && (
                  <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {t("rentalDetail.instantBook")}
                  </div>
                )}

                <Button
                  className="w-full rounded-sm h-12 text-[11px] tracking-[0.2em] uppercase font-medium"
                  size="lg"
                  onClick={() => setBookingOpen(true)}
                  disabled={!sidebarPrice}
                >
                  {property.instant_book_enabled
                    ? t("rentalDetail.bookNow")
                    : t("rentalDetail.sendInquiry")}
                </Button>

                <ContactHostButton
                  propertyId={property.id}
                  hostId={property.owner_id}
                  propertyTitle={property.title}
                />
                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  {t("rentalDetail.signInHint")}
                </p>
              </div>

              {/* Available rooms (hybrid + rooms_only) — pod hlavní rezervační kartou */}
              {showRoomsSection && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-serif text-lg font-semibold mb-1">
                      {t("rentalDetail.availableRooms", { defaultValue: "Available rooms" })}
                    </h3>
                    {isRoomsOnly && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {t("rentalDetail.roomsOnlyHint", {
                          defaultValue: "This property is rented out by individual rooms only.",
                        })}
                      </p>
                    )}
                    <div className="space-y-3">
                      {canShowEntireProperty && (
                        <button
                          type="button"
                          onClick={() => setSelectedRoom(null)}
                          className={cn(
                            "w-full text-left rounded-lg border p-3 transition hover:border-primary/60 hover:shadow-sm",
                            selectedRoom === null ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{t("rentalDetail.entireProperty", { defaultValue: "Entire property" })}</span>
                            </div>
                            {property.price_per_night != null && (
                              <span className="text-xs font-semibold whitespace-nowrap">
                                {property.price_per_night.toLocaleString()} {property.base_currency}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{property.max_guests}</span>
                            <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" />{property.beds}</span>
                            <span className="inline-flex items-center gap-1"><Bath className="h-3 w-3" />{property.bathrooms}</span>
                          </div>
                          <Button
                            size="sm"
                            variant={selectedRoom === null ? "default" : "outline"}
                            className="w-full mt-3"
                            onClick={(e) => { e.stopPropagation(); openBookingFor(null); }}
                            disabled={property.price_per_night == null}
                          >
                            {t("rentalDetail.bookEntireProperty", { defaultValue: "Rezervovat celou nemovitost" })}
                          </Button>
                        </button>
                      )}
                      {rooms.map((r) => {
                        const isSelected = selectedRoom?.id === r.id;
                        return (
                          <button
                            type="button"
                            key={r.id}
                            onClick={() => setSelectedRoom(r)}
                            className={cn(
                              "w-full text-left rounded-lg border p-3 transition hover:border-primary/60 hover:shadow-sm",
                              isSelected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <DoorOpen className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">{r.name}</span>
                              </div>
                              {r.price_per_night != null && (
                                <span className="text-xs font-semibold whitespace-nowrap">
                                  {r.price_per_night.toLocaleString()} {property.base_currency}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{r.max_guests}</span>
                              <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" />{r.beds}</span>
                              {r.has_private_bathroom && (
                                <span className="inline-flex items-center gap-1"><Bath className="h-3 w-3" />{t("rentalDetail.privateBath", { defaultValue: "Private bath" })}</span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              className="w-full mt-3"
                              onClick={(e) => { e.stopPropagation(); openBookingFor(r); }}
                              disabled={r.price_per_night == null}
                            >
                              {t("rentalDetail.bookThisRoom", { defaultValue: "Book this room" })}
                            </Button>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </main>
      <RentalBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        property={property}
        hostId={property.owner_id}
        initialCheckIn={presetCheckIn}
        initialCheckOut={presetCheckOut}
        room={selectedRoom}
      />
      <Footer />
    </>
  );
};

export default RentalDetail;
