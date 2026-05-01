import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactDialog } from "@/components/ContactDialog";
import { PropertyBrochureDialog } from "@/components/PropertyBrochureDialog";
import { SEO } from "@/components/SEO";
import { PropertyMap } from "@/components/PropertyMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";
import {
  ArrowLeft,
  Bed,
  Square,
  Calendar,
  MapPin,
  Building2,
  Check,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize,
  FileDown,
  FileText,
  Waves,
  Dumbbell,
  Car,
  ShieldCheck,
  Trees,
  Baby,
  Utensils,
  Wifi,
  Thermometer,
  Sparkles,
  Store,
  GraduationCap,
  Stethoscope,
  Train,
  PlaneTakeoff,
  LucideIcon,
  CircleDot,
  PersonStanding,
  Clapperboard,
  Gamepad2,
  Dog,
  Shirt,
  UtensilsCrossed,
  Coffee,
  Palmtree,
  Anchor,
  Bike,
  Mountain,
  Sunset,
  Building,
  Landmark,
  Loader2,
  ImageIcon,
  Home,
  Play,
  Download,
  Footprints,
  Sofa,
  Users,
  BookOpen,
  Monitor,
  Tent,
  Droplets,
  ArrowUpRight,
  Navigation2,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FolderOpen, Heart } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";

// Database property type
interface DbProperty {
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
  hero_video_url: string | null;
  youtube_url: string | null;
  brochure_url: string | null;
  dropbox_folder_url: string | null;
  description: string | null;
  short_description: string | null;
  description_en: string | null;
  description_cs: string | null;
  description_es: string | null;
  short_description_en: string | null;
  short_description_cs: string | null;
  short_description_es: string | null;
  completion_date: string | null;
  is_featured: boolean | null;
  amenities: string[] | null;
  features: string[] | null;
  latitude: number | null;
  longitude: number | null;
  payment_plan: string | null;
  areas: {
    name: string;
    city: string;
    country: string;
  } | null;
  developers: {
    name: string;
    logo_url: string | null;
  } | null;
  property_images: {
    id: string;
    image_url: string;
    alt_text: string | null;
    sort_order: number | null;
  }[] | null;
}

interface UnitPrice {
  id: string;
  unit_type: string;
  price_from: number | null;
  price_formatted: string | null;
  area_sqm_from: string | null;
  area_sqm_to: string | null;
  sort_order: number | null;
}

