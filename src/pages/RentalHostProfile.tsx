import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Star, MapPin, Users, BedDouble, Bath, MessageCircle, Calendar, Globe } from "lucide-react";
import { SuperhostBadge } from "@/components/rentals/SuperhostBadge";
import { format } from "date-fns";

interface HostProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_superhost: boolean;
  created_at: string;
  website: string | null;
}

interface HostStats {
  properties_count: number;
  reservations_completed: number;
  avg_rating: number | null;
  reviews_count: number;
  response_rate_pct: number | null;
}

interface Listing {
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
  base_currency: string;
  average_rating: number | null;
  reviews_count: number;
  cover?: string | null;
}

interface ReviewItem {
  id: string;
  overall_rating: number;
  public_comment: string | null;
  created_at: string;
  property_title?: string;
  property_slug?: string;
}

const RentalHostProfile = () => {
  const { hostId } = useParams<{ hostId: string }>();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [stats, setStats] = useState<HostStats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!hostId) return;
      setLoading(true);

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, is_superhost, created_at, website")
        .eq("id", hostId)
        .maybeSingle();

      if (!prof) { setNotFound(true); setLoading(false); return; }
      setProfile(prof as HostProfile);

      const { data: statRow } = await supabase
        .from("rental_host_stats")
        .select("properties_count, reservations_completed, avg_rating, reviews_count, response_rate_pct")
        .eq("host_id", hostId)
        .maybeSingle();
      setStats((statRow as HostStats) || {
        properties_count: 0, reservations_completed: 0, avg_rating: null, reviews_count: 0, response_rate_pct: null,
      });

      const { data: props } = await supabase
        .from("rental_properties")
        .select("id, title, slug, city, country, property_type, max_guests, bedrooms, bathrooms, price_per_night, base_currency, average_rating, reviews_count")
        .eq("owner_id", hostId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      const propList = (props || []) as Listing[];

      // Fetch covers in one go
      if (propList.length > 0) {
        const ids = propList.map((p) => p.id);
        const { data: media } = await supabase
          .from("rental_media")
          .select("property_id, file_url, sort_order, is_cover")
          .in("property_id", ids);
        const mediaList = (media || []) as Array<{ property_id: string; file_url: string; sort_order: number | null; is_cover: boolean | null }>;
        const coverMap = new Map<string, string>();
        mediaList.forEach((m) => {
          if (m.is_cover && !coverMap.has(m.property_id)) coverMap.set(m.property_id, m.file_url);
        });
        mediaList
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .forEach((m) => { if (!coverMap.has(m.property_id)) coverMap.set(m.property_id, m.file_url); });
        propList.forEach((p) => { p.cover = coverMap.get(p.id) || null; });
      }
      setListings(propList);

      // Recent reviews across host
      const { data: revs } = await supabase
        .from("rental_reviews")
        .select("id, overall_rating, public_comment, created_at, property_id")
        .eq("host_id", hostId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(8);

      const reviewItems: ReviewItem[] = (revs || []).map((r: any) => {
        const p = propList.find((x) => x.id === r.property_id);
        return {
          id: r.id,
          overall_rating: r.overall_rating,
          public_comment: r.public_comment,
          created_at: r.created_at,
          property_title: p?.title,
          property_slug: p?.slug,
        };
      });
      setReviews(reviewItems);

      setLoading(false);
    };
    load();
  }, [hostId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-serif">Host not found</h1>
          <p className="text-muted-foreground mt-2">This profile doesn't exist or isn't public.</p>
          <Link to="/rentals" className="text-primary underline mt-4 inline-block">Back to rentals</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const initials = (profile.full_name || "H")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const memberSince = format(new Date(profile.created_at), "LLLL yyyy");

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${profile.full_name || "Host"} – rentals${profile.is_superhost ? " (Superhost)" : ""}`}
        description={profile.bio?.slice(0, 155) || `Host profile of ${profile.full_name || ""} and their rentals.`}
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-24 md:pt-28 pb-10 max-w-6xl">
        {/* Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-primary/10">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || "Host"} />
                <AvatarFallback className="text-2xl font-serif">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-serif">{profile.full_name || "Host"}</h1>
                  {profile.is_superhost && <SuperhostBadge size="lg" />}
                </div>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Hosting since {memberSince}
                </p>
                {profile.bio && (
                  <p className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-line">{profile.bio}</p>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t">
              <Stat label="Rentals" value={String(stats?.properties_count ?? 0)} />
              <Stat
                label="Rating"
                value={stats?.avg_rating ? Number(stats.avg_rating).toFixed(2) : "—"}
                icon={<Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              />
              <Stat label="Reviews" value={String(stats?.reviews_count ?? 0)} />
              <Stat
                label="Response rate"
                value={stats?.response_rate_pct != null ? `${Math.round(Number(stats.response_rate_pct))}%` : "—"}
                icon={<MessageCircle className="h-4 w-4 text-primary" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Listings */}
        <section className="mt-10">
          <h2 className="text-2xl font-serif mb-4">Host's rentals ({listings.length})</h2>
          {listings.length === 0 ? (
            <p className="text-muted-foreground">This host has no active listings yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((l) => (
                <Link key={l.id} to={`/rentals/${l.slug}`} className="group">
                  <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {l.cover ? (
                        <img
                          src={l.cover}
                          alt={l.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          No image
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold line-clamp-1">{l.title}</h3>
                        {l.average_rating ? (
                          <span className="flex items-center gap-1 text-sm shrink-0">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {Number(l.average_rating).toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                      {l.city && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {l.city}, {l.country}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{l.max_guests}</span>
                        <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{l.bedrooms}</span>
                        <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{l.bathrooms}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">{l.property_type}</Badge>
                      </div>
                      {l.price_per_night != null && (
                        <p className="mt-3 text-sm">
                          <span className="font-semibold text-base">{Number(l.price_per_night).toLocaleString()} {l.base_currency}</span>
                          <span className="text-muted-foreground"> / night</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-serif mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              Recent reviews
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${n <= r.overall_rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "MM/dd/yyyy")}
                      </span>
                    </div>
                    {r.public_comment && (
                      <p className="text-sm mt-3 leading-relaxed text-muted-foreground">{r.public_comment}</p>
                    )}
                    {r.property_slug && (
                      <>
                        <Separator className="my-3" />
                        <Link to={`/rentals/${r.property_slug}`} className="text-xs text-primary hover:underline">
                          {r.property_title}
                        </Link>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

const Stat = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-1.5 text-2xl font-serif">
      {icon}
      {value}
    </div>
    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
  </div>
);

export default RentalHostProfile;
