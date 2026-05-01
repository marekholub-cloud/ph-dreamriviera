import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Target,
  TrendingUp,
  MessageSquare,
  FileText,
  History,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  ClipboardList,
  Activity,
  Lock,
  Unlock,
  CalendarCheck,
  UserPlus,
  Link2,
  PenLine,
} from "lucide-react";
import { ConsultationBookingTab } from "@/components/lead/ConsultationBookingTab";
import { LeadActionButtons } from "@/components/lead/LeadActionButtons";
import { AssignObchodnikDialog } from "@/components/lead/AssignObchodnikDialog";

// Types
interface Lead {
  id: string;
  lead_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  warmth_level: number;
  budget: string | null;
  property_value: number | null;
  lead_level: number | null;
  lead_type: string;
  referrer_id: string | null;
  assigned_obchodnik_id: string | null;
  notes: string | null;
  investment_goals: string | null;
  investment_timeline: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  phone: string | null;
}

interface LeadNote {
  id: string;
  content: string;
  author_name: string | null;
  author_email: string | null;
  author_role: string;
  note_type: string;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  old_values: unknown;
  new_values: unknown;
  changed_fields: string[] | null;
  user_id: string;
  user_role: string | null;
  created_at: string;
}

interface Questionnaire {
  id: string;
  experience_level: string | null;
  risk_tolerance: string | null;
  investment_horizon: string | null;
  budget_min: number | null;
  budget_max: number | null;
  priority: string | null;
  financing_type: string | null;
  target_markets: string[] | null;
  preferred_property_types: string[] | null;
  additional_notes: string | null;
  version: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  influencer: { label: "Nový lead", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: User },
  personal: { label: "V jednání", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
  supertip: { label: "Kvalifikovaný", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Target },
  qualified: { label: "Kvalifikovaný", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Target },
  meeting_scheduled: { label: "Schůzka", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", icon: Calendar },
  offer_sent: { label: "Nabídka", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: FileText },
  closed_won: { label: "Uzavřeno ✓", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  closed_lost: { label: "Ztraceno", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: X },
};

type UserRole = "referrer" | "obchodnik" | "senior_obchodnik" | "admin";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRoles, isAdmin } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [referrer, setReferrer] = useState<Profile | null>(null);
  const [assignedAgent, setAssignedAgent] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [hasConsultation, setHasConsultation] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("referrer");
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [newNote, setNewNote] = useState("");
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Determine user's effective role for this lead
  useEffect(() => {
    if (!user || !lead) return;

    if (isAdmin) {
      setUserRole("admin");
    } else if (userRoles.includes("senior_obchodnik")) {
      setUserRole("senior_obchodnik");
    } else if (userRoles.includes("obchodnik") && lead.assigned_obchodnik_id === user.id) {
      setUserRole("obchodnik");
    } else if (lead.referrer_id === user.id) {
      setUserRole("referrer");
    } else {
      // No access - redirect
      navigate("/dashboard");
    }
  }, [user, lead, userRoles, isAdmin, navigate]);

  useEffect(() => {
    if (id) {
      fetchLeadData();
    }
  }, [id]);

  const fetchLeadData = async () => {
    if (!id) return;

    try {
      // Fetch lead
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (leadError) throw leadError;
      if (!leadData) {
        toast({ title: "Lead nenalezen", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      setLead(leadData);
      setEditedLead(leadData);

      // Fetch referrer profile
      if (leadData.referrer_id) {
        const { data: referrerData } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, phone")
          .eq("id", leadData.referrer_id)
          .maybeSingle();
        setReferrer(referrerData);
      }

      // Fetch assigned agent profile
      if (leadData.assigned_obchodnik_id) {
        const { data: agentData } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, phone")
          .eq("id", leadData.assigned_obchodnik_id)
          .maybeSingle();
        setAssignedAgent(agentData);
      }

      // Fetch notes (will be filtered by RLS)
      const { data: notesData } = await supabase
        .from("lead_notes_with_author")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });
      setNotes(notesData || []);

      // Fetch audit log (will be filtered by RLS)
      const { data: auditData } = await supabase
        .from("audit_log")
        .select("*")
        .eq("entity_type", "lead")
        .eq("entity_id", id)
        .order("created_at", { ascending: false });
      setAuditLog(auditData || []);

      // Fetch questionnaire
      const { data: questionnaireData } = await supabase
        .from("investor_questionnaires")
        .select("*")
        .eq("lead_id", id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      setQuestionnaire(questionnaireData);

      // Check if consultation booking exists
      const { data: consultationData } = await supabase
        .from("consultation_bookings")
        .select("id")
        .eq("lead_id", id)
        .limit(1);
      setHasConsultation(consultationData && consultationData.length > 0);
    } catch (error) {
      console.error("Error fetching lead:", error);
      toast({ title: "Chyba při načítání", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async () => {
    if (!lead || !editedLead) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          lead_name: editedLead.lead_name,
          email: editedLead.email,
          phone: editedLead.phone,
          status: editedLead.status,
          warmth_level: editedLead.warmth_level,
          budget: editedLead.budget,
          property_value: editedLead.property_value,
          notes: editedLead.notes,
          investment_goals: editedLead.investment_goals,
          investment_timeline: editedLead.investment_timeline,
        })
        .eq("id", lead.id);

      if (error) throw error;

      toast({ title: "Lead uložen" });
      setIsEditing(false);
      fetchLeadData();
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;

    setSaving(true);
    try {
      const noteType = userRole === "senior_obchodnik" || userRole === "admin" ? "managerial" : "standard";
      
      const { error } = await supabase
        .from("lead_notes")
        .insert({
          lead_id: lead.id,
          author_id: user?.id,
          content: newNote.trim(),
          note_type: noteType,
          author_role: userRole,
          is_internal: true,
        });

      if (error) throw error;

      toast({ title: "Poznámka přidána" });
      setNewNote("");
      setShowAddNoteDialog(false);
      fetchLeadData();
    } catch (error) {
      console.error("Error adding note:", error);
      toast({ title: "Chyba při přidávání poznámky", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canEdit = userRole === "obchodnik" || userRole === "admin";
  const canSeeFullDetails = userRole !== "referrer";
  const canSeeNotes = userRole !== "referrer";
  const canSeeAuditLog = userRole === "admin" || userRole === "senior_obchodnik";
  const canAddNote = userRole === "obchodnik" || userRole === "senior_obchodnik" || userRole === "admin";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Lead nenalezen</p>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[lead.status] || statusConfig.influencer;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Zpět
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Lead Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-card border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="bg-primary/20 text-primary text-xl">
                            {lead.lead_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-2xl flex items-center gap-3">
                            {isEditing ? (
                              <Input
                                value={editedLead.lead_name || ""}
                                onChange={(e) => setEditedLead({ ...editedLead, lead_name: e.target.value })}
                                className="text-xl font-bold"
                              />
                            ) : (
                              lead.lead_name
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={`${statusInfo.color} border`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {lead.lead_type === "referral" ? "Doporučení" : "Kampaň"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <LeadActionButtons
                          leadId={lead.id}
                          leadName={lead.lead_name}
                          hasConsultation={hasConsultation}
                          assignedObchodnikId={lead.assigned_obchodnik_id}
                          canEdit={canEdit}
                          onRefresh={fetchLeadData}
                        />
                        {canEdit && !isEditing && (
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Upravit
                          </Button>
                        )}
                        {isEditing && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                              <X className="h-4 w-4 mr-2" />
                              Zrušit
                            </Button>
                            <Button size="sm" onClick={handleSaveLead} disabled={saving}>
                              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                              Uložit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Contact Details - Hidden for referrer */}
                    {canSeeFullDetails ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {isEditing ? (
                            <Input
                              value={editedLead.email || ""}
                              onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                              placeholder="Email"
                            />
                          ) : (
                            <span>{lead.email || "—"}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {isEditing ? (
                            <Input
                              value={editedLead.phone || ""}
                              onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                              placeholder="Telefon"
                            />
                          ) : (
                            <span>{lead.phone || "—"}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editedLead.property_value || ""}
                              onChange={(e) => setEditedLead({ ...editedLead, property_value: Number(e.target.value) })}
                              placeholder="Hodnota nemovitosti (USD)"
                            />
                          ) : (
                            <span>
                              {lead.property_value 
                                ? `${new Intl.NumberFormat("cs-CZ").format(lead.property_value)} USD` 
                                : "—"
                              }
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Vytvořeno: {format(new Date(lead.created_at), "d. MMMM yyyy", { locale: cs })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <EyeOff className="h-4 w-4" />
                        <span className="text-sm">Kontaktní údaje jsou skryté</span>
                      </div>
                    )}

                    {/* Status selector for editing */}
                    {isEditing && (
                      <div className="mt-4">
                        <Label>Status</Label>
                        <Select
                          value={editedLead.status}
                          onValueChange={(value) => setEditedLead({ ...editedLead, status: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* UTM Source for admin */}
                    {userRole === "admin" && (lead.utm_source || lead.utm_campaign) && (
                      <div className="mt-4 p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          Zdroj: {lead.utm_source || "—"} | Kampaň: {lead.utm_campaign || "—"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tabs for different sections */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Tabs defaultValue="consultation" className="space-y-4">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="consultation" className="gap-2">
                      <CalendarCheck className="h-4 w-4" />
                      Konzultace
                    </TabsTrigger>
                    {canSeeFullDetails && (
                      <TabsTrigger value="questionnaire" className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Dotazník
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="timeline" className="gap-2">
                      <History className="h-4 w-4" />
                      Timeline
                    </TabsTrigger>
                    {canSeeAuditLog && (
                      <TabsTrigger value="audit" className="gap-2">
                        <Activity className="h-4 w-4" />
                        Audit log
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Consultation Tab */}
                  <TabsContent value="consultation">
                    <ConsultationBookingTab
                      leadId={lead.id}
                      canEdit={canEdit}
                      onRefresh={fetchLeadData}
                    />
                  </TabsContent>

                  {/* Questionnaire Tab */}
                  {canSeeFullDetails && (
                    <TabsContent value="questionnaire">
                      <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <ClipboardList className="h-5 w-5 text-primary" />
                              Investorský dotazník
                              {questionnaire && (
                                <Badge variant="secondary" className="ml-2">
                                  v{questionnaire.version}
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                          {(userRole === "admin" || userRole === "senior_obchodnik" || userRole === "obchodnik") && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = `${window.location.origin}/investor-profil?lead=${lead.id}`;
                                  navigator.clipboard.writeText(url);
                                  toast({ title: "Odkaz zkopírován", description: "Odkaz na dotazník byl zkopírován do schránky." });
                                }}
                              >
                                <Link2 className="h-3.5 w-3.5 mr-1.5" />
                                Sdílet odkaz
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => navigate(`/investor-profil?lead=${lead.id}&fill=true`)}
                              >
                                <PenLine className="h-3.5 w-3.5 mr-1.5" />
                                Vyplnit dotazník
                              </Button>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          {questionnaire ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <Label className="text-muted-foreground">Investiční zkušenosti</Label>
                                <p className="font-medium">{questionnaire.experience_level || "—"}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Tolerance rizika</Label>
                                <p className="font-medium">{questionnaire.risk_tolerance || "—"}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Investiční horizont</Label>
                                <p className="font-medium">{questionnaire.investment_horizon || "—"}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Rozpočet</Label>
                                <p className="font-medium">
                                  {questionnaire.budget_min && questionnaire.budget_max
                                    ? `${new Intl.NumberFormat("cs-CZ").format(questionnaire.budget_min)} - ${new Intl.NumberFormat("cs-CZ").format(questionnaire.budget_max)} USD`
                                    : "—"
                                  }
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Priorita</Label>
                                <p className="font-medium">{questionnaire.priority || "—"}</p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Způsob financování</Label>
                                <p className="font-medium">{questionnaire.financing_type || "—"}</p>
                              </div>
                              {questionnaire.target_markets && questionnaire.target_markets.length > 0 && (
                                <div className="md:col-span-2">
                                  <Label className="text-muted-foreground">Cílové trhy</Label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {questionnaire.target_markets.map((market, i) => (
                                      <Badge key={i} variant="secondary">{market}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {questionnaire.additional_notes && (
                                <div className="md:col-span-2">
                                  <Label className="text-muted-foreground">Poznámky</Label>
                                  <p className="text-sm mt-1">{questionnaire.additional_notes}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <ClipboardList className="h-10 w-10 mx-auto mb-4 opacity-50" />
                              <p>Dotazník nebyl vyplněn</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Timeline Tab */}
                  <TabsContent value="timeline">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <History className="h-5 w-5 text-primary" />
                          Historie & Poznámky
                        </CardTitle>
                        {canAddNote && (
                          <Button size="sm" onClick={() => setShowAddNoteDialog(true)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Přidat poznámku
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        {canSeeNotes ? (
                          notes.length > 0 ? (
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-4">
                                {notes.map((note, index) => (
                                  <div
                                    key={note.id}
                                    className={`relative pl-6 pb-4 ${
                                      index !== notes.length - 1 ? "border-l-2 border-border" : ""
                                    }`}
                                  >
                                    <div className={`absolute left-0 top-0 -translate-x-1/2 h-3 w-3 rounded-full ${
                                      note.note_type === "managerial" 
                                        ? "bg-amber-500" 
                                        : note.note_type === "system"
                                          ? "bg-blue-500"
                                          : "bg-primary"
                                    }`} />
                                    <div className={`p-4 rounded-lg ${
                                      note.note_type === "managerial"
                                        ? "bg-amber-500/10 border border-amber-500/20"
                                        : "bg-muted/30"
                                    }`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm">
                                            {note.author_name || note.author_email || "Systém"}
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
                                      <p className="text-sm">{note.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-50" />
                              <p>Zatím žádné poznámky</p>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Lock className="h-10 w-10 mx-auto mb-4 opacity-50" />
                            <p>Poznámky nejsou pro tuto roli dostupné</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Audit Log Tab */}
                  {canSeeAuditLog && (
                    <TabsContent value="audit">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Audit Log
                          </CardTitle>
                          <CardDescription>
                            Historie všech změn tohoto leadu
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {auditLog.length > 0 ? (
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-3">
                                {auditLog.map((entry) => (
                                  <div
                                    key={entry.id}
                                    className="p-3 rounded-lg bg-muted/30 border border-border"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {entry.action}
                                        </Badge>
                                        {entry.user_role && (
                                          <span className="text-xs text-muted-foreground">
                                            ({entry.user_role})
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(entry.created_at), "d. MMM yyyy HH:mm:ss", { locale: cs })}
                                      </span>
                                    </div>
                                    {entry.changed_fields && entry.changed_fields.length > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        Změněná pole: {entry.changed_fields.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <Activity className="h-10 w-10 mx-auto mb-4 opacity-50" />
                              <p>Žádné záznamy v audit logu</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </Tabs>
              </motion.div>
            </div>

            {/* Right Column - Agent Card & Quick Info */}
            <div className="space-y-6">
              {/* Role indicator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border ${
                  userRole === "admin" 
                    ? "bg-red-500/10 border-red-500/30" 
                    : userRole === "senior_obchodnik"
                      ? "bg-amber-500/10 border-amber-500/30"
                      : userRole === "obchodnik"
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-blue-500/10 border-blue-500/30"
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        userRole === "admin" 
                          ? "bg-red-500/20" 
                          : userRole === "senior_obchodnik"
                            ? "bg-amber-500/20"
                            : userRole === "obchodnik"
                              ? "bg-emerald-500/20"
                              : "bg-blue-500/20"
                      }`}>
                        {canEdit ? <Unlock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {userRole === "admin" && "Admin přístup"}
                          {userRole === "senior_obchodnik" && "Pouze pro čtení"}
                          {userRole === "obchodnik" && "Plný přístup"}
                          {userRole === "referrer" && "Omezený přístup"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {canEdit ? "Můžete upravovat tento lead" : "Pouze prohlížení"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Assigned Agent Card */}
              {canSeeFullDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Přiřazený obchodník
                      </CardTitle>
                      {(userRole === "admin" || userRole === "senior_obchodnik") && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAssignDialog(true)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          Přiřadit
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {assignedAgent ? (
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={assignedAgent.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {assignedAgent.full_name?.charAt(0) || assignedAgent.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{assignedAgent.full_name || assignedAgent.email}</p>
                            <p className="text-sm text-muted-foreground">{assignedAgent.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nepřiřazeno</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Referrer Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Zdroj leadu
                    </CardTitle>
                    {(userRole === "admin" || userRole === "senior_obchodnik") && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({ title: "Funkce bude brzy k dispozici", description: "Správa zdrojů leadů bude přidána." });
                        }}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        Přiřadit zdroj
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {referrer ? (
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={referrer.avatar_url || undefined} />
                          <AvatarFallback className="bg-blue-500/20 text-blue-400">
                            {referrer.full_name?.charAt(0) || referrer.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{referrer.full_name || referrer.email}</p>
                          <Badge variant="secondary" className="text-xs mt-1">Tipař</Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Přímý kontakt</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Statistiky
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Teplota</span>
                      <Badge variant={lead.warmth_level >= 75 ? "default" : "secondary"}>
                        {lead.warmth_level}%
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Poznámky</span>
                      <span className="font-medium">{notes.length}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Poslední aktivita</span>
                      <span className="text-sm">
                        {format(new Date(lead.updated_at), "d. MMM", { locale: cs })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Note Dialog */}
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat poznámku</DialogTitle>
            <DialogDescription>
              {userRole === "senior_obchodnik" || userRole === "admin"
                ? "Tato poznámka bude označena jako manažerská."
                : "Přidejte poznámku k tomuto leadu."
              }
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Napište poznámku..."
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNoteDialog(false)}>
              Zrušit
            </Button>
            <Button onClick={handleAddNote} disabled={!newNote.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Přidat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Obchodnik Dialog */}
      <AssignObchodnikDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        leadId={lead.id}
        currentObchodnikId={lead.assigned_obchodnik_id}
        onSuccess={fetchLeadData}
      />
    </div>
  );
}
