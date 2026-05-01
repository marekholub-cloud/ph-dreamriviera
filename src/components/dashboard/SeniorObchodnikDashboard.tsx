import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  Users,
  TrendingUp,
  Target,
  DollarSign,
  Award,
  Eye,
  MessageSquarePlus,
  ArrowRightLeft,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Loader2,
  ChevronRight,
  FileText,
  Star,
} from "lucide-react";

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  leadsCount: number;
  closedDeals: number;
  conversionRate: number;
  totalValue: number;
}

interface Lead {
  id: string;
  lead_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  warmth_level: number;
  property_value: number | null;
  assigned_obchodnik_id: string | null;
  assigned_obchodnik_name?: string;
  created_at: string;
  updated_at: string;
}

interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  author_name: string | null;
  author_role: string;
  note_type: string;
  created_at: string;
}

interface ClientProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  investment_experience: string | null;
  risk_tolerance: string | null;
  budget_min: number | null;
  budget_max: number | null;
  investment_horizon: string | null;
  target_markets: string[] | null;
  notes: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  influencer: { label: "Nový", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  personal: { label: "V jednání", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  supertip: { label: "Kvalifikovaný", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  qualified: { label: "Kvalifikovaný", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  meeting_scheduled: { label: "Schůzka", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  offer_sent: { label: "Nabídka", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  closed_won: { label: "Uzavřeno ✓", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  closed_lost: { label: "Ztraceno", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function SeniorObchodnikDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [reassignTo, setReassignTo] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch all leads (senior obchodnik can see all)
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;

      // Get unique obchodnik IDs from leads
      const obchodnikIds = [...new Set(
        (leadsData || [])
          .filter(l => l.assigned_obchodnik_id)
          .map(l => l.assigned_obchodnik_id)
      )];

      // Fetch obchodnik profiles
      let obchodnikProfiles: Record<string, { full_name: string | null; email: string; avatar_url: string | null }> = {};
      if (obchodnikIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", obchodnikIds);

        if (profiles) {
          profiles.forEach(p => {
            obchodnikProfiles[p.id] = { full_name: p.full_name, email: p.email, avatar_url: p.avatar_url };
          });
        }
      }

      // Enrich leads with obchodnik names
      const enrichedLeads = (leadsData || []).map(lead => ({
        ...lead,
        assigned_obchodnik_name: lead.assigned_obchodnik_id 
          ? obchodnikProfiles[lead.assigned_obchodnik_id]?.full_name || obchodnikProfiles[lead.assigned_obchodnik_id]?.email || "Nepřiřazeno"
          : "Nepřiřazeno"
      }));

      setLeads(enrichedLeads);

      // Calculate team member stats
      const memberStats: Record<string, TeamMember> = {};
      enrichedLeads.forEach(lead => {
        if (lead.assigned_obchodnik_id) {
          if (!memberStats[lead.assigned_obchodnik_id]) {
            const profile = obchodnikProfiles[lead.assigned_obchodnik_id];
            memberStats[lead.assigned_obchodnik_id] = {
              id: lead.assigned_obchodnik_id,
              full_name: profile?.full_name || null,
              email: profile?.email || "",
              avatar_url: profile?.avatar_url || null,
              leadsCount: 0,
              closedDeals: 0,
              conversionRate: 0,
              totalValue: 0,
            };
          }
          memberStats[lead.assigned_obchodnik_id].leadsCount++;
          if (lead.status === "closed_won") {
            memberStats[lead.assigned_obchodnik_id].closedDeals++;
            memberStats[lead.assigned_obchodnik_id].totalValue += lead.property_value || 0;
          }
        }
      });

      // Calculate conversion rates
      Object.values(memberStats).forEach(member => {
        member.conversionRate = member.leadsCount > 0 
          ? Math.round((member.closedDeals / member.leadsCount) * 100) 
          : 0;
      });

      setTeamMembers(Object.values(memberStats).sort((a, b) => b.closedDeals - a.closedDeals));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailDialog(true);

    try {
      // Fetch notes for this lead
      const { data: notesData } = await supabase
        .from("lead_notes_with_author")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      setLeadNotes(notesData || []);

      // Fetch client profile if exists
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("source_lead_id", lead.id)
        .maybeSingle();

      setClientProfile(clientData);
    } catch (error) {
      console.error("Error fetching lead details:", error);
    }
  };

  const handleReassignLead = async () => {
    if (!selectedLead || !reassignTo) return;

    try {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_obchodnik_id: reassignTo })
        .eq("id", selectedLead.id);

      if (error) throw error;

      toast({
        title: "Lead přeřazen",
        description: "Lead byl úspěšně přeřazen jinému obchodníkovi."
      });

      setShowReassignDialog(false);
      setReassignTo("");
      fetchDashboardData();
    } catch (error) {
      console.error("Error reassigning lead:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přeřadit lead.",
        variant: "destructive"
      });
    }
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNote.trim()) return;

    try {
      const { error } = await supabase
        .from("lead_notes")
        .insert({
          lead_id: selectedLead.id,
          author_id: user?.id,
          content: newNote.trim(),
          note_type: "managerial",
          author_role: "senior_obchodnik",
          is_internal: true
        });

      if (error) throw error;

      toast({
        title: "Poznámka přidána",
        description: "Manažerská poznámka byla úspěšně přidána."
      });

      setShowNoteDialog(false);
      setNewNote("");
      
      // Refresh notes
      fetchLeadDetails(selectedLead);
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat poznámku.",
        variant: "destructive"
      });
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    if (filterStatus !== "all" && lead.status !== filterStatus) return false;
    if (filterAgent !== "all" && lead.assigned_obchodnik_id !== filterAgent) return false;
    return true;
  });

  // Calculate summary stats
  const totalLeads = leads.length;
  const closedWon = leads.filter(l => l.status === "closed_won").length;
  const inProgress = leads.filter(l => !["closed_won", "closed_lost"].includes(l.status)).length;
  const totalValue = leads.filter(l => l.status === "closed_won").reduce((sum, l) => sum + (l.property_value || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Team Dashboard</h2>
          <p className="text-muted-foreground">Přehled výkonu týmu a správa leadů</p>
        </div>
        <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Award className="h-3 w-3 mr-1" />
          Senior Obchodník
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Celkem leadů</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalLeads}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{inProgress} aktivních</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Uzavřené obchody</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-500">{closedWon}</div>
              <Progress value={conversionRate} className="h-1.5 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">{conversionRate}% konverze</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Celková hodnota</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {new Intl.NumberFormat("cs-CZ", { notation: "compact", maximumFractionDigits: 1 }).format(totalValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">USD v uzavřených obchodech</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Členů týmu</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{teamMembers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Aktivních obchodníků</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="team" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Tým
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Leady
          </TabsTrigger>
        </TabsList>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Přehled týmu
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Zatím nejsou přiřazeni žádní obchodníci</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                              <Star className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {member.full_name || member.email}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{member.leadsCount}</p>
                          <p className="text-xs text-muted-foreground">Leadů</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-500">{member.closedDeals}</p>
                          <p className="text-xs text-muted-foreground">Uzavřeno</p>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className={`h-4 w-4 ${member.conversionRate >= 20 ? "text-emerald-500" : "text-amber-500"}`} />
                            <span className={`text-lg font-bold ${member.conversionRate >= 20 ? "text-emerald-500" : "text-amber-500"}`}>
                              {member.conversionRate}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Konverze</p>
                        </div>
                        <div className="text-center min-w-[100px]">
                          <p className="text-lg font-bold text-foreground">
                            {new Intl.NumberFormat("cs-CZ", { notation: "compact" }).format(member.totalValue)}
                          </p>
                          <p className="text-xs text-muted-foreground">USD hodnota</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Všechny leady
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všechny statusy</SelectItem>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterAgent} onValueChange={setFilterAgent}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Obchodník" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všichni obchodníci</SelectItem>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Obchodník</TableHead>
                      <TableHead>Hodnota</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.slice(0, 20).map((lead) => {
                      const config = statusConfig[lead.status] || statusConfig.influencer;
                      return (
                        <TableRow key={lead.id} className="hover:bg-muted/20">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{lead.lead_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(lead.created_at), "d. MMM yyyy", { locale: cs })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${config.color} border`}>
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                  {lead.assigned_obchodnik_name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                {lead.assigned_obchodnik_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.property_value ? (
                              <span className="font-medium text-foreground">
                                {new Intl.NumberFormat("cs-CZ").format(lead.property_value)} USD
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => fetchLeadDetails(lead)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowNoteDialog(true);
                                }}
                              >
                                <MessageSquarePlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowReassignDialog(true);
                                }}
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredLeads.length > 20 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Zobrazeno 20 z {filteredLeads.length} leadů
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedLead?.lead_name}
            </DialogTitle>
            <DialogDescription>
              Detail leadu a historie komunikace
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedLead.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefon</p>
                  <p className="font-medium">{selectedLead.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`${statusConfig[selectedLead.status]?.color || ""} border`}>
                    {statusConfig[selectedLead.status]?.label || selectedLead.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hodnota</p>
                  <p className="font-medium">
                    {selectedLead.property_value 
                      ? `${new Intl.NumberFormat("cs-CZ").format(selectedLead.property_value)} USD`
                      : "—"
                    }
                  </p>
                </div>
              </div>

              <Separator />

              {/* Client Profile (read-only) */}
              {clientProfile && (
                <>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Investorský profil
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Investiční zkušenosti</p>
                        <p>{clientProfile.investment_experience || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tolerance rizika</p>
                        <p>{clientProfile.risk_tolerance || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Budget</p>
                        <p>
                          {clientProfile.budget_min && clientProfile.budget_max
                            ? `${new Intl.NumberFormat("cs-CZ").format(clientProfile.budget_min)} - ${new Intl.NumberFormat("cs-CZ").format(clientProfile.budget_max)} USD`
                            : "—"
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Investiční horizont</p>
                        <p>{clientProfile.investment_horizon || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Notes Timeline */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Historie poznámek
                </h4>
                {leadNotes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Zatím žádné poznámky</p>
                ) : (
                  <div className="space-y-3">
                    {leadNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-3 rounded-lg border ${
                          note.note_type === "managerial" 
                            ? "bg-amber-500/10 border-amber-500/30" 
                            : "bg-muted/30 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {note.author_name || "Systém"}
                            </span>
                            {note.note_type === "managerial" && (
                              <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                                Manažerská
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "d. MMM yyyy HH:mm", { locale: cs })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přeřadit lead</DialogTitle>
            <DialogDescription>
              Vyberte obchodníka, kterému chcete lead přeřadit.
            </DialogDescription>
          </DialogHeader>
          <Select value={reassignTo} onValueChange={setReassignTo}>
            <SelectTrigger>
              <SelectValue placeholder="Vyberte obchodníka" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
              Zrušit
            </Button>
            <Button onClick={handleReassignLead} disabled={!reassignTo}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Přeřadit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat manažerskou poznámku</DialogTitle>
            <DialogDescription>
              Tato poznámka bude označena jako manažerská a bude viditelná pro všechny obchodníky.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Napište poznámku..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Zrušit
            </Button>
            <Button onClick={handleAddNote} disabled={!newNote.trim()}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Přidat poznámku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
