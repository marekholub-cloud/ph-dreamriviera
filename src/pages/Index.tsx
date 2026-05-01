import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/ContactDialog";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bed,
  Bath,
  Users,
  MapPin,
  Loader2,
  Sparkles,
  Compass,
  CalendarRange,
  BellRing,
  Building2,
  Waves,
  Hotel,
  Anchor,
  TreePalm,
  Utensils,
  Car,
  TrendingUp,
} from "lucide-react";
import heroDubaiImg from "@/assets/hero-dubai.jpg";
import heroDubaiVideo from "@/assets/hero-dubai.mp4";

interface RentalProperty {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  country: string;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  price_per_night: number | null;
  base_currency: string;
  is_featured: boolean | null;
  cover_image?: string | null;
}

const Index = () => {
  const { t } = useTranslation();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["rentals-homepage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_properties")
        .select(
          "id,title,slug,city,country,property_type,bedrooms,bathrooms,max_guests,price_per_night,base_currency,is_featured"
        )
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      const list = (data || []) as RentalProperty[];

      const ids = list.map((p) => p.id);
      if (ids.length) {
        const { data: media } = await (supabase as any)
          .from("rental_media")
          .select("property_id,file_url,is_cover,sort_order")
          .in("property_id", ids)
          .eq("file_type", "image")
          .order("is_cover", { ascending: false })
          .order("sort_order", { ascending: true });
        const byId = new Map<string, string>();
        (media || []).forEach((m: any) => {
          if (m.property_id && !byId.has(m.property_id))
            byId.set(m.property_id, m.file_url);
        });
        list.forEach((p) => {
          p.cover_image = byId.get(p.id) || null;
        });
      }
      return list;
    },
  });

  const formatPricePerNight = (price: number | null, currency: string) => {
    if (!price) return "—";
    const symbol =
      currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " ";
    return `${symbol}${Number(price).toFixed(2)}`;
  };

  const whyUs = [
    { icon: Sparkles, title: t("home.whyCuratedTitle"), text: t("home.whyCuratedText") },
    { icon: Compass, title: t("home.whyLocationTitle"), text: t("home.whyLocationText") },
    { icon: CalendarRange, title: t("home.whyFlexibleTitle"), text: t("home.whyFlexibleText") },
    { icon: BellRing, title: t("home.whyServiceTitle"), text: t("home.whyServiceText") },
  ];

  const propertyTypes = [
    { icon: Building2, title: t("home.typeApartmentTitle"), text: t("home.typeApartmentText") },
    { icon: Waves, title: t("home.typeVillaTitle"), text: t("home.typeVillaText") },
    { icon: Hotel, title: t("home.typeServicedTitle"), text: t("home.typeServicedText") },
  ];

  const experienceItems = [
    { icon: Anchor, text: t("home.experienceItem1") },
    { icon: TreePalm, text: t("home.experienceItem2") },
    { icon: Utensils, text: t("home.experienceItem3") },
    { icon: Car, text: t("home.experienceItem4") },
  ];

  const districts = [
    t("home.locationDistrict1"),
    t("home.locationDistrict2"),
    t("home.locationDistrict3"),
    t("home.locationDistrict4"),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero — fullscreen video */}
      <section className="relative h-screen flex items-end -mt-[72px] pt-[72px] overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover bg-foreground"
        >
          <source src={heroDubaiVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/70" />

        <div className="container mx-auto px-8 relative z-10 pb-24">
          <div className="max-w-5xl">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="block text-xs uppercase tracking-[0.3em] text-white/80 mb-6 font-medium"
            >
              {t("home.heroEyebrow")}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="editorial-headline text-white text-4xl md:text-6xl lg:text-7xl mb-8 max-w-4xl text-balance"
            >
              {t("home.heroTitle")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="text-base md:text-lg text-white/85 mb-10 max-w-xl leading-relaxed font-light"
            >
              {t("home.heroSubtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 px-7 h-12 text-sm font-medium rounded-full group"
                asChild
              >
                <Link to="/rentals" className="flex items-center gap-2">
                  {t("home.explore")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white hover:text-foreground px-7 h-12 text-sm font-medium rounded-full"
                asChild
              >
                <Link to="/rentals">{t("home.bookStay")}</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Intro — 2-column editorial */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-5">
              <span className="editorial-eyebrow block mb-6">{t("home.introEyebrow")}</span>
              <h2 className="editorial-headline text-3xl md:text-4xl lg:text-5xl text-foreground text-balance">
                {t("home.introTitle")}
              </h2>
            </div>
            <div className="md:col-span-7 space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed font-light">
              <p>{t("home.introP1")}</p>
              <p>{t("home.introP2")}</p>
              <p>{t("home.introP3")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-28 md:py-36 bg-secondary/30">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-8 mb-20 items-end">
            <div className="md:col-span-2">
              <span className="editorial-eyebrow">— 02 / Properties</span>
            </div>
            <div className="md:col-span-7">
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance">
                {t("home.villasTitle")}
              </h2>
            </div>
            <div className="md:col-span-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("home.villasSubtitle")}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-foreground/60" />
              </div>
            ) : properties.length > 0 ? (
              properties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link to={`/rentals/${property.slug}`} className="block group">
                    <div className="relative aspect-[4/5] overflow-hidden bg-secondary mb-5">
                      <img
                        src={property.cover_image || "/placeholder.svg"}
                        alt={property.title}
                        className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                      />
                      <div className="absolute top-5 left-5 right-5 flex items-start justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-white/95 font-medium">
                          {property.property_type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-4 mb-2">
                      <h3 className="text-lg md:text-xl font-serif text-foreground truncate">
                        {property.title}
                      </h3>
                      <div className="text-right shrink-0">
                        <span className="text-base font-medium text-foreground">
                          {formatPricePerNight(property.price_per_night, property.base_currency)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{t("home.perNight")}</span>
                      </div>
                    </div>

                    <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {property.city || "Dubai"} · {property.country || "UAE"}
                    </p>

                    <div className="flex items-center gap-5 text-xs text-muted-foreground pt-4 border-t border-border">
                      <span className="flex items-center gap-1.5">
                        <Bed className="h-3.5 w-3.5" />
                        {property.bedrooms ?? 1} {t("home.bedrooms")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Bath className="h-3.5 w-3.5" />
                        {property.bathrooms ?? 1} {t("home.baths")}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {property.max_guests ?? 2} {t("home.guests")}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {t("home.noVillas")}
              </div>
            )}
          </div>

          <div className="flex justify-center mt-20">
            <Link
              to="/rentals"
              className="group inline-flex items-center gap-3 text-sm font-medium text-foreground border-b border-foreground pb-1 hover:gap-5 transition-all duration-300"
            >
              {t("home.viewAll")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Us — 4 icon blocks on dark */}
      <section className="py-28 md:py-36 bg-foreground text-background">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-8 mb-20 items-end">
            <div className="md:col-span-2">
              <span className="text-xs uppercase tracking-[0.2em] text-background/50 font-medium">
                — 03 / Why us
              </span>
            </div>
            <div className="md:col-span-7">
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-balance">
                {t("home.whyTitle")}
              </h2>
            </div>
            <div className="md:col-span-3">
              <p className="text-sm text-background/60 leading-relaxed">
                {t("home.whySubtitle")}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-background/10">
            {whyUs.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-foreground p-8 md:p-10"
                >
                  <Icon className="h-8 w-8 text-primary mb-6" strokeWidth={1.5} />
                  <h3 className="font-serif text-xl md:text-2xl mb-4 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-background/65 leading-relaxed font-light">
                    {item.text}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Property Types — cards */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mb-20">
            <span className="editorial-eyebrow block mb-6">{t("home.typesEyebrow")}</span>
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance">
              {t("home.typesTitle")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {propertyTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <motion.div
                  key={type.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="border border-border p-10 hover:border-foreground/40 transition-colors"
                >
                  <Icon className="h-10 w-10 text-foreground mb-8" strokeWidth={1.25} />
                  <h3 className="font-serif text-2xl md:text-3xl text-foreground mb-4 leading-tight">
                    {type.title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-light">
                    {type.text}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Experience — lifestyle */}
      <section className="py-28 md:py-36 bg-secondary/40">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-5">
              <span className="editorial-eyebrow block mb-6">{t("home.experienceEyebrow")}</span>
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance mb-8">
                {t("home.experienceTitle")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light">
                {t("home.experienceLead")}
              </p>
            </div>
            <div className="md:col-span-7">
              <ul className="divide-y divide-border">
                {experienceItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.6, delay: index * 0.08 }}
                      className="flex items-center gap-5 py-6"
                    >
                      <Icon className="h-6 w-6 text-primary shrink-0" strokeWidth={1.5} />
                      <span className="text-base md:text-lg text-foreground font-light">
                        {item.text}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
              <p className="mt-10 italic text-muted-foreground font-serif text-lg">
                {t("home.experienceOutro")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location / Districts */}
      <section className="py-28 md:py-36 bg-background">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mb-16">
            <span className="editorial-eyebrow block mb-6">{t("home.locationEyebrow")}</span>
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground text-balance mb-8">
              {t("home.locationTitle")}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-light">
              {t("home.locationText")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            {districts.map((district, index) => (
              <motion.div
                key={district}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: index * 0.06 }}
                className="bg-background p-8 flex items-center gap-3"
              >
                <MapPin className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                <span className="text-sm md:text-base font-medium text-foreground">
                  {district}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Investor angle — premium dark */}
      <section className="py-28 md:py-36 bg-foreground text-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-primary/20 pointer-events-none" />
        <div className="container mx-auto px-8 relative z-10">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7">
              <span className="text-xs uppercase tracking-[0.2em] text-primary mb-6 block font-medium">
                {t("home.investorEyebrow")}
              </span>
              <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-balance mb-8">
                {t("home.investorTitle")}
              </h2>
              <p className="text-base md:text-lg text-background/75 leading-relaxed font-light mb-5">
                {t("home.investorP1")}
              </p>
              <p className="text-base md:text-lg text-background/75 leading-relaxed font-light mb-10">
                {t("home.investorP2")}
              </p>
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 h-12 text-sm font-medium group"
                asChild
              >
                <Link to="/invest" className="flex items-center gap-2">
                  {t("home.investorCta")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            <div className="md:col-span-5 grid grid-cols-2 gap-4">
              {[
                { value: "10–12%", label: "Avg. ROI" },
                { value: "0%", label: "Property tax" },
                { value: "Top 3", label: "Global market" },
                { value: "24/7", label: "Local support" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="border border-background/15 p-6 backdrop-blur-sm"
                >
                  <TrendingUp className="h-4 w-4 text-primary mb-3" strokeWidth={1.5} />
                  <div className="font-serif text-3xl md:text-4xl mb-1">{stat.value}</div>
                  <div className="text-xs uppercase tracking-[0.15em] text-background/55">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 md:py-40 bg-background">
        <div className="container mx-auto px-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="editorial-eyebrow block mb-8">— 07 / Get in touch</span>
            <h2 className="editorial-headline text-4xl md:text-5xl lg:text-6xl text-foreground mb-8 text-balance">
              {t("home.ctaTitle")}
            </h2>
            <p className="text-base text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed font-light">
              {t("home.ctaText")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full px-7 h-12 text-sm"
                asChild
              >
                <Link to="/rentals">{t("home.browseVillas")}</Link>
              </Button>
              <ContactDialog>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-foreground/20 text-foreground hover:bg-foreground hover:text-background font-medium rounded-full px-7 h-12 text-sm bg-transparent"
                >
                  {t("home.contactUs")}
                </Button>
              </ContactDialog>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
