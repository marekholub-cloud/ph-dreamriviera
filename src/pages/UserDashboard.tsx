import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, Loader2, Search, FileText, Home, Building2, ExternalLink, Download, FolderOpen, X, Calendar, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoImage from "@/assets/logo-white.png";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface BrochureRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  request_type: string;
  created_at: string;
  selected_brochures: any;
  investment_type: string | null;
  budget: string | null;
  timeline: string | null;
}

interface PropertyUnitPrice {
  id: string;
  property_id: string;
  unit_type: string;
  price_from: number | null;
}

interface Property {
  id: string;
  name: string;
  slug: string;
  status: string;
  type: string;
  price_formatted: string | null;
  completion_date: string | null;
  dropbox_folder_url: string | null;
  is_published: boolean | null;
  developer_id: string | null;
  developer: {
    name: string;
  } | null;
  area: {
    name: string;
    city: string;
  } | null;
}

interface Developer {
  id: string;
  name: string;
}

interface CatalogDownload {
  id: string;
  downloaded_at: string;
  brochure_request: {
    selected_brochures: any;
    request_type: string;
  } | null;
}

const UserDashboard = () => {
  const { signOut, user, isObchodnik, adminLoading } = useAuth();
  const [myRequests, setMyRequests] = useState<BrochureRequest[]>([]);
  const [myDownloads, setMyDownloads] = useState<CatalogDownload[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyNames, setPropertyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Advanced filters
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [unitPrices, setUnitPrices] = useState<PropertyUnitPrice[]>([]);
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [developerFilter, setDeveloperFilter] = useState<string>("all");
  const [selectedUnitTypes, setSelectedUnitTypes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [completionQuarter, setCompletionQuarter] = useState<string>("");
  const [quarterPickerYear, setQuarterPickerYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (user && !adminLoading) {
      fetchData();
    }
  }, [user, adminLoading]);

  const fetchData = async () => {
    try {
      // Fetch property names for reference
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name, slug, status, type, price_formatted, completion_date, dropbox_folder_url, is_published, developer_id, developer:developers(name), area:areas(name, city)")
        .order("name", { ascending: true });

      if (propertiesData) {
        const nameMap: Record<string, string> = {};
        propertiesData.forEach((p) => {
          nameMap[p.id] = p.name;
        });
        setPropertyNames(nameMap);
        setProperties(propertiesData as Property[]);
      }

      // Fetch developers for filter
      const { data: developersData } = await supabase
        .from("developers")
        .select("id, name")
        .order("name", { ascending: true });
      
      if (developersData) {
        setDevelopers(developersData);
      }

      // Fetch unit prices for filter
      const { data: unitPricesData } = await supabase
        .from("property_unit_prices")
        .select("id, property_id, unit_type, price_from");
      
      if (unitPricesData) {
        setUnitPrices(unitPricesData);
        // Extract unique unit types
        const types = [...new Set(unitPricesData.map(u => u.unit_type))].sort();
        setUnitTypes(types);
      }

      // For regular users: Try to find their requests by email
      if (user?.email) {
        // Note: This requires updating RLS to allow users to see their own requests by email
        // For now, we'll show what we can access
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Chyba při načítání dat",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Parse completion date for comparison (format: Q1 2025, Q2 2026, etc.)
  const parseCompletionDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    
    // Try to parse Q1 2025 format
    const quarterMatch = dateStr.match(/Q(\d)\s*(\d{4})/i);
    if (quarterMatch) {
      const quarter = parseInt(quarterMatch[1]);
      const year = parseInt(quarterMatch[2]);
      // Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
      const month = (quarter - 1) * 3;
      return new Date(year, month + 2, 28); // End of quarter
    }
    
    // Try to parse year only
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[1]), 11, 31); // End of year
    }
    
    // Try standard date parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Toggle unit type selection
  const toggleUnitType = (unitType: string) => {
    setSelectedUnitTypes(prev => 
      prev.includes(unitType) 
        ? prev.filter(t => t !== unitType)
        : [...prev, unitType]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setDeveloperFilter("all");
    setSelectedUnitTypes([]);
    setMaxPrice("");
    setCompletionQuarter("");
    setSearchQuery("");
  };

  // Check if any filter is active
  const hasActiveFilters = statusFilter !== "all" || 
    typeFilter !== "all" ||
    developerFilter !== "all" || 
    selectedUnitTypes.length > 0 || 
    maxPrice !== "" || 
    completionQuarter !== "" ||
    searchQuery !== "";

  // Parse quarter string to Date for comparison (e.g., "Q2 2026" -> end of Q2 2026)
  const parseQuarterToDate = (quarterStr: string): Date | null => {
    const match = quarterStr.match(/Q(\d)\s*(\d{4})/i);
    if (!match) return null;
    const quarter = parseInt(match[1]);
    const year = parseInt(match[2]);
    // End of quarter: Q1 = March 31, Q2 = June 30, Q3 = Sep 30, Q4 = Dec 31
    const month = quarter * 3 - 1; // 0-indexed: Q1=2, Q2=5, Q3=8, Q4=11
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, lastDay);
  };

  // Filter properties
  const filteredProperties = properties.filter((property) => {
    // Basic filters
    if (statusFilter !== "all" && property.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== "all" && property.type !== typeFilter) {
      return false;
    }
    
    // Developer filter
    if (developerFilter !== "all" && property.developer_id !== developerFilter) {
      return false;
    }

    // Unit type and max price filter
    if (selectedUnitTypes.length > 0 || maxPrice) {
      const propertyUnits = unitPrices.filter(u => u.property_id === property.id);
      
      if (selectedUnitTypes.length > 0) {
        // Property must have at least one of the selected unit types
        const hasSelectedUnitType = propertyUnits.some(u => 
          selectedUnitTypes.includes(u.unit_type)
        );
        if (!hasSelectedUnitType) {
          return false;
        }
      }
      
      if (maxPrice) {
        const maxPriceNum = parseFloat(maxPrice);
        if (!isNaN(maxPriceNum)) {
          // Filter units by selected types (if any), then check price
          const relevantUnits = selectedUnitTypes.length > 0
            ? propertyUnits.filter(u => selectedUnitTypes.includes(u.unit_type))
            : propertyUnits;
          
          // Property must have at least one unit within budget
          const hasAffordableUnit = relevantUnits.some(u => 
            u.price_from !== null && u.price_from <= maxPriceNum
          );
          if (!hasAffordableUnit && relevantUnits.length > 0) {
            return false;
          }
        }
      }
    }

    // Completion quarter filter
    if (completionQuarter) {
      const targetDate = parseQuarterToDate(completionQuarter);
      const propertyDate = parseCompletionDate(property.completion_date);
      
      if (targetDate && propertyDate && propertyDate > targetDate) {
        return false;
      }
      // If property has no completion date, exclude it when filter is active
      if (!propertyDate && property.status !== "Ready") {
        return false;
      }
    }

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        property.name.toLowerCase().includes(query) ||
        property.area?.name.toLowerCase().includes(query) ||
        property.area?.city.toLowerCase().includes(query) ||
        property.developer?.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Ready":
        return "default";
      case "Off-plan":
        return "secondary";
      case "Under construction":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Ready":
        return "Dokončeno";
      case "Off-plan":
        return "Off-plan";
      case "Under construction":
        return "Ve výstavbě";
      default:
        return status;
    }
  };

  const uniqueStatuses = [...new Set(properties.map((p) => p.status))];
  const uniqueTypes = [...new Set(properties.map((p) => p.type))];

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={logoImage} alt="Logo" className="h-16 w-auto opacity-50" />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src={logoImage} alt="Dubaj Reality Logo" className="h-10 w-auto" />
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">
                {isObchodnik ? "Panel obchodníka" : "Můj účet"}
              </h1>
              <p className="text-xs text-muted-foreground">Dubaj Reality</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.email}
            </span>
            {isObchodnik && (
              <Badge variant="default" className="hidden sm:flex">
                Obchodník
              </Badge>
            )}
            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Web
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Odhlásit</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-background border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Moje poptávky
              </CardDescription>
              <CardTitle className="text-3xl text-primary">{myRequests.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-background border-border">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                Stažené brožury
              </CardDescription>
              <CardTitle className="text-3xl text-primary">{myDownloads.length}</CardTitle>
            </CardHeader>
          </Card>
          {isObchodnik && (
            <Card className="bg-background border-border">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Nemovitosti
                </CardDescription>
                <CardTitle className="text-3xl text-primary">{properties.length}</CardTitle>
              </CardHeader>
            </Card>
          )}
        </div>

        <Tabs defaultValue={isObchodnik ? "properties" : "requests"} className="space-y-6">
          <TabsList className="bg-background border border-border">
            <TabsTrigger value="requests" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Moje poptávky</span>
            </TabsTrigger>
            <TabsTrigger value="downloads" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Stažené brožury</span>
            </TabsTrigger>
            {isObchodnik && (
              <TabsTrigger value="properties" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Nemovitosti</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="">Moje poptávky</CardTitle>
                <CardDescription>
                  Přehled vašich odeslaných poptávek a zájmů o nemovitosti
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="mb-4">Zatím nemáte žádné poptávky</p>
                    <Button asChild>
                      <Link to="/nemovitosti">
                        Prohlédnout nemovitosti
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Datum</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Vybrané projekty</TableHead>
                          <TableHead>Rozpočet</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myRequests.map((request) => (
                          <TableRow key={request.id} className="border-border">
                            <TableCell>
                              {format(new Date(request.created_at), "dd.MM.yyyy", { locale: cs })}
                            </TableCell>
                            <TableCell>{request.request_type}</TableCell>
                            <TableCell>
                              {Array.isArray(request.selected_brochures) ? (
                                <div className="flex flex-wrap gap-1">
                                  {request.selected_brochures.map((id: string) => (
                                    <Badge key={id} variant="outline" className="text-xs">
                                      {propertyNames[id] || id}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>{request.budget || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Downloads Tab */}
          <TabsContent value="downloads" className="space-y-6">
            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="">Stažené brožury</CardTitle>
                <CardDescription>
                  Historie vašich stažených brožur a katalogů
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myDownloads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Download className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="mb-4">Zatím jste nestáhli žádné brožury</p>
                    <Button asChild>
                      <Link to="/nemovitosti">
                        Prohlédnout projekty
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Datum stažení</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Projekty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myDownloads.map((download) => (
                          <TableRow key={download.id} className="border-border">
                            <TableCell>
                              {format(new Date(download.downloaded_at), "dd.MM.yyyy HH:mm", { locale: cs })}
                            </TableCell>
                            <TableCell>{download.brochure_request?.request_type || "-"}</TableCell>
                            <TableCell>
                              {Array.isArray(download.brochure_request?.selected_brochures) ? (
                                <div className="flex flex-wrap gap-1">
                                  {download.brochure_request.selected_brochures.map((id: string) => (
                                    <Badge key={id} variant="outline" className="text-xs">
                                      {propertyNames[id] || id}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab - Only for Obchodnik */}
          {isObchodnik && (
            <TabsContent value="properties" className="space-y-6">
              <Card className="bg-background border-border">
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          Přehled nemovitostí
                        </CardTitle>
                        <CardDescription>
                          Rychlý přístup k nemovitostem a Dropbox složkám
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {filteredProperties.length} z {properties.length}
                        </span>
                        {hasActiveFilters && (
                          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                            Vymazat
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* All filters in one row */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Search */}
                      <div className="relative w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Hledat..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9 bg-card text-sm"
                        />
                      </div>

                      {/* Status filter */}
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] h-9 bg-background text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="all">Všechny statusy</SelectItem>
                          {uniqueStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Type filter */}
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[130px] h-9 bg-background text-sm">
                          <SelectValue placeholder="Typ" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="all">Všechny typy</SelectItem>
                          {uniqueTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Developer filter */}
                      <Select value={developerFilter} onValueChange={setDeveloperFilter}>
                        <SelectTrigger className="w-[160px] h-9 bg-background text-sm">
                          <SelectValue placeholder="Developer" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          <SelectItem value="all">Všichni developeři</SelectItem>
                          {developers.map((dev) => (
                            <SelectItem key={dev.id} value={dev.id}>
                              {dev.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Unit types filter */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn(
                            "h-9 gap-1 text-sm",
                            selectedUnitTypes.length > 0 && "border-primary text-primary"
                          )}>
                            <Home className="h-4 w-4" />
                            Jednotky
                            {selectedUnitTypes.length > 0 && (
                              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                {selectedUnitTypes.length}
                              </Badge>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-3 bg-background border border-border z-50" align="start">
                          <div className="space-y-2">
                            <p className="text-sm font-medium mb-2">Typy jednotek</p>
                            {unitTypes.map((unitType) => (
                              <label
                                key={unitType}
                                className="flex items-center gap-2 cursor-pointer text-sm hover:text-primary"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUnitTypes.includes(unitType)}
                                  onChange={() => toggleUnitType(unitType)}
                                  className="rounded border-border"
                                />
                                {unitType}
                              </label>
                            ))}
                            {unitTypes.length === 0 && (
                              <p className="text-xs text-muted-foreground">Žádné typy</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Max price filter */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn(
                            "h-9 gap-1 text-sm",
                            maxPrice && "border-primary text-primary"
                          )}>
                            <DollarSign className="h-4 w-4" />
                            {maxPrice ? `Max ${Number(maxPrice).toLocaleString()} USD` : "Max. cena"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3 bg-background border border-border z-50" align="start">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Maximální cena (USD)</p>
                            <Input
                              type="number"
                              placeholder="např. 2000000"
                              value={maxPrice}
                              onChange={(e) => setMaxPrice(e.target.value)}
                              className="h-9 text-sm"
                            />
                            {maxPrice && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full text-xs" 
                                onClick={() => setMaxPrice("")}
                              >
                                Vymazat
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Quarter completion filter */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn(
                            "h-9 gap-1 text-sm",
                            completionQuarter && "border-primary text-primary"
                          )}>
                            <Calendar className="h-4 w-4" />
                            {completionQuarter || "Dokončení"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 bg-background border border-border z-50" align="start">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => setQuarterPickerYear(prev => prev - 1)}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="font-medium">{quarterPickerYear}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => setQuarterPickerYear(prev => prev + 1)}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[1, 2, 3, 4].map((q) => {
                                const quarterValue = `Q${q} ${quarterPickerYear}`;
                                return (
                                  <Button
                                    key={q}
                                    variant={completionQuarter === quarterValue ? "default" : "outline"}
                                    size="sm"
                                    className="h-10"
                                    onClick={() => setCompletionQuarter(quarterValue)}
                                  >
                                    Q{q} {quarterPickerYear}
                                  </Button>
                                );
                              })}
                            </div>
                            {completionQuarter && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full text-xs" 
                                onClick={() => setCompletionQuarter("")}
                              >
                                Vymazat filtr
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Selected unit types badges */}
                      {selectedUnitTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedUnitTypes.map(type => (
                            <Badge key={type} variant="secondary" className="text-xs gap-1">
                              {type}
                              <button
                                onClick={() => toggleUnitType(type)}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredProperties.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Žádné nemovitosti nenalezeny</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead>Název</TableHead>
                            <TableHead>Developer</TableHead>
                            <TableHead>Oblast</TableHead>
                            <TableHead>Typ</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cena od</TableHead>
                            <TableHead>Dokončení</TableHead>
                            <TableHead className="text-right">Akce</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProperties.map((property) => (
                            <TableRow key={property.id} className="border-border">
                              <TableCell className="font-medium">
                                <Link 
                                  to={`/nemovitost/${property.slug}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {property.name}
                                </Link>
                              </TableCell>
                              <TableCell>{property.developer?.name || "-"}</TableCell>
                              <TableCell>
                                {property.area ? `${property.area.name}, ${property.area.city}` : "-"}
                              </TableCell>
                              <TableCell>{property.type}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(property.status)}>
                                  {getStatusLabel(property.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>{property.price_formatted || "-"}</TableCell>
                              <TableCell>{property.completion_date || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" variant="outline" asChild>
                                    <Link to={`/nemovitost/${property.slug}`}>
                                      <ExternalLink className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  {property.dropbox_folder_url && (
                                    <Button size="sm" variant="default" asChild>
                                      <a 
                                        href={property.dropbox_folder_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        title="Otevřít Dropbox složku"
                                      >
                                        <FolderOpen className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;
