import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { 
  RefreshCw, 
  Send, 
  Loader2, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Users,
  ArrowUpRight,
  FileText
} from "lucide-react";

interface Lead {
  id: string;
  lead_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  source_form: string | null;
  warmth_level: number;
  lead_level: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  has_questionnaire?: boolean;
}

interface SyncResult {
  leadId: string;
  success: boolean;
  error?: string;
  wlm_lead_id?: string;
}

export function WLMSyncManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<Map<string, SyncResult>>(new Map());

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      // Fetch leads with questionnaire info
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select(`
          id, 
          lead_name, 
          email, 
          phone, 
          status, 
          created_at, 
          source_form,
          warmth_level,
          lead_level,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (leadsError) throw leadsError;

      // Fetch questionnaire lead IDs
      const { data: questionnaireLeads } = await supabase
        .from("investor_questionnaires")
        .select("lead_id");

      const questionnaireLeadIds = new Set(questionnaireLeads?.map(q => q.lead_id) || []);

      // Mark leads with questionnaires
      const enrichedLeads = (leadsData || []).map(lead => ({
        ...lead,
        has_questionnaire: questionnaireLeadIds.has(lead.id)
      }));

      setLeads(enrichedLeads);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast({
        title: "Chyba při načítání leadů",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.lead_name.toLowerCase().includes(query) ||
      (lead.email && lead.email.toLowerCase().includes(query)) ||
      (lead.phone && lead.phone.toLowerCase().includes(query))
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const syncLeadsToWLM = async () => {
    if (selectedLeads.size === 0) {
      toast({
        title: "Vyberte leady",
        description: "Vyberte alespoň jeden lead pro synchronizaci.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    const results = new Map<string, SyncResult>();
    let successCount = 0;
    let errorCount = 0;

    // Get selected leads data
    const leadsToSync = leads.filter((l) => selectedLeads.has(l.id));

    for (const lead of leadsToSync) {
      try {
        // Use lead_id to fetch complete data on server side
        const response = await supabase.functions.invoke("send-lead-to-wlm", {
          body: {
            lead_id: lead.id,
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        if (data.success && data.wlm_sync) {
          results.set(lead.id, {
            leadId: lead.id,
            success: true,
            wlm_lead_id: data.wlm_lead_id,
          });
          successCount++;
        } else {
          results.set(lead.id, {
            leadId: lead.id,
            success: false,
            error: data.wlm_error || "Synchronizace selhala",
          });
          errorCount++;
        }
      } catch (error: any) {
        results.set(lead.id, {
          leadId: lead.id,
          success: false,
          error: error.message,
        });
        errorCount++;
      }
    }

    setSyncResults(results);
    setSyncing(false);

    toast({
      title: "Synchronizace dokončena",
      description: `Úspěšně: ${successCount}, Chyby: ${errorCount}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  const getSyncStatus = (leadId: string) => {
    const result = syncResults.get(leadId);
    if (!result) return null;
    
    if (result.success) {
      return (
        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Odesláno
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Chyba
        </Badge>
      );
    }
  };

  const getLeadDataBadges = (lead: Lead) => {
    const badges = [];
    
    if (lead.has_questionnaire) {
      badges.push(
        <Badge key="quest" variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
          <FileText className="h-3 w-3 mr-1" />
          Dotazník
        </Badge>
      );
    }
    
    if (lead.utm_source) {
      badges.push(
        <Badge key="utm" variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
          UTM
        </Badge>
      );
    }
    
    return badges;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const leadsWithQuestionnaire = leads.filter(l => l.has_questionnaire).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Celkem leadů
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">{leads.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Vybrané k syncu
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">{selectedLeads.size}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
              S emailem
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {leads.filter((l) => l.email).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              S dotazníkem
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">{leadsWithQuestionnaire}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                WLM.cz Synchronizace (rozšířená)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Odeslání kompletních dat leadů včetně investičního profilu, UTM a dotazníků
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchLeads}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Obnovit
              </Button>
              <Button
                onClick={syncLeadsToWLM}
                disabled={syncing || selectedLeads.size === 0}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Odeslat do WLM ({selectedLeads.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat leady..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredLeads.length > 0 &&
                        filteredLeads.every((l) => selectedLeads.has(l.id))
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Zdroj</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status WLM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Žádné leady k zobrazení
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.slice(0, 100).map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/20">
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={(checked) =>
                            handleSelectLead(lead.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{lead.lead_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.email || (
                          <span className="text-amber-500 text-sm">Chybí</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {lead.source_form || "Neznámý"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {getLeadDataBadges(lead)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(lead.created_at), "d. MMM yyyy", { locale: cs })}
                      </TableCell>
                      <TableCell>{getSyncStatus(lead.id)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredLeads.length > 100 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Zobrazeno prvních 100 z {filteredLeads.length} leadů. Použijte vyhledávání pro filtrování.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
