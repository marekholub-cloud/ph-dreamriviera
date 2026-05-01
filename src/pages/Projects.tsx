import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactDialog } from "@/components/ContactDialog";
import { CatalogDownloadDialog } from "@/components/CatalogDownloadDialog";
import { motion } from "framer-motion";
import { MapPin, Bed, Maximize, SlidersHorizontal, X, Building, Calendar, Download, Eye, Loader2, ChevronLeft, ChevronRight, Heart, Share2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import villasHero from "@/assets/villas-hero.jpg";

// Define the database property type
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
  short_description: string | null;
  completion_date: string | null;
  is_featured: boolean | null;
  brochure_url: string | null;
  payment_plan: string | null;
  areas: {
    name: string;
    city: string;
  } | null;
  developers: {
    name: string;
  } | null;
  property_images: {
    image_url: string;
    sort_order: number | null;
  }[] | null;
}

const cities = ["All", "Osa Peninsula", "Dominical", "Uvita", "Puerto Jimenez", "Drake Bay"];
const statuses = ["All", "Available", "Reserved", "Coming Soon"];
const propertyTypes = ["All", "Villa", "House", "Apartment", "Studio", "Cabin"];
const bedroomOptions = ["All", "Studio", "1", "2", "3", "4", "5+"];
const sortOptions = [
  { value: "default", label: "Default Order" },
  { value: "price-asc", label: "Price - Low to High" },
  { value: "price-desc", label: "Price - High to Low" },
  { value: "handover", label: "By Availability" },
];

const ITEMS_PER_PAGE_OPTIONS = [9, 18, 36, 72];

