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
import { UserRolesManager } from "@/components/admin/UserRolesManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { ContactsAssignmentManager } from "@/components/admin/ContactsAssignmentManager";
import { EventsManager } from "@/components/admin/EventsManager";
import EmailTemplatesManager from "@/components/admin/EmailTemplatesManager";
import { ChatbotHistoryManager } from "@/components/admin/ChatbotHistoryManager";
import { ChatbotConversationsManager } from "@/components/admin/ChatbotConversationsManager";
import { StatsDashboard } from "@/components/admin/StatsDashboard";
import { AffiliateAnalytics } from "@/components/admin/AffiliateAnalytics";
import { UserRegistrationManager } from "@/components/admin/UserRegistrationManager";
import { ChatbotSettingsManager } from "@/components/admin/ChatbotSettingsManager";
import { RentalPropertiesManager } from "@/components/admin/RentalPropertiesManager";
import { RentalStatsManager } from "@/components/admin/RentalStatsManager";
import { RentalReservationsManager } from "@/components/admin/RentalReservationsManager";
import { MyRentalsSection } from "@/components/dashboard/MyRentalsSection";
import { MyRentalReservationsSection } from "@/components/dashboard/MyRentalReservationsSection";
import { MyPayoutsSection } from "@/components/dashboard/MyPayoutsSection";
import { RentalPayoutsManager } from "@/components/admin/RentalPayoutsManager";
import { SuperhostStatusSection } from "@/components/dashboard/SuperhostStatusSection";
import { SuperhostManager } from "@/components/admin/SuperhostManager";
import { MyGuestStaysSection } from "@/components/dashboard/MyGuestStaysSection";
import { MyWishlistSection } from "@/components/dashboard/MyWishlistSection";
import { RentalAmenitiesManager } from "@/components/admin/RentalAmenitiesManager";
import { RentalReviewsManager } from "@/components/admin/RentalReviewsManager";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminSection, AdminTab } from "@/components/admin/AdminSidebar";
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

const AdminDashboard = () => {
  const { user } = useAuth();
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
  
  // Navigation state
  const [activeSection, setActiveSection] = useState<AdminSection>('leads');
  const [activeTab, setActiveTab] = useState<AdminTab>('messages');

  useEffect(() => {
    fetchData();
  }, []);

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
      // SYSTEM SECTION
      case 'roles':
        return <UserRolesManager />;
      case 'email-templates':
        return <EmailTemplatesManager />;
      case 'chatbot-settings':
        return <ChatbotSettingsManager />;

      // RENTALS SECTION
      case 'my-rentals':
        return <MyRentalsSection />;
      case 'my-rental-reservations':
        return <MyRentalReservationsSection />;
      case 'my-stays':
        return <MyGuestStaysSection />;
      case 'my-payouts':
        return <MyPayoutsSection />;
      case 'rental-properties':
        return <RentalPropertiesManager />;
      case 'rental-reservations':
        return <RentalReservationsManager />;
      case 'rental-amenities':
        return <RentalAmenitiesManager />;
      case 'rental-reviews':
        return <RentalReviewsManager />;
      case 'rental-payouts':
        return <RentalPayoutsManager />;
      case 'my-superhost':
        return <SuperhostStatusSection />;
      case 'my-wishlist':
        return <MyWishlistSection />;
      case 'rental-superhosts':
        return <SuperhostManager />;
      case 'rental-stats':
        return <RentalStatsManager />;

      // USERS SECTION
      case 'users-list':
        return <UsersManager />;
      case 'user-registration':
        return <UserRegistrationManager />;

      // CONTENT SECTION
      case 'properties':
        return <PropertiesManager />;
      case 'developers':
        return <DevelopersManager />;
      case 'areas':
        return <AreasManager />;
      case 'unit-prices':
        return <UnitPricesManager />;
      case 'import':
        return (
          <div className="space-y-6">
            <XMLPropertyImporter />
            <PropertyImporter />
          </div>
        );

      // LEADS SECTION
      case 'messages':
        return (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-admin-leads/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-admin-leads" />
                    Dotazy
                  </CardDescription>
                  <CardTitle className="text-3xl text-admin-leads">{contactMessages.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-admin-leads/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-admin-leads" />
                    Požadavky
                  </CardDescription>
                  <CardTitle className="text-3xl text-admin-leads">{requests.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-admin-leads/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-admin-leads" />
                    Klienti
                  </CardDescription>
                  <CardTitle className="text-3xl text-admin-leads">{clients.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-admin-leads/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-admin-leads" />
                    Stažení dnes
                  </CardDescription>
                  <CardTitle className="text-3xl text-admin-leads">{stats?.downloads_today || 0}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Messages List */}
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
                    {filteredMessages.map((msg) => (
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
                              <p className="text-sm bg-card p-3 rounded-lg border border-border">
                                {msg.message}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(msg.created_at), "d. MMMM yyyy", { locale: cs })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(msg.created_at), "HH:mm", { locale: cs })}
                              </p>
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

      case 'chatbot-history':
        return <ChatbotConversationsManager />;

      case 'requests':
        return (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="">Požadavky na brožury</CardTitle>
                    <CardDescription>
                      Celkem {filteredRequests.length} požadavků
                    </CardDescription>
                  </div>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Hledat podle jména, emailu nebo telefonu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-card"
                    />
                  </div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-card">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filtrovat" />
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Jméno</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Investice</TableHead>
                      <TableHead>Datum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id} className="border-border">
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell>
                          <a 
                            href={`mailto:${request.email}`} 
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {request.email}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <a 
                            href={`tel:${request.phone}`} 
                            className="hover:text-primary transition-colors"
                          >
                            {request.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getRequestTypeLabel(request.request_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.investment_type && (
                            <span className="text-sm text-muted-foreground">
                              {request.investment_type}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(request.created_at), "d. MMM yyyy", { locale: cs })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      case 'warmth':
        return (
          <PlaceholderSection 
            title="Warmth Tracking" 
            description="Sledování úrovně zájmu leadů a automatické hodnocení."
          />
        );

      // STATS SECTION
      case 'affiliate-analytics':
        return <AffiliateAnalytics />;
      case 'network':
      case 'conversions':
      case 'revenue':
        return <StatsDashboard />;

      default:
        return (
          <PlaceholderSection 
            title="Sekce" 
            description="Tato sekce je ve vývoji."
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

export default AdminDashboard;
