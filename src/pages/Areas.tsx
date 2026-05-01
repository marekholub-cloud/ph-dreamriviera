import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Loader2, ArrowRight, Building2, SlidersHorizontal, X, Hash, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import heroVideo from "@/assets/dubai-hero.mp4";

interface Area {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string | null;
  image_url: string | null;
  property_count?: number;
}

const projectCountOptions = [
  { value: "all", label: "Vše" },
  { value: "1-3", label: "1-3 projekty" },
  { value: "4-10", label: "4-10 projektů" },
  { value: "10+", label: "10+ projektů" },
];

const sortOptions = [
  { value: "name", label: "Podle názvu" },
  { value: "projects-desc", label: "Nejvíce projektů" },
  { value: "projects-asc", label: "Nejméně projektů" },
];

const Areas = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [projectCountFilter, setProjectCountFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch areas with property counts
  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas-with-counts'],
    queryFn: async () => {
      // Get all areas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .order('name');

      if (areasError) throw areasError;

      // Get property counts per area
      const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('area_id')
        .eq('is_published', true);

      if (propsError) throw propsError;

      // Count properties per area
      const countMap = new Map<string, number>();
      properties.forEach(p => {
        if (p.area_id) {
          countMap.set(p.area_id, (countMap.get(p.area_id) || 0) + 1);
        }
      });

      // Add counts to areas
      return areasData.map(area => ({
        ...area,
        property_count: countMap.get(area.id) || 0
      })) as Area[];
    }
  });

  // Get unique cities
  const allCities = useMemo(() => {
    const citySet = new Set<string>();
    areas.forEach(area => {
      if (area.city) citySet.add(area.city);
    });
    return Array.from(citySet).sort();
  }, [areas]);

  // Filter and sort areas
  const filteredAreas = useMemo(() => {
    let result = areas.filter(area => area.property_count && area.property_count > 0);

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(area => 
        area.name.toLowerCase().includes(query) ||
        area.city.toLowerCase().includes(query) ||
        area.description?.toLowerCase().includes(query)
      );
    }

    // Filter by city
    if (cityFilter !== "all") {
      result = result.filter(area => area.city === cityFilter);
    }

    // Filter by project count
    if (projectCountFilter !== "all") {
      result = result.filter(area => {
        const count = area.property_count || 0;
        switch (projectCountFilter) {
          case "1-3":
            return count >= 1 && count <= 3;
          case "4-10":
            return count >= 4 && count <= 10;
          case "10+":
            return count > 10;
          default:
            return true;
        }
      });
    }

    // Sort
    switch (sortBy) {
      case "projects-desc":
        result = [...result].sort((a, b) => (b.property_count || 0) - (a.property_count || 0));
        break;
      case "projects-asc":
        result = [...result].sort((a, b) => (a.property_count || 0) - (b.property_count || 0));
        break;
      case "name":
      default:
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [areas, searchQuery, cityFilter, projectCountFilter, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setCityFilter("all");
    setProjectCountFilter("all");
    setSortBy("name");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || cityFilter !== "all" || projectCountFilter !== "all";

  // All areas with properties for stats
  const areasWithProperties = areas.filter(area => area.property_count && area.property_count > 0);

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Oblasti | Dubaj Reality"
        description="Prozkoumejte nejatraktivnější lokality v Dubaji a okolí s nabídkou luxusních nemovitostí."
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[calc(75vh+20px)] flex items-center justify-center overflow-hidden -mt-[72px] pt-[142px]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Bottom gradient transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.p 
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="inline-flex items-center gap-2 text-sm text-primary tracking-[0.2em] mt-8 mb-6 uppercase font-medium bg-primary/10 px-4 py-2 rounded-full"
            >
              <MapPin className="w-4 h-4" />
              Lokality
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-foreground mb-6"
            >
              Prémiové
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="block bg-gradient-to-r from-primary via-primary to-amber-400 bg-clip-text text-transparent"
              >
                oblasti
              </motion.span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Objevte nejatraktivnější lokality v Dubaji a okolí, kde nabízíme 
              exkluzivní nemovitosti s vysokým investičním potenciálem.
            </motion.p>
            
            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex justify-center gap-6 md:gap-12 mt-10"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center px-6 py-4 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50"
              >
                <p className="text-4xl font-serif font-bold bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">
                  {areasWithProperties.length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Oblastí</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.95, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center px-6 py-4 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50"
              >
                <p className="text-4xl font-serif font-bold bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">
                  {areasWithProperties.reduce((sum, area) => sum + (area.property_count || 0), 0)}+
                </p>
                <p className="text-sm text-muted-foreground mt-1">Projektů</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-6 mt-[50px] bg-transparent border-y border-border/30 sticky top-[72px] z-40 backdrop-blur-md">
        <div className="container mx-auto px-6">
          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-4 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Hledat oblast..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-56 bg-background"
              />
            </div>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-48 bg-background">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Město" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechna města</SelectItem>
                {allCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectCountFilter} onValueChange={setProjectCountFilter}>
              <SelectTrigger className="w-48 bg-background">
                <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Počet projektů" />
              </SelectTrigger>
              <SelectContent>
                {projectCountOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-background">
                <SelectValue placeholder="Řazení" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <span className="text-sm text-muted-foreground">
              {filteredAreas.length} {filteredAreas.length === 1 ? 'oblast' : 
                filteredAreas.length < 5 ? 'oblasti' : 'oblastí'}
            </span>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="border-border"
              >
                <X className="w-4 h-4 mr-1" />
                Vymazat
              </Button>
            )}
          </div>

          {/* Mobile Filter Toggle */}
          <div className="md:hidden flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-border"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtry
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                  {(searchQuery.trim() ? 1 : 0) + (cityFilter !== "all" ? 1 : 0) + (projectCountFilter !== "all" ? 1 : 0)}
                </span>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {filteredAreas.length} oblastí
            </span>
          </div>

          {/* Mobile Filters Panel */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="md:hidden mt-4 space-y-4"
            >
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Hledat oblast..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full bg-background"
                />
              </div>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full bg-background">
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Město" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechna města</SelectItem>
                  {allCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={projectCountFilter} onValueChange={setProjectCountFilter}>
                <SelectTrigger className="w-full bg-background">
                  <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Počet projektů" />
                </SelectTrigger>
                <SelectContent>
                  {projectCountOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Řazení" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full border-border"
                >
                  <X className="w-4 h-4 mr-1" />
                  Vymazat filtry
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* Areas Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAreas.map((area, index) => (
                <motion.div
                  key={area.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <Link to={`/oblast/${encodeURIComponent(area.name.toLowerCase().replace(/\s+/g, '-'))}`}>
                    <Card className="group overflow-hidden border-border/50 bg-card hover:border-primary/50 transition-all duration-300 h-full">
                      {/* Image Area */}
                      <div className="aspect-[16/9] relative overflow-hidden">
                        {area.image_url ? (
                          <img 
                            src={area.image_url} 
                            alt={area.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                            <MapPin className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {/* City Badge */}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-medium rounded-full">
                            {area.city}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {area.name}
                        </h3>

                        {area.description && (
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                            {area.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-primary font-medium">
                            {area.property_count} {area.property_count === 1 ? 'projekt' : 
                              area.property_count && area.property_count < 5 ? 'projekty' : 'projektů'}
                          </span>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && filteredAreas.length === 0 && (
            <div className="text-center py-20">
              <MapPin className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? "Žádné oblasti neodpovídají vybraným filtrům." 
                  : "Žádné oblasti zatím nebyly přidány."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Vymazat filtry
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Areas;
