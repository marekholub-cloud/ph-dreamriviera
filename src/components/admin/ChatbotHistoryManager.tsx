import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, MessageCircle, Bot, User, Phone, Calendar, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatConversation {
  id: string;
  session_id: string;
  lead_id: string | null;
  user_id: string | null;
  messages: ChatMessage[];
  investor_data: Record<string, unknown> | null;
  status: string;
  handoff_to_human: boolean;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export function ChatbotHistoryManager() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("chatbot_conversations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Type assertion since we know the shape from the database
      setConversations((data || []) as unknown as ChatConversation[]);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, handoff: boolean, completed: boolean) => {
    if (completed) {
      return <Badge className="bg-green-600 text-white">Dokončeno</Badge>;
    }
    if (handoff) {
      return <Badge className="bg-orange-500 text-white">Předáno operátorovi</Badge>;
    }
    if (status === "active") {
      return <Badge variant="outline" className="text-blue-500 border-blue-500">Aktivní</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getInvestorSummary = (data: Record<string, unknown> | null) => {
    if (!data) return null;
    
    const fields = [];
    if (data.investor_type) fields.push(`Typ: ${data.investor_type}`);
    if (data.budget_amount) fields.push(`Rozpočet: ${data.budget_amount} ${data.budget_currency || ''}`);
    if (data.horizon) fields.push(`Horizont: ${data.horizon}`);
    if (data.contact_whatsapp) fields.push(`WhatsApp: ${data.contact_whatsapp}`);
    if (data.contact_email) fields.push(`Email: ${data.contact_email}`);
    
    return fields;
  };

  const filteredConversations = conversations.filter(conv => {
    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "completed" && !conv.completed) return false;
      if (statusFilter === "handoff" && !conv.handoff_to_human) return false;
      if (statusFilter === "active" && (conv.completed || conv.handoff_to_human)) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const messagesText = conv.messages.map(m => m.content).join(" ").toLowerCase();
      const investorDataText = JSON.stringify(conv.investor_data || {}).toLowerCase();
      return messagesText.includes(query) || investorDataText.includes(query);
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Celkem konverzací
            </CardDescription>
            <CardTitle className="text-3xl">{conversations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-green-500" />
              Dokončeno
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {conversations.filter(c => c.completed).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-orange-500" />
              Předáno operátorovi
            </CardDescription>
            <CardTitle className="text-3xl text-orange-500">
              {conversations.filter(c => c.handoff_to_human).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Dnes
            </CardDescription>
            <CardTitle className="text-3xl text-blue-500">
              {conversations.filter(c => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return new Date(c.created_at) >= today;
              }).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <CardTitle className="">Historie konverzací chatbota</CardTitle>
              <CardDescription>
                {filteredConversations.length} z {conversations.length} konverzací
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                Vše
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
              >
                Dokončeno
              </Button>
              <Button
                variant={statusFilter === "handoff" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("handoff")}
              >
                Předáno
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
              >
                Aktivní
              </Button>
            </div>
          </div>
          
          <div className="relative max-w-md mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat v konverzacích..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Žádné konverzace</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConversations.map((conv) => {
                const isExpanded = expandedId === conv.id;
                const investorSummary = getInvestorSummary(conv.investor_data);
                
                return (
                  <Card key={conv.id} className="bg-secondary/30">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">
                              {format(new Date(conv.created_at), "d. MMMM yyyy, HH:mm", { locale: cs })}
                            </span>
                            {getStatusBadge(conv.status, conv.handoff_to_human, conv.completed)}
                          </div>
                          
                          {/* Preview of first user message */}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {conv.messages.find(m => m.role === "user")?.content || "Začátek konverzace"}
                          </p>
                          
                          {/* Investor data summary */}
                          {investorSummary && investorSummary.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {investorSummary.slice(0, 3).map((field, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {conv.messages.length} zpráv
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-border"
                          >
                            {/* Full investor data */}
                            {conv.investor_data && Object.keys(conv.investor_data).length > 0 && (
                              <div className="mb-4 p-3 bg-card rounded-lg border">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Investorský profil
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {Object.entries(conv.investor_data).map(([key, value]) => {
                                    if (!value || key === 'completed' || key === 'handoff_to_human') return null;
                                    return (
                                      <div key={key} className="flex flex-col">
                                        <span className="text-muted-foreground text-xs capitalize">
                                          {key.replace(/_/g, ' ')}
                                        </span>
                                        <span className="font-medium">
                                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* WhatsApp button */}
                                {conv.investor_data.contact_whatsapp && (
                                  <Button
                                    size="sm"
                                    className="mt-3 bg-green-600 hover:bg-green-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const phone = String(conv.investor_data?.contact_whatsapp).replace(/\D/g, '');
                                      window.open(`https://wa.me/${phone}`, "_blank");
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Kontaktovat na WhatsApp
                                  </Button>
                                )}
                              </div>
                            )}
                            
                            {/* Messages */}
                            <ScrollArea className="h-[300px]">
                              <div className="space-y-3">
                                {conv.messages.map((msg, i) => (
                                  <div 
                                    key={i} 
                                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                                  >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      msg.role === "user" ? "bg-primary/20" : "bg-muted"
                                    }`}>
                                      {msg.role === "user" ? (
                                        <User className="w-3 h-3 text-primary" />
                                      ) : (
                                        <Bot className="w-3 h-3 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                      msg.role === "user" 
                                        ? "bg-primary text-primary-foreground" 
                                        : "bg-muted"
                                    }`}>
                                      {msg.content}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