// Amenity icon mapping - comprehensive list with Czech translations
const amenityIconMap: Record<string, LucideIcon> = {
  // Bazény / Pools
  'bazén': Waves,
  'pool': Waves,
  'swimming pool': Waves,
  'infinity pool': Waves,
  'infinity bazén': Waves,
  'rodinný bazén': Waves,
  'dětský bazén': Waves,
  'krytý bazén': Waves,
  'covered pool': Waves,
  'outdoor pool': Waves,
  'floating pool': Waves,
  'infinity skyline pool': Waves,
  'horizon edge lagoon': Waves,
  'lagoon': Waves,
  'crystal lagoon': Waves,
  'rekreační bazén': Waves,
  'bazénová terasa': Waves,
  
  // Fitness / Posilovny
  'posilovna': Dumbbell,
  'gym': Dumbbell,
  'fitness': Dumbbell,
  'fitness centrum': Dumbbell,
  'fitness centra': Dumbbell,
  'venkovní posilovna': Dumbbell,
  'outdoor gym': Dumbbell,
  'indoor/outdoor fitness': Dumbbell,
  'nejmodernější posilovna': Dumbbell,
  'hiit workout': Dumbbell,
  
  // Parkování / Parking
  'parkování': Car,
  'parking': Car,
  'podzemní parkování': Car,
  'underground parking': Car,
  'garáž': Car,
  'parkovací místa': Car,
  'parkoviště': Car,
  'ev nabíjecí': Car,
  
  // Bezpečnost / Security
  'bezpečnost': ShieldCheck,
  'security': ShieldCheck,
  '24/7 security': ShieldCheck,
  'ostraha': ShieldCheck,
  'ostraha 24/7': ShieldCheck,
  '24/7 ostraha': ShieldCheck,
  'bezpečnostní': ShieldCheck,
  'kamerový dohled': ShieldCheck,
  
  // Zahrady / Gardens
  'zahrada': Trees,
  'garden': Trees,
  'park': Trees,
  'tropical gardens': Trees,
  'zen zahrada': Trees,
  'zen garden': Trees,
  'botanické zahrady': Trees,
  'mist garden': Trees,
  'lawn': Trees,
  
  // Děti / Children
  'dětské hřiště': Baby,
  'playground': Baby,
  'kids area': Baby,
  'kids play area': Baby,
  'children play area': Baby,
  'dětský koutek': Baby,
  'kids corner': Baby,
  'dětský klub': Baby,
  'dětské parky': Baby,
  'dětská skluzavka': Baby,
  'kids playground': Baby,
  'play area': Baby,
  'splash grove': Baby,
  
  // Restaurace / Dining
  'restaurace': Utensils,
  'restaurant': Utensils,
  'café': Coffee,
  'kavárna': Coffee,
  'kavárny': Coffee,
  'dining': Utensils,
  'exclusive dining': Utensils,
  'coffee corner': Coffee,
  'cloudtop juice bar': Coffee,
  'shaded pool bar': Coffee,
  'signature bar': Coffee,
  
  // Technologie
  'wifi': Wifi,
  'internet': Wifi,
  'klimatizace': Thermometer,
  'air conditioning': Thermometer,
  'inteligentní domácí': Wifi,
  'chytrá domácnost': Wifi,
  
  // Spa & Wellness
  'spa': Sparkles,
  'spa zóna': Sparkles,
  'wellness': Sparkles,
  'sauna': Sparkles,
  'lázeňská zóna': Sparkles,
  'spa zone': Sparkles,
  'pára': Sparkles,
  'vířivka': Sparkles,
  'jacuzzi': Sparkles,
  'aromatherapy jacuzzi': Sparkles,
  'sky jacuzzi': Sparkles,
  'heated stone loungers': Sparkles,
  'ledov': Sparkles,
  
  // Obchody / Retail
  'obchody': Store,
  'shops': Store,
  'retail': Store,
  'maloobchod': Store,
  'butiky': Store,
  'elegantní butiky': Store,
  'retail outlets': Store,
  'obchodní jednotky': Store,
  'nákupní': Store,
  'retailové služby': Store,
  '700 m retail': Store,
  
  // Vzdělávání
  'škola': GraduationCap,
  'school': GraduationCap,
  'vzdělání': GraduationCap,
  
  // Zdravotnictví
  'nemocnice': Stethoscope,
  'hospital': Stethoscope,
  'healthcare': Stethoscope,
  'klinika': Stethoscope,
  
  // Doprava
  'metro': Train,
  'train': Train,
  'mrt': Train,
  'letiště': PlaneTakeoff,
  'airport': PlaneTakeoff,
  'lanovka': Train,
  
  // Tenis
  'tenis': CircleDot,
  'tennis': CircleDot,
  'tenisový kurt': CircleDot,
  'tennis court': CircleDot,
  'badmintonové a tenisové': CircleDot,
  
  // Golf
  'golf': CircleDot,
  'golfové hřiště': CircleDot,
  'golf course': CircleDot,
  'golf simulator': CircleDot,
  
  // Jóga & Meditace
  'jóga': PersonStanding,
  'yoga': PersonStanding,
  'yoga studio': PersonStanding,
  'jóga studio': PersonStanding,
  'jógové studio': PersonStanding,
  'outdoor yoga': PersonStanding,
  'meditační': PersonStanding,
  'meditační zóna': PersonStanding,
  
  // Zábava / Entertainment
  'kino': Clapperboard,
  'cinema': Clapperboard,
  'kinosál': Clapperboard,
  'movie theater': Clapperboard,
  'outdoor cinema': Clapperboard,
  'herní místnost': Gamepad2,
  'game room': Gamepad2,
  'gaming': Gamepad2,
  'herna': Gamepad2,
  'opera house': Clapperboard,
  'mini amfiteátr': Clapperboard,
  'plovoucí scéna': Clapperboard,
  
  // Domácí mazlíčci
  'pes': Dog,
  'pet friendly': Dog,
  'pet-friendly': Dog,
  'dog park': Dog,
  
  // Prádelna
  'prádelna': Shirt,
  'laundry': Shirt,
  
  // BBQ / Grilování
  'bbq': UtensilsCrossed,
  'grill': UtensilsCrossed,
  'barbecue': UtensilsCrossed,
  'grilovací zóna': UtensilsCrossed,
  'bbq area': UtensilsCrossed,
  'bbq zone': UtensilsCrossed,
  'bbq zóny': UtensilsCrossed,
  'bbq deck': UtensilsCrossed,
  'fire ring': UtensilsCrossed,
  
  // Pláž / Beach
  'pláž': Palmtree,
  'beach': Palmtree,
  'beachfront': Palmtree,
  'soukromá pláž': Palmtree,
  'private beach': Palmtree,
  'přístup na pláž': Palmtree,
  'beach access': Palmtree,
  'přímý přístup na pláž': Palmtree,
  
  // Marina / Přístav
  'přístav': Anchor,
  'marina': Anchor,
  'yacht club': Anchor,
  'jachtařský klub': Anchor,
  'vodní sporty': Anchor,
  'water sports': Anchor,
  'marina boardwalk': Anchor,
  
  // Cyklistika
  'cyklistika': Bike,
  'cycling': Bike,
  'bike': Bike,
  'cyklostezka': Bike,
  'jogging/cyklistické': Bike,
  'parkování pro kola': Bike,
  
  // Běh
  'běžecká dráha': Footprints,
  'běžecké trasy': Footprints,
  'běžecké tratě': Footprints,
  'jogging': Footprints,
  'pěší stezky': Footprints,
  
  // Hory / Výhledy
  'hory': Mountain,
  'mountain view': Mountain,
  'hiking': Mountain,
  'pohled na terasy': Mountain,
  
  // Terasa / Rooftop
  'terasa': Sunset,
  'rooftop': Sunset,
  'terrace': Sunset,
  'rekreační terasy': Sunset,
  'sluneční terasa': Sunset,
  'kabány': Sunset,
  'lehátka': Sunset,
  'opalování': Sunset,
  
  // Recepce / Lobby
  'concierge': Building,
  'recepce': Building,
  'lobby': Building,
  
  // Kulturní / Landmarks
  'mešita': Landmark,
  'mosque': Landmark,
  'chrám': Landmark,
  
  // Basketbal & Sporty
  'basketbal': CircleDot,
  'fotbal': CircleDot,
  'multipurpose court': CircleDot,
  'squash': CircleDot,
  'padel': CircleDot,
  'paddle': CircleDot,
  'padel kurt': CircleDot,
  
  // Společenské prostory
  'lounge': Sofa,
  'salonek': Sofa,
  'doutníkový salonek': Sofa,
  'designated cigar': Sofa,
  'společenská místnost': Users,
  'společenská zóna': Users,
  'klubovna': Users,
  'hammock library': BookOpen,
  'owners\' lounge': Sofa,
  'outdoor lounge': Sofa,
  'city view work area': Monitor,
  'coworking': Monitor,
  'private meeting': Users,
  'family sitting': Sofa,
  
  // Relaxace
  'odpočinková zóna': Heart,
  'odpočinkové zóny': Heart,
  'relaxační zóny': Heart,
  'relax zóny': Heart,
  'rekreační': Heart,
  'recreation area': Heart,
  
  // Altány / Pergoly
  'altán': Tent,
  'pergola': Tent,
  'lagoon cabanas': Tent,
  
  // Fontány
  'fontána': Droplets,
  
  // Mosty
  'sky-bridge': ArrowUpRight,
  
  // Kanály
  'kanál': Navigation2,
  'romantick': Heart,
  
  // Privátní bazén
  'privátní bazén': Waves,
  'soukromý bazén': Waves,
  
  // Komerční
  'komerční': Building2,
  'kancelářské': Building2,
  
  // Balkón
  'balkon': Sun,
};

