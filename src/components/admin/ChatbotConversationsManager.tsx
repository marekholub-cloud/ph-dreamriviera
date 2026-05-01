import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Loader2, MessageCircle, Eye, RefreshCw, User, Bot, Clock, CheckCircle, AlertCircle, ArrowRight, Download, CalendarIcon } from "lucide-react";
import { format, formatDistanceToNow, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ChatbotConversation {
  id: string;
  session_id: string;
  status: string;
  branch: string | null;
  completed: boolean;
  handoff_to_human: boolean;
  messages: Array<{ role: string; content: string }>;
  investor_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function ChatbotConversationsManager() {
  const [conversations, setConversations] = useState<ChatbotConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<ChatbotConversation | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chatbot_conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Cast the data properly - handle Json types
      const typedData: ChatbotConversation[] = (data || []).map((item) => {
        const rawMessages = item.messages;
        const parsedMessages: Array<{ role: string; content: string }> = [];
        
        if (Array.isArray(rawMessages)) {
          for (const m of rawMessages) {
            if (m && typeof m === "object" && "role" in m && "content" in m) {
              parsedMessages.push({
                role: String((m as Record<string, unknown>).role),
                content: String((m as Record<string, unknown>).content),
              });
            }
          }
        }

        return {
          id: item.id,
          session_id: item.session_id,
          status: item.status,
          branch: item.branch,
          completed: item.completed ?? false,
          handoff_to_human: item.handoff_to_human ?? false,
          messages: parsedMessages,
          investor_data: (item.investor_data && typeof item.investor_data === "object" && !Array.isArray(item.investor_data))
            ? (item.investor_data as Record<string, unknown>)
            : null,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });

      setConversations(typedData);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst konverzace.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    // Status filter
    if (statusFilter !== "all" && conv.status !== statusFilter) {
      return false;
    }

    // Branch filter
    if (branchFilter !== "all") {
      if (branchFilter === "none" && conv.branch !== null) return false;
      if (branchFilter !== "none" && conv.branch !== branchFilter) return false;
    }

    // Date filter
    const convDate = new Date(conv.created_at);
    if (dateFrom && convDate < startOfDay(dateFrom)) {
      return false;
    }
    if (dateTo && convDate > endOfDay(dateTo)) {
      return false;
    }

    // Search in messages or investor data
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const messagesText = conv.messages.map((m) => m.content).join(" ").toLowerCase();
      const investorEmail = (conv.investor_data?.contact_email as string)?.toLowerCase() || "";
      const investorWhatsapp = (conv.investor_data?.contact_whatsapp as string)?.toLowerCase() || "";

      return (
        messagesText.includes(query) ||
        investorEmail.includes(query) ||
        investorWhatsapp.includes(query) ||
        conv.session_id.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Datum vytvoření",
      "Datum aktualizace",
      "Stav",
      "Větev",
      "Zpráv",
      "E-mail",
      "WhatsApp",
      "Preferovaný kontakt",
      "Typ investora",
      "Rozpočet",
      "Horizont",
      "Session ID",
    ];

    const rows = filteredConversations.map((conv) => [
      format(new Date(conv.created_at), "yyyy-MM-dd HH:mm:ss"),
      format(new Date(conv.updated_at), "yyyy-MM-dd HH:mm:ss"),
      conv.handoff_to_human ? "handoff" : conv.completed ? "completed" : conv.status,
      conv.branch || "",
      conv.messages.length,
      (conv.investor_data?.contact_email as string) || "",
      (conv.investor_data?.contact_whatsapp as string) || "",
      (conv.investor_data?.preferred_contact_method as string) || "",
      (conv.investor_data?.investor_type as string) || "",
      (conv.investor_data?.budget_amount as string) || "",
      (conv.investor_data?.horizon as string) || "",
      conv.session_id,
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chatbot-konverzace-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export dokončen",
      description: `Exportováno ${filteredConversations.length} konverzací`,
    });
  };

  const getStatusBadge = (status: string, completed: boolean, handoff: boolean) => {
    if (handoff) {
      return <Badge variant="destructive">Handoff</Badge>;
    }
    if (completed) {
      return <Badge className="bg-green-600">Dokončeno</Badge>;
    }
    if (status === "active") {
      return <Badge variant="secondary">Aktivní</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getBranchBadge = (branch: string | null) => {
    if (!branch) return <span className="text-muted-foreground text-xs">-</span>;
    if (branch === "quick") {
      return <Badge variant="outline" className="text-blue-500 border-blue-500">Rychlá</Badge>;
    }
    return <Badge variant="outline" className="text-purple-500 border-purple-500">Detailní</Badge>;
  };

  const stats = {
    total: conversations.length,
    active: conversations.filter((c) => c.status === "active" && !c.completed).length,
    completed: conversations.filter((c) => c.completed).length,
    handoff: conversations.filter((c) => c.handoff_to_human).length,
    quick: conversations.filter((c) => c.branch === "quick").length,
    detailed: conversations.filter((c) => c.branch === "detailed").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Celkem</CardDescription>
            <CardTitle className="text-xl font-semibold">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Aktivní</CardDescription>
            <CardTitle className="text-xl font-semibold text-yellow-500">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Dokončeno</CardDescription>
            <CardTitle className="text-xl font-semibold text-green-500">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Handoff</CardDescription>
            <CardTitle className="text-xl font-semibold text-red-500">{stats.handoff}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Rychlá</CardDescription>
            <CardTitle className="text-xl font-semibold text-blue-500">{stats.quick}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Detailní</CardDescription>
            <CardTitle className="text-xl font-semibold text-purple-500">{stats.detailed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-medium text-muted-foreground">Konverzace chatbota</CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">{filteredConversations.length} konverzací</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={fetchConversations}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Obnovit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat podle kontaktu, session ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Stav" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="active">Aktivní</SelectItem>
                  <SelectItem value="completed">Dokončeno</SelectItem>
                  <SelectItem value="handoff">Handoff</SelectItem>
                </SelectContent>
              </Select>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Větev" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny větve</SelectItem>
                  <SelectItem value="quick">Rychlá</SelectItem>
                  <SelectItem value="detailed">Detailní</SelectItem>
                  <SelectItem value="none">Nezvoleno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Date filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Od:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "d. M. yyyy", { locale: cs }) : "Vybrat datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={cs}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Do:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "d. M. yyyy", { locale: cs }) : "Vybrat datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={cs}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                >
                  Vymazat filtry
                </Button>
              )}
            </div>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Žádné konverzace k zobrazení</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Větev</TableHead>
                    <TableHead>Zpráv</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversations.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(conv.updated_at), "d. M. yyyy HH:mm", { locale: cs })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(conv.status, conv.completed, conv.handoff_to_human)}
                      </TableCell>
                      <TableCell>{getBranchBadge(conv.branch)}</TableCell>
                      <TableCell>{conv.messages.length}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {(conv.investor_data?.contact_email as string) ||
                          (conv.investor_data?.contact_whatsapp as string) ||
                          "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedConversation(conv)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[85vh]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <MessageCircle className="h-5 w-5" />
                                Detail konverzace
                              </DialogTitle>
                            </DialogHeader>
                            {selectedConversation && (
                              <Tabs defaultValue="messages" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                  <TabsTrigger value="messages">💬 Zprávy</TabsTrigger>
                                  <TabsTrigger value="timeline">📊 Timeline</TabsTrigger>
                                  <TabsTrigger value="data">📋 Data</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="messages" className="space-y-4 mt-4">
                                  <div className="flex flex-wrap gap-2">
                                    {getStatusBadge(
                                      selectedConversation.status,
                                      selectedConversation.completed,
                                      selectedConversation.handoff_to_human
                                    )}
                                    {getBranchBadge(selectedConversation.branch)}
                                    <span className="text-xs text-muted-foreground">
                                      Session: {selectedConversation.session_id.slice(0, 20)}...
                                    </span>
                                  </div>

                                  <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-3">
                                      {selectedConversation.messages.map((msg, i) => (
                                        <div
                                          key={i}
                                          className={`flex gap-2 ${
                                            msg.role === "user" ? "flex-row-reverse" : ""
                                          }`}
                                        >
                                          <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                              msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-secondary"
                                            }`}
                                          >
                                            {msg.role === "user" ? (
                                              <User className="w-4 h-4" />
                                            ) : (
                                              <Bot className="w-4 h-4" />
                                            )}
                                          </div>
                                          <div
                                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                              msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-secondary"
                                            }`}
                                          >
                                            {msg.content}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </TabsContent>
                                
                                <TabsContent value="timeline" className="space-y-4 mt-4">
                                  <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                                    <div className="space-y-6 pl-10">
                                      {/* Created event */}
                                      <div className="relative">
                                        <div className="absolute -left-6 w-4 h-4 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center">
                                          <Clock className="w-2 h-2 text-white" />
                                        </div>
                                        <div className="bg-secondary/50 rounded-lg p-3">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">Konverzace zahájena</span>
                                            <span className="text-xs text-muted-foreground">
                                              {format(new Date(selectedConversation.created_at), "d. M. yyyy HH:mm", { locale: cs })}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(new Date(selectedConversation.created_at), { addSuffix: true, locale: cs })}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {/* Branch selection */}
                                      {selectedConversation.branch && (
                                        <div className="relative">
                                          <div className="absolute -left-6 w-4 h-4 rounded-full bg-purple-500 border-2 border-background flex items-center justify-center">
                                            <ArrowRight className="w-2 h-2 text-white" />
                                          </div>
                                          <div className="bg-secondary/50 rounded-lg p-3">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-sm">Zvolena větev</span>
                                              {getBranchBadge(selectedConversation.branch)}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Messages count */}
                                      <div className="relative">
                                        <div className="absolute -left-6 w-4 h-4 rounded-full bg-gray-400 border-2 border-background flex items-center justify-center">
                                          <MessageCircle className="w-2 h-2 text-white" />
                                        </div>
                                        <div className="bg-secondary/50 rounded-lg p-3">
                                          <span className="font-medium text-sm">
                                            {selectedConversation.messages.length} zpráv vyměněno
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Contact captured */}
                                      {(selectedConversation.investor_data?.contact_email || selectedConversation.investor_data?.contact_whatsapp) && (
                                        <div className="relative">
                                          <div className="absolute -left-6 w-4 h-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                                            <User className="w-2 h-2 text-white" />
                                          </div>
                                          <div className="bg-secondary/50 rounded-lg p-3">
                                            <span className="font-medium text-sm">Kontakt získán</span>
                                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                              {selectedConversation.investor_data?.contact_email && (
                                                <div>📧 {String(selectedConversation.investor_data.contact_email)}</div>
                                              )}
                                              {selectedConversation.investor_data?.contact_whatsapp && (
                                                <div>📱 {String(selectedConversation.investor_data.contact_whatsapp)}</div>
                                              )}
                                              {selectedConversation.investor_data?.preferred_contact_method && (
                                                <div className="mt-1">
                                                  <Badge variant="outline" className="text-xs">
                                                    Preferuje: {String(selectedConversation.investor_data.preferred_contact_method)}
                                                  </Badge>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Completion / Handoff */}
                                      {selectedConversation.completed && (
                                        <div className="relative">
                                          <div className="absolute -left-6 w-4 h-4 rounded-full bg-green-600 border-2 border-background flex items-center justify-center">
                                            <CheckCircle className="w-2 h-2 text-white" />
                                          </div>
                                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-sm text-green-600">Profil dokončen</span>
                                              <span className="text-xs text-muted-foreground">
                                                {format(new Date(selectedConversation.updated_at), "d. M. yyyy HH:mm", { locale: cs })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {selectedConversation.handoff_to_human && !selectedConversation.completed && (
                                        <div className="relative">
                                          <div className="absolute -left-6 w-4 h-4 rounded-full bg-orange-500 border-2 border-background flex items-center justify-center">
                                            <AlertCircle className="w-2 h-2 text-white" />
                                          </div>
                                          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-sm text-orange-600">Předáno operátorovi</span>
                                              <span className="text-xs text-muted-foreground">
                                                {format(new Date(selectedConversation.updated_at), "d. M. yyyy HH:mm", { locale: cs })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Last activity */}
                                      {selectedConversation.updated_at !== selectedConversation.created_at && (
                                        <div className="relative">
                                          <div className="absolute -left-6 w-4 h-4 rounded-full bg-gray-500 border-2 border-background" />
                                          <div className="bg-secondary/30 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                              <span className="text-sm text-muted-foreground">Poslední aktivita</span>
                                              <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(selectedConversation.updated_at), { addSuffix: true, locale: cs })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="data" className="space-y-4 mt-4">
                                  {selectedConversation.investor_data && Object.keys(selectedConversation.investor_data).length > 0 ? (
                                    <Card className="bg-secondary/50">
                                      <CardHeader className="py-3">
                                        <CardTitle className="text-sm">Investorská data</CardTitle>
                                      </CardHeader>
                                      <CardContent className="py-2">
                                        <div className="grid grid-cols-2 gap-3">
                                          {Object.entries(selectedConversation.investor_data).map(([key, value]) => {
                                            if (value === null || value === undefined) return null;
                                            const labels: Record<string, string> = {
                                              investor_type: "Typ investora",
                                              experience: "Zkušenosti",
                                              goals: "Cíle",
                                              budget_amount: "Rozpočet",
                                              budget_currency: "Měna",
                                              financing: "Financování",
                                              expected_yield: "Očekávaný výnos",
                                              horizon: "Časový horizont",
                                              strategy: "Strategie",
                                              property_type: "Typ nemovitosti",
                                              offplan_ready: "Off-plan/Ready",
                                              payment_plan_preference: "Preference splátek",
                                              location_preference: "Lokalita",
                                              management_needed: "Správa na klíč",
                                              biggest_concern: "Největší obava",
                                              contact_whatsapp: "WhatsApp",
                                              contact_email: "E-mail",
                                              preferred_contact_method: "Preferovaný kontakt",
                                              gdpr_consent: "GDPR souhlas",
                                              completed: "Dokončeno",
                                              handoff_to_human: "Předáno",
                                            };
                                            return (
                                              <div key={key} className="flex flex-col border-b border-border/50 pb-2">
                                                <span className="text-xs text-muted-foreground">
                                                  {labels[key] || key}
                                                </span>
                                                <span className="text-sm font-medium">
                                                  {typeof value === "boolean" 
                                                    ? (value ? "✅ Ano" : "❌ Ne")
                                                    : Array.isArray(value)
                                                      ? value.join(", ")
                                                      : String(value)
                                                  }
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                      <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                      <p>Zatím nebyla získána žádná data</p>
                                    </div>
                                  )}
                                </TabsContent>
                              </Tabs>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
