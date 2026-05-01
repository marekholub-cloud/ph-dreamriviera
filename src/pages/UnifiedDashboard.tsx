import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Mail, Phone, User, Search, Filter, Users, BarChart3, FileText, MessageSquare, TrendingUp, ExternalLink, ChevronDown, ChevronUp, Construction } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoImage from "@/assets/logo-white.png";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { DevelopersManager } from "@/components/admin/DevelopersManager";
import { AreasManager } from "@/components/admin/AreasManager";
import { PropertiesManager } from "@/components/admin/PropertiesManager";
import { PropertyImporter } from "@/components/admin/PropertyImporter";
import { XMLPropertyImporter } from "@/components/admin/XMLPropertyImporter";
import { UnitPricesManager } from "@/components/admin/UnitPricesManager";
import { UnitTypesManager } from "@/components/admin/UnitTypesManager";
import { UserRolesManager } from "@/components/admin/UserRolesManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { ContactsAssignmentManager } from "@/components/admin/ContactsAssignmentManager";
import { EventsManager } from "@/components/admin/EventsManager";
import EmailTemplatesManager from "@/components/admin/EmailTemplatesManager";
import { StatsDashboard } from "@/components/admin/StatsDashboard";
import { ChatbotConversationsManager } from "@/components/admin/ChatbotConversationsManager";
import { ChatbotSettingsManager } from "@/components/admin/ChatbotSettingsManager";
import ConsultationSlotsManager from "@/components/admin/ConsultationSlotsManager";
import { RentalPropertiesManager } from "@/components/admin/RentalPropertiesManager";
import { RentalStatsManager } from "@/components/admin/RentalStatsManager";
import { RentalReservationsManager } from "@/components/admin/RentalReservationsManager";
import { RentalAmenitiesManager } from "@/components/admin/RentalAmenitiesManager";
import { RentalReviewsManager } from "@/components/admin/RentalReviewsManager";
import { RentalPayoutsManager } from "@/components/admin/RentalPayoutsManager";
import { SuperhostManager } from "@/components/admin/SuperhostManager";
import { MyRentalsSection } from "@/components/dashboard/MyRentalsSection";
import { MyRentalReservationsSection } from "@/components/dashboard/MyRentalReservationsSection";
import { MyGuestStaysSection } from "@/components/dashboard/MyGuestStaysSection";
import { MyPayoutsSection } from "@/components/dashboard/MyPayoutsSection";
import { SuperhostStatusSection } from "@/components/dashboard/SuperhostStatusSection";
import { MyWishlistSection } from "@/components/dashboard/MyWishlistSection";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminSection, AdminTab } from "@/components/admin/AdminSidebar";
import { useRoleBasedSections } from "@/hooks/useRoleBasedSections";
import { MyLeadsSection } from "@/components/admin/MyLeadsSection";
import { AllLeadsSection } from "@/components/admin/AllLeadsSection";
import { MyProfileSection } from "@/components/dashboard/MyProfileSection";
import { UserRegistrationManager } from "@/components/admin/UserRegistrationManager";
import { SeniorObchodnikDashboard } from "@/components/dashboard/SeniorObchodnikDashboard";
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

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  affiliate_code?: string | null;
}

interface Client {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface DownloadStats {
  total_downloads: number;
  unique_requests: number;
  downloads_today: number;
}

interface PropertyDownloadStat {
  propertyId: string;
  propertyName: string;
  downloadCount: number;
}

// Placeholder component for sections not yet implemented
const PlaceholderSection = ({ title, description }: { title: string; description: string }) => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
      <Construction className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </CardContent>
  </Card>
);

const UnifiedDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { sections, getDefaultSection, getDefaultTab } = useRoleBasedSections();
  
  const [requests, setRequests] = useState<BrochureRequest[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [propertyDownloads, setPropertyDownloads] = useState<PropertyDownloadStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  // Navigation state - initialize with role-appropriate defaults
  const [activeSection, setActiveSection] = useState<AdminSection>(getDefaultSection());
  const [activeTab, setActiveTab] = useState<AdminTab>(getDefaultTab());

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      // Fetch brochure requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("brochure_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

      // Fetch contact messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;
      setContactMessages(messagesData || []);

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch download statistics
      const { data: downloadsData, error: downloadsError } = await supabase
        .from("catalog_downloads")
        .select("id, brochure_request_id, downloaded_at");

      if (downloadsError) throw downloadsError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        total_downloads: downloadsData?.length || 0,
        unique_requests: new Set(downloadsData?.map(d => d.brochure_request_id)).size || 0,
        downloads_today: downloadsData?.filter(d => 
          new Date(d.downloaded_at) >= today
        ).length || 0,
      };

      setStats(stats);

      // Fetch properties for name mapping
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name");

      const propertyNameMap: Record<string, string> = {};
      propertiesData?.forEach((p) => {
        propertyNameMap[p.id] = p.name;
      });

      // Count downloads per property from brochure_requests
      const propertyCountMap: Record<string, number> = {};
      requestsData?.forEach((req) => {
        const brochures = req.selected_brochures;
        if (Array.isArray(brochures)) {
          brochures.forEach((id: string) => {
            if (id && typeof id === "string") {
              propertyCountMap[id] = (propertyCountMap[id] || 0) + 1;
            }
          });
        }
      });

      const propDownloads: PropertyDownloadStat[] = Object.entries(propertyCountMap)
        .map(([propertyId, downloadCount]) => ({
          propertyId,
          propertyName: propertyNameMap[propertyId] || propertyId,
          downloadCount,
        }))
        .sort((a, b) => b.downloadCount - a.downloadCount);

      setPropertyDownloads(propDownloads);
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

  // Filter and search logic for requests
  const filteredRequests = requests.filter(request => {
    if (projectFilter !== "all" && request.request_type !== projectFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.name.toLowerCase().includes(query) ||
        request.email.toLowerCase().includes(query) ||
        request.phone.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Filter contact messages
  const filteredMessages = contactMessages.filter(msg => {
    if (messageSearchQuery) {
      const query = messageSearchQuery.toLowerCase();
      return (
        msg.name.toLowerCase().includes(query) ||
        msg.email.toLowerCase().includes(query) ||
        msg.message.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Filter clients
  const filteredClients = clients.filter(client => {
    if (clientSearchQuery) {
      const query = clientSearchQuery.toLowerCase();
      return (
        client.email.toLowerCase().includes(query) ||
        (client.name && client.name.toLowerCase().includes(query)) ||
        (client.phone && client.phone.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ["Jméno", "Email", "Telefon", "Typ", "Vytvořeno", "Vybrané brožury", "Typ investice", "Rozpočet", "Časový horizont"];
    
    const rows = filteredRequests.map(req => [
      req.name,
      req.email,
      req.phone,
      req.request_type,
      format(new Date(req.created_at), "dd.MM.yyyy HH:mm", { locale: cs }),
      Array.isArray(req.selected_brochures) ? req.selected_brochures.join("; ") : "-",
      req.investment_type || "-",
      req.budget || "-",
      req.timeline || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `brochure-requests-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export dokončen",
      description: "Data byla úspěšně exportována do CSV souboru.",
    });
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hero: "Hero stránka",
      homepage: "Homepage",
      catalog: "Katalog",
      brochure: "Brožura",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={logoImage} alt="Logo" className="h-16 w-auto opacity-50" />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      // PROFILE SECTION (all users)
      case 'my-profile':
        return <MyProfileSection />;

      // SYSTEM SECTION (admin only)
      case 'roles':
        return isAdmin ? <UserRolesManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'email-templates':
        return isAdmin ? <EmailTemplatesManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'chatbot-settings':
        return isAdmin ? <ChatbotSettingsManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;

      // USERS SECTION (admin only)
      case 'users-list':
        return isAdmin ? <UsersManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'user-registration':
        return isAdmin ? <UserRegistrationManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;

      // CONTENT SECTION (admin only)
      case 'properties':
        return isAdmin ? <PropertiesManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'developers':
        return isAdmin ? <DevelopersManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'areas':
        return isAdmin ? <AreasManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'unit-types':
        return isAdmin ? <UnitTypesManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'unit-prices':
        return isAdmin ? <UnitPricesManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'import':
        return isAdmin ? (
          <div className="space-y-8">
            <XMLPropertyImporter />
            <PropertyImporter />
          </div>
        ) : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;

      // LEADS SECTION
      case 'leads-list':
        return isAdmin ? <AllLeadsSection /> : <MyLeadsSection />;
      case 'warmth':
        return isAdmin ? <AllLeadsSection /> : <MyLeadsSection />;
      case 'messages':
        if (!isAdmin) {
          return <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
        }
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="">Kontaktní dotazy</CardTitle>
                      <CardDescription>
                        Celkem {filteredMessages.length} dotazů
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Hledat v dotazech..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="pl-10 bg-card"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Žádné kontaktní dotazy</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.slice(0, 20).map((msg) => (
                      <Card key={msg.id} className="bg-secondary/50">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-primary" />
                                <span className="font-medium">{msg.name}</span>
                                {msg.affiliate_code && (
                                  <Badge variant="outline" className="text-xs">
                                    ref: {msg.affiliate_code}
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3" />
                                  <a href={`mailto:${msg.email}`} className="hover:text-foreground transition-colors">
                                    {msg.email}
                                  </a>
                                </div>
                                {msg.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    <a href={`tel:${msg.phone}`} className="hover:text-foreground transition-colors">
                                      {msg.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80 bg-background/50 rounded-lg p-3 border border-border/50">
                                {msg.message}
                              </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(msg.created_at), "dd.MM.yyyy", { locale: cs })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 'requests':
        if (!isAdmin) {
          return <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
        }
        return (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="">Požadavky na brožury</CardTitle>
                    <CardDescription>
                      Celkem {filteredRequests.length} požadavků
                    </CardDescription>
                  </div>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Hledat..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-card"
                    />
                  </div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtr podle typu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všechny typy</SelectItem>
                      <SelectItem value="hero">Hero stránka</SelectItem>
                      <SelectItem value="homepage">Homepage</SelectItem>
                      <SelectItem value="catalog">Katalog</SelectItem>
                      <SelectItem value="brochure">Brožura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Žádné požadavky na brožury</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jméno</TableHead>
                        <TableHead>Kontakt</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Detaily</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.slice(0, 50).map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <a href={`mailto:${req.email}`} className="text-sm text-primary hover:underline block">
                                {req.email}
                              </a>
                              <a href={`tel:${req.phone}`} className="text-sm text-muted-foreground hover:text-foreground block">
                                {req.phone}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getRequestTypeLabel(req.request_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(req.created_at), "dd.MM.yyyy HH:mm", { locale: cs })}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {req.investment_type && <div>Investice: {req.investment_type}</div>}
                              {req.budget && <div>Rozpočet: {req.budget}</div>}
                              {req.timeline && <div>Horizont: {req.timeline}</div>}
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
        );
      case 'chatbot-history':
        return <ChatbotConversationsManager />;
      case 'consultations':
        return <ConsultationSlotsManager />;

      // RENTALS – host (own data, all roles)
      case 'my-rentals':
        return <MyRentalsSection />;
      case 'my-rental-reservations':
        return <MyRentalReservationsSection />;
      case 'my-stays':
        return <MyGuestStaysSection />;
      case 'my-payouts':
        return <MyPayoutsSection />;
      case 'my-superhost':
        return <SuperhostStatusSection />;
      case 'my-wishlist':
        return <MyWishlistSection />;

      // RENTALS – admin
      case 'rental-properties':
        return isAdmin ? <RentalPropertiesManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'rental-reservations':
        return isAdmin ? <RentalReservationsManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'rental-amenities':
        return isAdmin ? <RentalAmenitiesManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'rental-reviews':
        return isAdmin ? <RentalReviewsManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'rental-payouts':
        return isAdmin ? <RentalPayoutsManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'rental-superhosts':
        return isAdmin ? <SuperhostManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;
      case 'rental-stats':
        return isAdmin ? <RentalStatsManager /> : <PlaceholderSection title="Přístup odepřen" description="Nemáte oprávnění k zobrazení této sekce." />;

      // STATS SECTION
      case 'network':
        return <StatsDashboard />;
      case 'affiliate-analytics':
        return <PlaceholderSection title="Affiliate analytika" description="Statistiky výkonu affiliate kampaní." />;
      case 'conversions':
        return <PlaceholderSection title="Konverzní funnely" description="Vizualizace konverzních funnelů od leadu k uzavřenému obchodu." />;
      case 'revenue':
        return <PlaceholderSection title="Projekce příjmů" description="Odhady budoucích příjmů na základě aktuálních leadů a konverzí." />;

      default:
        return (
          <PlaceholderSection 
            title="Sekce nenalezena" 
            description="Tato sekce ještě nebyla implementována."
          />
        );
    }
  };

  return (
    <AdminLayout
      activeSection={activeSection}
      activeTab={activeTab}
      onSectionChange={setActiveSection}
      onTabChange={setActiveTab}
    >
      {renderContent()}
    </AdminLayout>
  );
};

export default UnifiedDashboard;