const getAmenityIcon = (amenity: string): LucideIcon => {
  const lowerAmenity = amenity.toLowerCase();
  for (const [key, icon] of Object.entries(amenityIconMap)) {
    if (lowerAmenity.includes(key)) {
      return icon;
    }
  }
  return Check;
};

// Helper to convert Dropbox URL to direct download
const getDirectVideoUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  // Convert Dropbox sharing URL to direct download
  if (url.includes('dropbox.com')) {
    return url.replace('dl=0', 'raw=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }
  
  return url;
};

// Helper to convert YouTube URL to embed format
const getYouTubeEmbedUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  // Extract video ID from various YouTube URL formats
  let videoId: string | null = null;
  
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) videoId = shortMatch[1];
  
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) videoId = watchMatch[1];
  
  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) videoId = embedMatch[1];
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  return url;
};

const PropertyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isObchodnik, isAdmin } = useAuth();
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").split("-")[0] as "en" | "cs" | "es";
  const localizedDescription = (p: DbProperty | null | undefined) =>
    p
      ? (lang === "cs" ? p.description_cs : lang === "es" ? p.description_es : p.description_en) ||
        p.description ||
        ""
      : "";
  const localizedShortDescription = (p: DbProperty | null | undefined) =>
    p
      ? (lang === "cs" ? p.short_description_cs : lang === "es" ? p.short_description_es : p.short_description_en) ||
        p.short_description ||
        ""
      : "";
  const [selectedImage, setSelectedImage] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  
  const [galleryScrollPosition, setGalleryScrollPosition] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [brochureDialogOpen, setBrochureDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: ""
  });

  // Sales users (obchodnik or admin) can download directly
  const canDownloadDirectly = isObchodnik || isAdmin;

  // Fetch property from database
  const { data: property, isLoading, error } = useQuery({
    queryKey: ['property', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      console.log('Fetching property with slug:', slug);
      
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
          hero_video_url,
          youtube_url,
          brochure_url,
          dropbox_folder_url,
          description,
          short_description,
          description_en,
          description_cs,
          description_es,
          short_description_en,
          short_description_cs,
          short_description_es,
          completion_date,
          is_featured,
          amenities,
          features,
          latitude,
          longitude,
          payment_plan,
          areas (
            name,
            city,
            country
          ),
          developers (
            name,
            logo_url
          ),
          property_images (
            id,
            image_url,
            alt_text,
            sort_order
          )
        `)
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching property:', error);
        throw error;
      }
      
      console.log('Property data:', data);
      return data as DbProperty | null;
    },
    enabled: !!slug,
    staleTime: 0,
    refetchOnMount: true
  });

  // Fetch unit prices
  const { data: unitPrices = [] } = useQuery({
    queryKey: ['unit-prices', property?.id],
    queryFn: async () => {
      if (!property) return [];
      
      const { data, error } = await supabase
        .from('property_unit_prices')
        .select('*')
        .eq('property_id', property.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as UnitPrice[];
    },
    enabled: !!property
  });

  // Fetch related properties
  const { data: relatedProperties = [] } = useQuery({
    queryKey: ['related-properties', property?.id, property?.areas?.city],
    queryFn: async () => {
      if (!property) return [];
      
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          slug,
          status,
          price_formatted,
          hero_image_url,
          areas (
            name,
            city
          ),
          property_images (
            image_url,
            sort_order
          )
        `)
        .eq('is_published', true)
        .neq('id', property.id)
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!property
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 py-32 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading property...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Not found state
  if (!property || error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 py-32 text-center">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Property not found</h1>
          <p className="text-muted-foreground mb-8">The requested property does not exist.</p>
          <Button onClick={() => navigate("/nemovitosti")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to properties
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Sort images by sort_order
  const images = property.property_images
    ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(img => img.image_url) || [];

  // Add hero image if no property images
  if (images.length === 0 && property.hero_image_url) {
    images.push(property.hero_image_url);
  }

  // Parse amenities
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.functions.invoke('send-contact-message', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message || `I'm interested in ${property.name}`,
        }
      });

      if (error) throw error;

      toast.success("Thank you for your interest! We'll be in touch shortly.");
      setFormData({ name: "", phone: "", email: "", message: "" });
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error("Failed to send the message. Please try again later.");
    }
  };

  const seoTitle = `${property.name} | ${property.areas?.name || ''}, ${property.areas?.city || 'Dubai'} | Dubai Reality`;
  const displayShortDescription = localizedShortDescription(property);
  const displayDescription = localizedDescription(property);
  const seoDescription = displayShortDescription ||
    (displayDescription ? displayDescription.substring(0, 155).replace(/<[^>]*>/g, '') + '...' : `${property.name} - Exclusive investment property in ${property.areas?.city || 'Dubai'}. ${property.price_formatted || ''}`);
  const seoKeywords = `${property.name}, ${property.developers?.name || ''}, ${property.areas?.city || 'Dubai'}, investment properties, Dubai, real estate`;
  const seoUrl = `https://go2dubai.online/nemovitost/${property.slug}`;
  
  // Get the best OG image - prioritize generated OG image, then hero image, then first gallery image
  const getOgImage = (): string => {
    // Check for generated OG image in storage first
    const storageOgUrl = `https://bulknhjwswhnxhnosbnv.supabase.co/storage/v1/object/public/property-images/og-images/og-${property.slug}.png`;
    
    // Priority: hero_image_url > first property_image > default
    const imageUrl = property.hero_image_url || images[0];
    
    if (!imageUrl) {
      return 'https://go2dubai.online/og-image-new.png';
    }
    
    // If it's already an absolute URL, use it
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Otherwise, make it absolute
    return `https://go2dubai.online${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  };
  
  const seoImage = getOgImage();

  // Gallery scroll handlers
  const scrollGallery = (direction: 'left' | 'right') => {
    if (galleryRef.current) {
      const scrollAmount = 300;
      const newPosition = direction === 'left' 
        ? Math.max(0, galleryScrollPosition - scrollAmount)
        : galleryScrollPosition + scrollAmount;
      
      galleryRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setGalleryScrollPosition(newPosition);
    }
  };

  const openGalleryAt = (index: number) => {
    setSelectedImage(index);
    setShowGallery(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        image={seoImage}
        url={seoUrl}
        type="product"
      />
      <Navbar />

      {/* Editorial Gallery: 1 large + 4 thumbs */}
      <section className="bg-background pt-[72px]">
        <div className="container mx-auto px-4 md:px-6 pt-6">
          {images.length > 0 || property.hero_video_url ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3 relative">
              {/* Main large image / video */}
              <button
                type="button"
                onClick={() => images.length > 0 && openGalleryAt(0)}
                className="relative md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto md:h-[560px] overflow-hidden bg-muted group"
                aria-label="Open gallery"
              >
                {property.hero_video_url ? (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  >
                    <source src={getDirectVideoUrl(property.hero_video_url) || ''} type="video/mp4" />
                  </video>
                ) : images[0] ? (
                  <img
                    src={images[0]}
                    alt={property.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
                {property.status && (
                  <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground rounded-none text-[10px] tracking-[0.18em] uppercase font-medium px-3 py-1">
                    {property.status}
                  </Badge>
                )}
              </button>

              {/* 4 thumbs (2x2 on md+) */}
              {[1, 2, 3, 4].map((i) => {
                const img = images[i];
                const isLast = i === 4;
                const extra = images.length - 5;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => img && openGalleryAt(i)}
                    disabled={!img}
                    className="relative aspect-[4/3] md:aspect-auto md:h-[276px] overflow-hidden bg-muted group disabled:cursor-default"
                    aria-label={img ? `Open photo ${i + 1}` : 'No photo'}
                  >
                    {img ? (
                      <>
                        <img
                          src={img}
                          alt={`${property.name} - Photo ${i + 1}`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                        {isLast && extra > 0 && (
                          <div className="absolute inset-0 bg-foreground/60 text-background flex flex-col items-center justify-center gap-1">
                            <ImageIcon className="w-6 h-6" />
                            <span className="text-sm font-medium tracking-wide">+{extra} photos</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Show all photos button */}
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => openGalleryAt(0)}
                  className="absolute bottom-4 right-4 bg-background text-foreground border border-foreground px-4 py-2 text-[11px] tracking-[0.18em] uppercase font-medium hover:bg-foreground hover:text-background transition-colors flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Show all {images.length} photos
                </button>
              )}
            </div>
          ) : (
            <div className="aspect-[16/7] bg-muted flex items-center justify-center">
              <Building className="w-24 h-24 text-muted-foreground" />
            </div>
          )}
        </div>
      </section>

      {/* Title block under gallery */}
      <section className="bg-background pt-8 pb-6">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{property.areas?.name || 'Location'}, {property.areas?.city || 'Dubai'}</span>
                {property.developers?.name && (
                  <>
                    <span className="text-border">|</span>
                    <span>{property.developers.name}</span>
                  </>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-semibold text-foreground leading-tight">
                {property.name}
              </h1>
              {property.completion_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Completion: {property.completion_date}</span>
                </div>
              )}
            </div>
            <div className="flex items-end gap-4 md:flex-col md:items-end">
              <div className="text-right">
                <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1">Price from</div>
                <div className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
                  {property.price_formatted || `${(property.price_from || 0).toLocaleString()} USD`}
                </div>
              </div>
              <FavoriteButton propertyId={property.id} variant="button" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Breadcrumb */}
      <section className="py-4 bg-background border-t border-border">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Home className="w-3 h-3" />
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/nemovitosti" className="hover:text-foreground transition-colors">
              Projects
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground normal-case tracking-normal font-serif">{property.name}</span>
          </nav>
        </div>
      </section>

      {/* Gallery Modal */}
      {showGallery && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setShowGallery(false)}
            className="absolute top-4 right-4 text-white hover:text-primary transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>
          
          <button
            onClick={() => setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-primary transition-colors bg-black/50 p-3 rounded-full"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <motion.img
            key={selectedImage}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            src={images[selectedImage]}
            alt={property.name}
            className="max-h-[85vh] max-w-[90vw] object-contain"
          />
          
          <button
            onClick={() => setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-primary transition-colors bg-black/50 p-3 rounded-full"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Thumbnail strip */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === index ? 'border-primary scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Image counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      )}


      {/* Main Content */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Left Column - Property Info */}
            <div className="lg:col-span-2 space-y-10">

              {/* Details Section */}
              {displayDescription && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">About the project</div>
                  <h3 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-6">Description</h3>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    {displayDescription.split('\n\n').map((paragraph, index) => {
                      // Convert markdown bold to HTML and sanitize
                      const htmlContent = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>');
                      const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
                        ALLOWED_TAGS: ['strong', 'em', 'br', 'b', 'i'],
                        ALLOWED_ATTR: ['class']
                      });
                      return (
                        <p key={index} className="text-muted-foreground leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Video Section - YouTube */}
              {property.youtube_url && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                >
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Multimedia</div>
                  <h3 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-6 flex items-center gap-3">
                    <Play className="w-6 h-6" />
                    Project video
                  </h3>
                  <div className="relative overflow-hidden">
                    <iframe
                      src={getYouTubeEmbedUrl(property.youtube_url) || ''}
                      title={`${property.name} - Video`}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </motion.div>
              )}

              {/* Property Info Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Specifications</div>
                <h3 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-6">Details</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-border">
                      <span className="text-muted-foreground font-medium">Price from</span>
                      <span className="text-foreground font-semibold">
                        {property.price_formatted || `${(property.price_from || 0).toLocaleString()} USD`}
                      </span>
                    </div>
                    {property.completion_date && (
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground font-medium">Planned completion</span>
                        <span className="text-foreground font-semibold">{property.completion_date}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-3 border-b border-border">
                      <span className="text-muted-foreground font-medium">Status</span>
                      <span className="text-foreground font-semibold">{property.status}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-border">
                      <span className="text-muted-foreground font-medium">Type</span>
                      <span className="text-foreground font-semibold">{property.type}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {property.bedrooms && (
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground font-medium flex items-center gap-2">
                          <Bed className="w-4 h-4" /> Bedrooms
                        </span>
                        <span className="text-foreground font-semibold">{property.bedrooms}</span>
                      </div>
                    )}
                    {property.area_sqm && (
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground font-medium flex items-center gap-2">
                          <Maximize className="w-4 h-4" /> Area
                        </span>
                        <span className="text-foreground font-semibold">{property.area_sqm} m²</span>
                      </div>
                    )}
                    <div className="flex justify-between py-3 border-b border-border">
                      <span className="text-muted-foreground font-medium">Developer</span>
                      <span className="text-foreground font-semibold">{property.developers?.name || '-'}</span>
                    </div>
                    {property.payment_plan && (
                      <div className="flex justify-between py-3 border-b border-border">
                        <span className="text-muted-foreground font-medium">Payment plan</span>
                        <span className="text-foreground font-semibold">{property.payment_plan}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Unit Prices Section */}
              {unitPrices.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Pricing</div>
                      <h3 className="text-3xl md:text-4xl font-serif font-semibold text-foreground">Unit prices</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const csvContent = [
                            ['Type', 'Area from (m²)', 'Area to (m²)', 'Price from'],
                            ...unitPrices.map(unit => [
                              unit.unit_type,
                              unit.area_sqm_from || '',
                              unit.area_sqm_to || '',
                              unit.price_formatted || (unit.price_from ? `${unit.price_from} USD` : '')
                            ])
                          ].map(row => row.join(';')).join('\n');
                          
                          const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `${property.name.replace(/\s+/g, '-')}-prices.csv`;
                          link.click();
                          URL.revokeObjectURL(url);
                          toast.success('CSV file downloaded');
                        }}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (!printWindow) {
                            toast.error('Allow pop-ups to download the PDF');
                            return;
                          }
                          
                          const tableRows = unitPrices.map(unit => `
                            <tr>
                              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${unit.unit_type}</td>
                              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${unit.area_sqm_from && unit.area_sqm_to ? `${unit.area_sqm_from} - ${unit.area_sqm_to} m²` : unit.area_sqm_from ? `from ${unit.area_sqm_from} m²` : '-'}</td>
                              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #b5a071;">${unit.price_formatted || (unit.price_from ? `${unit.price_from.toLocaleString()} USD` : '-')}</td>
                            </tr>
                          `).join('');

                          // Details for PDF
                          const details = [
                            property.bedrooms ? `Bedrooms: ${property.bedrooms}` : null,
                            property.area_sqm ? `Area: ${property.area_sqm}` : null,
                            property.completion_date ? `Completion: ${property.completion_date}` : null,
                            property.status ? `Status: ${property.status}` : null,
                            property.payment_plan ? `Payment plan: ${property.payment_plan}` : null,
                          ].filter(Boolean);

                          // Amenities for PDF
                          const amenitiesList = amenities.length > 0 
                            ? amenities.map(a => `<li style="margin-bottom: 4px;">${a}</li>`).join('')
                            : '';

                          // Gallery images for PDF (excluding hero image if present)
                          const galleryImages = (property.property_images || [])
                            .filter(img => img.image_url !== property.hero_image_url)
                            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                          
                          printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <title>${property.name} - Price list</title>
                              <style>
                                * { box-sizing: border-box; }
                                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; }
                                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 3px solid #2d2d2d; }
                                .header-left { flex: 1; }
                                .header-right { display: flex; align-items: center; gap: 16px; }
                                .header-logo { height: 40px; }
                                .developer-logo { height: 32px; max-width: 100px; object-fit: contain; }
                                h1 { font-size: 26px; margin-bottom: 4px; color: #1a1a1a; margin-top: 0; font-weight: 700; letter-spacing: -0.5px; }
                                h2 { font-size: 14px; margin-top: 28px; margin-bottom: 12px; color: #2d2d2d; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; border-bottom: none; padding-bottom: 0; }
                                .subtitle { color: #666; margin-bottom: 0; font-size: 13px; font-weight: 400; }
                                .hero-image { width: 100%; max-height: 220px; object-fit: cover; border-radius: 8px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                                .gallery-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px; }
                                .gallery-image { width: 100%; height: 100px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
                                .description { margin: 16px 0; line-height: 1.6; color: #555; font-size: 13px; }
                                .description strong { color: #1a1a1a; }
                                .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
                                .detail-item { padding: 10px 12px; background: linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%); border-radius: 6px; font-size: 12px; border-left: 3px solid #2d2d2d; }
                                .amenities-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; margin: 12px 0; }
                                .amenity-item { font-size: 11px; color: #444; padding: 4px 0; padding-left: 16px; position: relative; }
                                .amenity-item:before { content: "✓"; position: absolute; left: 0; color: #2d2d2d; font-weight: bold; font-size: 10px; }
                                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
                                th { text-align: left; padding: 10px 12px; background: #f5f5f5; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
                                th:last-child { text-align: right; }
                                td { padding: 12px; border-bottom: 1px solid #eee; }
                                td:last-child { text-align: right; font-weight: 600; color: #2d2d2d; }
                                .footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #eee; font-size: 11px; color: #888; }
                                .footer p { margin: 2px 0; }
                                @media print { 
                                  body { padding: 20px; } 
                                  .hero-image { max-height: 180px; } 
                                  .gallery-image { height: 80px; }
                                  .no-break { page-break-inside: avoid; }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div class="header-left">
                                  <h1>${property.name}</h1>
                                  <p class="subtitle">${property.areas?.name || ''}, ${property.areas?.city || 'Dubai'}${property.developers?.name ? ` • ${property.developers.name}` : ''}</p>
                                </div>
                                <div class="header-right">
                                  ${property.developers?.logo_url ? `<img src="${property.developers.logo_url}" alt="${property.developers.name || 'Developer'}" class="developer-logo" />` : ''}
                                  <img src="${window.location.origin}/logo-pdf.png" alt="Dubaj Reality" class="header-logo" />
                                </div>
                              </div>
                              
                              ${property.hero_image_url ? `<img src="${property.hero_image_url}" alt="${property.name}" class="hero-image" />` : ''}
                              
                              ${galleryImages.length > 0 ? `
                                <div class="gallery-grid">
                                  ${galleryImages.slice(0, 4).map((img, idx) => `<img src="${img.image_url}" alt="${img.alt_text || property.name + ' ' + (idx + 1)}" class="gallery-image" />`).join('')}
                                </div>
                              ` : ''}
                              
                              ${displayShortDescription ? `<p class="description"><strong>${displayShortDescription}</strong></p>` : ''}
                              ${displayDescription ? `<div class="description">${displayDescription.substring(0, 400)}${displayDescription.length > 400 ? '...' : ''}</div>` : ''}
                              
                              ${details.length > 0 ? `
                                <h2>Project details</h2>
                                <div class="details-grid no-break">
                                  ${details.map(d => `<div class="detail-item">${d}</div>`).join('')}
                                </div>
                              ` : ''}
                              
                              ${amenitiesList ? `
                                <h2>Key features and amenities</h2>
                                <div class="amenities-grid no-break">
                                  ${amenities.map(a => `<div class="amenity-item">${a}</div>`).join('')}
                                </div>
                              ` : ''}
                              
                              <h2>Unit prices</h2>
                              <table>
                                <thead>
                                  <tr>
                                    <th>Unit type</th>
                                    <th>Area</th>
                                    <th style="text-align: right;">Price from</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${tableRows}
                                </tbody>
                              </table>
                              <div class="footer">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                                  <div>
                                    <p style="margin: 0 0 4px 0;"><strong>go2dubai.online</strong> | www.go2dubai.online</p>
                                    <p style="margin: 0 0 4px 0;">info@go2dubai.online | +420 727 822 988</p>
                                    <p style="margin: 8px 0 0 0; font-size: 12px;">Generated: ${new Date().toLocaleDateString('en-GB')}</p>
                                  </div>
                                  <div style="text-align: center;">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(window.location.href)}" alt="QR code" style="width: 80px; height: 80px;" />
                                    <p style="margin: 4px 0 0 0; font-size: 10px; color: #888;">Scan for details</p>
                                  </div>
                                </div>
                              </div>
                            </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Type</th>
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium">Area</th>
                          <th className="text-right py-3 px-4 text-muted-foreground font-medium">Price from</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitPrices.map((unit) => (
                          <tr key={unit.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Bed className="w-4 h-4 text-primary" />
                                <span className="font-medium text-foreground">{unit.unit_type}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-muted-foreground">
                              {unit.area_sqm_from && unit.area_sqm_to 
                                ? `${unit.area_sqm_from} - ${unit.area_sqm_to} m²`
                                : unit.area_sqm_from 
                                  ? `from ${unit.area_sqm_from} m²`
                                  : '-'}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="font-semibold text-primary">
                                {unit.price_formatted || (unit.price_from ? `${unit.price_from.toLocaleString()} USD` : '-')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Key Features Section */}
              {amenities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Amenities</div>
                  <h3 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-6">Key features and amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0 border-t border-border">
                    {amenities.map((amenity, index) => {
                      const IconComponent = getAmenityIcon(amenity);
                      return (
                        <div key={index} className="flex items-center gap-3 py-3 border-b border-border/60">
                          <IconComponent className="w-4 h-4 text-foreground flex-shrink-0" />
                          <span className="text-sm text-foreground">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Location Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Where to find us</div>
                <h3 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-6">Location</h3>
                <p className="text-muted-foreground mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {property.areas?.name || 'Location'} - {property.areas?.city || 'Dubai'} - {property.areas?.country || 'UAE'}
                </p>
                {property.latitude && property.longitude && (
                  <PropertyMap
                    latitude={property.latitude}
                    longitude={property.longitude}
                    propertyName={property.name}
                    address={`${property.areas?.name || ''}, ${property.areas?.city || 'Dubai'}`}
                  />
                )}
              </motion.div>
            </div>

            {/* Right Column - Inquiry Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="sticky top-24 bg-background border border-border"
              >
                {/* Price header */}
                <div className="px-6 pt-6 pb-5 border-b border-border">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">
                    Price from
                  </div>
                  <div className="font-serif text-2xl font-semibold text-foreground leading-tight">
                    {property.price_formatted || `${(property.price_from || 0).toLocaleString()} USD`}
                  </div>
                  {property.completion_date && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Completion {property.completion_date}</span>
                    </div>
                  )}
                </div>

                {/* Developer Info */}
                {property.developers?.name && (
                  <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
                    <div className="w-10 h-10 bg-foreground flex items-center justify-center overflow-hidden flex-shrink-0">
                      {property.developers?.logo_url ? (
                        <img
                          src={property.developers.logo_url}
                          alt={property.developers.name || 'Developer'}
                          className="w-7 h-7 object-contain brightness-0 invert"
                        />
                      ) : (
                        <Building className="w-5 h-5 text-background" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Developer</div>
                      <div className="font-medium text-sm text-foreground truncate">{property.developers.name}</div>
                    </div>
                  </div>
                )}

                {/* Contact Form */}
                <div className="px-6 py-6">
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-1">
                    I'm interested in this property
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    We'll get back to you within 24 hours.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                      placeholder="Full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-background rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
                    />
                    <PhoneInputWithValidation
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      required
                      showWhatsAppValidation={true}
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-background rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
                    />
                    <Textarea
                      placeholder={`Hello, I'm interested in ${property.name}`}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      className="bg-background resize-none rounded-none border-border focus-visible:ring-0 focus-visible:border-foreground"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90 text-[11px] tracking-[0.2em] uppercase font-medium"
                    >
                      Send inquiry
                    </Button>
                  </form>
                </div>

                {/* Quick Actions */}
                <div className="px-6 py-5 border-t border-border space-y-3">
                  <a
                    href="tel:+420727822988"
                    className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>+420 727 822 988</span>
                  </a>
                  <a
                    href="mailto:info@go2dubai.online"
                    className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>info@go2dubai.online</span>
                  </a>

                  {property.brochure_url && (
                    canDownloadDirectly ? (
                      <a
                        href={property.brochure_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block pt-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background text-[11px] tracking-[0.2em] uppercase font-medium"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download brochure
                        </Button>
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full mt-1 rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background text-[11px] tracking-[0.2em] uppercase font-medium"
                        onClick={() => setBrochureDialogOpen(true)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download brochure
                      </Button>
                    )
                  )}

                  {canDownloadDirectly && property.dropbox_folder_url && (
                    <a
                      href={property.dropbox_folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[11px] tracking-[0.2em] uppercase font-medium">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Open Dropbox
                      </Button>
                    </a>
                  )}
                </div>
                <PropertyBrochureDialog 
                  open={brochureDialogOpen} 
                  onOpenChange={setBrochureDialogOpen}
                  property={{
                    id: property.id,
                    name: property.name,
                    developer: property.developers?.name || 'Developer',
                    location: property.areas?.name || 'Location',
                    priceFormatted: property.price_formatted || `${(property.price_from || 0).toLocaleString()} USD`,
                    handover: property.completion_date,
                    catalogUrl: property.brochure_url
                  }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Properties */}
      {relatedProperties.length > 0 && (
        <section className="py-16 bg-background border-t border-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">You may also like</div>
            <h3 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-8">Similar projects</h3>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {relatedProperties.map((p: any) => {
                const thumbImage = p.property_images?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.image_url || p.hero_image_url || '/placeholder.svg';
                return (
                  <Link key={p.id} to={`/nemovitost/${p.slug}`} className="group block">
                    <article className="bg-transparent">
                      <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                        <img
                          src={thumbImage}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        />
                        {p.status && (
                          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground rounded-none text-[10px] tracking-[0.18em] uppercase font-medium px-3 py-1">
                            {p.status}
                          </Badge>
                        )}
                      </div>
                      <div className="pt-5 space-y-2">
                        <div className="flex items-center gap-2 text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{p.areas?.name || 'Location'}, {p.areas?.city || 'Dubai'}</span>
                        </div>
                        <h4 className="font-serif text-xl font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {p.name}
                        </h4>
                        {p.price_formatted && (
                          <div className="pt-3 border-t border-border">
                            <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mr-2">Price from</span>
                            <span className="font-serif text-base font-semibold text-foreground">{p.price_formatted}</span>
                          </div>
                        )}
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default PropertyDetail;
