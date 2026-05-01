import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Loader2, Bed, Maximize, Calendar, ArrowLeft, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { FavoriteButton } from "@/components/FavoriteButton";
import heroVideo from "@/assets/dubai-hero.mp4";

// Lazy loading video component
const LazyVideo = ({ src, className }: { src: string; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.src = src;
          videoRef.current.load();
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
    />
  );
};

interface Property {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  price_from: number | null;
  price_formatted: string | null;
  bedrooms: string | null;
  area_sqm: string | null;
  hero_image_url: string | null;
  short_description: string | null;
  completion_date: string | null;
  developers: {
    name: string;
  } | null;
}

interface Area {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string | null;
  image_url: string | null;
  hero_image_url: string | null;
  hero_video_url: string | null;
}

const AreaDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  // Fetch area by name (slug is derived from name)
  const { data: area, isLoading: areaLoading } = useQuery({
    queryKey: ['area', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('name');

      if (error) throw error;

      // Find area by matching slug
      const found = data.find(a => 
        a.name.toLowerCase().replace(/\s+/g, '-') === slug
      );

      return found as Area | undefined;
    },
    enabled: !!slug
  });

  // Fetch properties for this area
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['area-properties', area?.id],
    queryFn: async () => {
      if (!area?.id) return [];

      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          slug,
          type,
          status,
          price_from,
          price_formatted,
          bedrooms,
          area_sqm,
          hero_image_url,
          short_description,
          completion_date,
          developers (
            name
          )
        `)
        .eq('area_id', area.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
    enabled: !!area?.id
  });

  const isLoading = areaLoading || propertiesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <MapPin className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">Oblast nenalezena</h1>
          <p className="text-muted-foreground mb-6">Požadovaná oblast nebyla nalezena.</p>
          <Link to="/oblasti">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět na oblasti
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`${area.name} | Oblasti | Dubaj Reality`}
        description={area.description || `Prozkoumejte nemovitosti v oblasti ${area.name}, ${area.city}.`}
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[calc(75vh+20px)] flex items-center justify-center overflow-hidden -mt-[72px] pt-[142px]">
        {area.hero_video_url ? (
          <LazyVideo
            src={area.hero_video_url}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : area.hero_image_url ? (
          <img
            src={area.hero_image_url}
            alt={area.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : area.image_url ? (
          <img
            src={area.image_url}
            alt={area.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <LazyVideo
            src={heroVideo}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Bottom gradient transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Back Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6"
            >
              <Link 
                to="/oblasti" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Zpět na oblasti
              </Link>
            </motion.div>

            {/* City Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 backdrop-blur-sm rounded-full text-primary text-sm font-medium">
                <MapPin className="w-4 h-4" />
                {area.city}, {area.country}
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-foreground mb-4"
            >
              {area.name}
            </motion.h1>

            {area.description && (
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6"
              >
                {area.description}
              </motion.p>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center justify-center"
            >
              <div className="px-4 py-2 bg-primary/10 rounded-full">
                <span className="text-sm text-primary font-medium">
                  {properties.length} {properties.length === 1 ? 'projekt' : 
                    properties.length < 5 ? 'projekty' : 'projektů'} v nabídce
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-serif font-bold text-foreground mb-2">
              Projekty v oblasti {area.name}
            </h2>
            <p className="text-muted-foreground">
              Prozkoumejte všechny dostupné projekty v této lokalitě
            </p>
          </motion.div>

          {properties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link to={`/nemovitost/${property.slug}`}>
                    <Card className="group overflow-hidden border-border/50 bg-card hover:border-primary/50 transition-all duration-300 h-full">
                      {/* Image */}
                      <div className="aspect-[4/3] relative overflow-hidden">
                        {property.hero_image_url ? (
                          <img 
                            src={property.hero_image_url} 
                            alt={property.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Building2 className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                            {property.status}
                          </span>
                        </div>

                        {/* Favorite Button */}
                        <div className="absolute top-4 right-4">
                          <FavoriteButton propertyId={property.id} />
                        </div>

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {/* Price */}
                        <div className="absolute bottom-4 left-4">
                          <p className="text-white text-lg font-semibold">
                            {property.price_formatted || 'Cena na vyžádání'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-lg font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
                          {property.name}
                        </h3>
                        
                        {property.developers && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                            <Building2 className="w-4 h-4" />
                            {property.developers.name}
                          </p>
                        )}
                        
                        {/* Property Details */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {property.bedrooms && (
                            <span className="flex items-center gap-1">
                              <Bed className="w-4 h-4" />
                              {property.bedrooms}
                            </span>
                          )}
                          {property.area_sqm && (
                            <span className="flex items-center gap-1">
                              <Maximize className="w-4 h-4" />
                              {property.area_sqm} m²
                            </span>
                          )}
                          {property.completion_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {property.completion_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Tato oblast zatím nemá žádné projekty v nabídce.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AreaDetail;