const Projects = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sharedIds = searchParams.get('sdilene')?.split(',').filter(Boolean) || [];
  const isShowingShared = sharedIds.length > 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [cityFilter, setCityFilter] = useState("All");
  const [developerFilter, setDeveloperFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [bedroomFilter, setBedroomFilter] = useState("All");
  const [priceRange, setPriceRange] = useState([100000, 100000000]);
  const [sortBy, setSortBy] = useState("default");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  const { favoriteIds } = useFavorites();
  const favoritesCount = favoriteIds.size;

  // Fetch properties from database
  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
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
          is_featured,
          brochure_url,
          payment_plan,
          areas (
            name,
            city
          ),
          developers (
            name
          ),
          property_images (
            image_url,
            sort_order
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DbProperty[];
    }
  });

  // Get unique developers from properties
  const developers = useMemo(() => {
    const devSet = new Set(properties.map(p => p.developers?.name).filter(Boolean));
    return ["All", ...Array.from(devSet)] as string[];
  }, [properties]);

  const filteredProperties = useMemo(() => {
    let result = properties.filter(property => {
      // Filter by shared IDs if present
      if (isShowingShared && !sharedIds.includes(property.id)) return false;
      
      // Filter by favorites
      if (showOnlyFavorites && !favoriteIds.has(property.id)) return false;
      
      // Fulltext search (using debounced value)
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        const searchableText = [
          property.name,
          property.developers?.name,
          property.areas?.name,
          property.areas?.city,
          property.short_description,
          property.type,
          property.status
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) return false;
      }
      
      if (cityFilter !== "All" && property.areas?.city !== cityFilter) return false;
      if (developerFilter !== "All" && property.developers?.name !== developerFilter) return false;
      if (statusFilter !== "All" && property.status !== statusFilter) return false;
      if (typeFilter !== "All" && property.type !== typeFilter) return false;
      
      const price = property.price_from || 0;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      
      return true;
    });

    // Sort
    if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => (a.price_from || 0) - (b.price_from || 0));
    } else if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => (b.price_from || 0) - (a.price_from || 0));
    }

    return result;
  }, [properties, debouncedSearchQuery, cityFilter, developerFilter, statusFilter, typeFilter, priceRange, sortBy, showOnlyFavorites, favoriteIds, isShowingShared, sharedIds]);

  const clearSharedFilter = () => {
    setSearchParams({});
  };

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProperties.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProperties, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCityFilter("All");
    setDeveloperFilter("All");
    setStatusFilter("All");
    setTypeFilter("All");
    setBedroomFilter("All");
    setPriceRange([100000, 100000000]);
    setShowOnlyFavorites(false);
    setCurrentPage(1);
  };

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section with Search */}
      <section className="relative h-[calc(75vh+20px)] flex items-center justify-center overflow-hidden -mt-[72px] pt-[142px]">
        {/* Image background */}
        <img
          src={villasHero}
          alt="Dubai coastline"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            {isShowingShared ? (
              <>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="inline-flex items-center gap-2 text-sm text-white tracking-[0.2em] mb-6 uppercase font-medium bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm"
                >
                  <Share2 className="w-4 h-4" />
                  Shared Collection
                </motion.p>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white mb-6"
                >
                  Shared
                  <span className="block bg-gradient-to-r from-primary via-primary to-amber-400 bg-clip-text text-transparent">Favorite Villas</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mb-6"
                >
                  Someone shared their selection of {sharedIds.length} {sharedIds.length === 1 ? 'villa' : 'villas'} with you
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <Button onClick={clearSharedFilter} variant="outline" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <X className="w-4 h-4" />
                    View All Villas
                  </Button>
                </motion.div>
              </>
            ) : (
              <>
                <motion.p 
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="inline-flex items-center gap-2 text-sm text-white tracking-[0.2em] mb-6 uppercase font-medium bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm"
                >
                  <Building className="w-4 h-4" />
                  Villa Catalog
                </motion.p>
                <motion.h1 
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white mb-6"
                >
                  Luxury Villas
                  <motion.span 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="block bg-gradient-to-r from-primary via-primary to-amber-400 bg-clip-text text-transparent"
                  >
                    in Dubai
                  </motion.span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mb-10"
                >
                  Discover our exclusive collection of tropical villas and vacation rentals 
                  in the heart of Dubai's most beautiful destinations.
                </motion.p>
              </>
            )}
            {/* Quick Stats - only show when not viewing shared */}
            {!isShowingShared && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex justify-center gap-6 md:gap-12"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-center px-6 py-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30"
                >
                  <p className="text-4xl font-serif font-bold text-white">{properties.length}+</p>
                  <p className="text-sm text-white/80 mt-1">Villas</p>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.95, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-center px-6 py-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30"
                >
                  <p className="text-4xl font-serif font-bold text-white">{developers.length - 1}+</p>
                  <p className="text-sm text-white/80 mt-1">Locations</p>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </div>
        
        {/* Bottom gradient transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Filters Section */}
      <section className="py-6 mt-[50px] bg-transparent border-y border-border/30 sticky top-[72px] z-40 backdrop-blur-md">
        <div className="container mx-auto px-6">
          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search villas..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="w-48 pl-9 bg-background"
              />
            </div>
            <Select value={cityFilter} onValueChange={(v) => handleFilterChange(setCityFilter, v)}>
              <SelectTrigger className="w-40 bg-background">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={developerFilter} onValueChange={(v) => handleFilterChange(setDeveloperFilter, v)}>
              <SelectTrigger className="w-48 bg-background">
                <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Developer" />
              </SelectTrigger>
              <SelectContent>
                {developers.map(dev => (
                  <SelectItem key={dev} value={dev}>{dev === "All" ? "Owner" : dev}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => handleFilterChange(setTypeFilter, v)}>
              <SelectTrigger className="w-40 bg-background">
                <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={bedroomFilter} onValueChange={(v) => handleFilterChange(setBedroomFilter, v)}>
              <SelectTrigger className="w-40 bg-background">
                <Bed className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                {bedroomOptions.map(option => (
                  <SelectItem key={option} value={option}>{option === "All" ? "Bedrooms" : option}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Price:</span>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                min={100000}
                max={100000000}
                step={100000}
                className="flex-1"
              />
              <span className="text-sm text-foreground whitespace-nowrap min-w-[180px]">
                {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              </span>
            </div>

            {favoritesCount > 0 && (
              <Button
                variant={showOnlyFavorites ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange(setShowOnlyFavorites, !showOnlyFavorites)}
                className={showOnlyFavorites ? "" : "border-border"}
              >
                <Heart className={`w-4 h-4 mr-1 ${showOnlyFavorites ? "fill-current" : ""}`} />
                Favorites ({favoritesCount})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="border-border"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-border"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <span className="text-sm text-muted-foreground">
              {filteredProperties.length} villas
            </span>
          </div>

          {/* Mobile Filters Panel */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="lg:hidden mt-4 space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search villas..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                  className="w-full pl-9 bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={cityFilter} onValueChange={(v) => handleFilterChange(setCityFilter, v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={developerFilter} onValueChange={(v) => handleFilterChange(setDeveloperFilter, v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Developer" />
                  </SelectTrigger>
                  <SelectContent>
                    {developers.map(dev => (
                      <SelectItem key={dev} value={dev}>{dev === "All" ? "Owner" : dev}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={(v) => handleFilterChange(setTypeFilter, v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={bedroomFilter} onValueChange={(v) => handleFilterChange(setBedroomFilter, v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Bedrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    {bedroomOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {favoritesCount > 0 && (
                <Button
                  variant={showOnlyFavorites ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(setShowOnlyFavorites, !showOnlyFavorites)}
                  className={`w-full ${showOnlyFavorites ? "" : "border-border"}`}
                >
                  <Heart className={`w-4 h-4 mr-1 ${showOnlyFavorites ? "fill-current" : ""}`} />
                  Favorites only ({favoritesCount})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full border-border"
              >
                Clear filters
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Results Header */}
      <section className="py-6 bg-background">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              <span className="text-foreground font-semibold">{filteredProperties.length}</span> villas found
            </p>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-background">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-8 bg-background">
        <div className="container mx-auto px-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading villas...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <p className="text-destructive">Failed to load villas. Please try again later.</p>
            </div>
          )}

          {/* Properties Grid */}
          {!isLoading && !error && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="h-full"
                >
                  <Card className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-card to-card/80 border-border/50 hover:border-primary/40 transition-all duration-500 group hover:shadow-xl hover:shadow-primary/10 relative rounded-2xl">
                    {/* Image */}
                    <Link to={`/nemovitost/${property.slug}`} className="block relative h-64 overflow-hidden">
                      <img
                        src={
                          property.property_images?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.image_url || 
                          property.hero_image_url || 
                          '/placeholder.svg'
                        }
                        alt={property.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      {/* Tags */}
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        {property.is_featured && (
                          <span className="bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                            ★ Featured
                          </span>
                        )}
                        <span className="bg-background/95 backdrop-blur-md text-foreground text-xs font-semibold px-3 py-1.5 rounded-full border border-border/50">
                          {property.status}
                        </span>
                      </div>

                      {/* Bottom overlay info */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-primary font-medium mb-1">{property.developers?.name || 'Developer'}</p>
                            <h3 className="text-xl font-serif font-bold text-white">
                              {property.name}
                            </h3>
                            <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{property.areas?.name || 'Location'}, {property.areas?.city || 'Dubai'}</span>
                            </div>
                          </div>
                          {property.completion_date && (
                            <div className="bg-primary/90 backdrop-blur-sm px-3 py-2 rounded-xl">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Calendar className="w-3.5 h-3.5 text-primary-foreground" />
                                <span className="font-bold text-primary-foreground">{property.completion_date}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* Favorite Button */}
                    <div className="absolute top-4 right-4 z-10">
                      <FavoriteButton propertyId={property.id} size="md" />
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      {/* Price */}
                      <div className="flex items-center justify-end mb-4">
                        <p className="text-lg font-semibold bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">
                          from {property.price_formatted || `$${(property.price_from || 0).toLocaleString()}`}
                        </p>
                      </div>

                      {/* Features */}
                      <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground mb-5 py-4 border-y border-border/50">
                        {property.bedrooms && (
                          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg">
                            <Bed className="w-4 h-4 text-primary" />
                            <span className="font-medium">{property.bedrooms}</span>
                          </div>
                        )}
                        {property.area_sqm && (
                          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg">
                            <Maximize className="w-4 h-4 text-primary" />
                            <span className="font-medium">{property.area_sqm} sqft</span>
                          </div>
                        )}
                        {property.payment_plan && (
                          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">{property.payment_plan}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 mt-auto">
                        <Link to={`/nemovitost/${property.slug}`} className="flex-1">
                          <Button
                            variant="outline"
                            className="w-full border-border hover:border-primary hover:bg-primary/10 hover:text-primary transition-all duration-300"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Details
                          </Button>
                        </Link>
                        {property.brochure_url && (
                          <div className="flex-1">
                            <CatalogDownloadDialog
                              property={{
                                id: property.id,
                                name: property.name,
                                developer: property.developers?.name || "Owner",
                                location: property.areas?.name || "Location",
                                priceFormatted:
                                  property.price_formatted || `from $${(property.price_from || 0).toLocaleString()}`,
                                handover: property.completion_date || undefined,
                                catalogUrl: property.brochure_url,
                              }}
                            >
                              <Button
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase tracking-wider text-xs transition-all duration-300"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Brochure
                              </Button>
                            </CatalogDownloadDialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && filteredProperties.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-8 border-t border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map(option => (
                      <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">of {filteredProperties.length}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-border"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <div key={page} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? "bg-primary text-primary-foreground" : "border-border"}
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-border"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && filteredProperties.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Building className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-foreground mb-3">
                No results
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find any villas matching your criteria. Try adjusting your filters or contact us for personalized recommendations.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-border"
                >
                  Clear filters
                </Button>
                <ContactDialog>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase tracking-wider text-xs">
                    Contact us
                  </Button>
                </ContactDialog>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-background via-card to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.1),transparent_70%)]" />
        
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Didn't find your perfect villa?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Contact us and we'll help you find exactly what you're looking for. 
              We have access to exclusive off-market listings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <ContactDialog>
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase tracking-wider text-xs px-8"
                >
                  Contact us
                </Button>
              </ContactDialog>
              <Link to="/investor-profil">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10 font-semibold uppercase tracking-wider text-xs px-8"
                >
                  Fill out investor profile
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Projects;
