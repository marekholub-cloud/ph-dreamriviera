import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Mail, Phone, User, Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface Lead {
  id: string;
  lead_number: number | null;
  lead_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  warmth_level: number;
  budget: string | null;
  property_value: number | null;
  lead_level: number | null;
  seminar_accepted: boolean | null;
  questionnaire_completed_independently: boolean | null;
  created_at: string;
  source_form: string | null;
  referrer_id: string | null;
  assigned_obchodnik_id: string | null;
  referrer?: { full_name: string | null; email: string } | null;
  assigned_obchodnik?: { full_name: string | null; email: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  influencer: "Influencer",
  new: "Nový",
  contacted: "Kontaktován",
  qualified: "Kvalifikován",
  supertip: "SuperTip",
  nurturing: "Péče",
  negotiation: "Jednání",
  closed_won: "Uzavřeno (úspěch)",
  closed_lost: "Uzavřeno (neúspěch)",
};

const STATUS_COLORS: Record<string, string> = {
  influencer: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  qualified: "bg-green-500/10 text-green-500 border-green-500/20",
  supertip: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  nurturing: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  negotiation: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  closed_won: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed_lost: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function AllLeadsSection() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          referrer:profiles!leads_referrer_id_fkey(full_name, email),
          assigned_obchodnik:profiles!leads_assigned_obchodnik_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium text-muted-foreground">Všechny leady</CardTitle>
              <CardDescription className="text-xs text-muted-foreground/70">
                Celkem {filteredLeads.length} z {leads.length} leadů
              </CardDescription>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat dle jména, emailu nebo telefonu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtr statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny statusy</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Žádné leady k zobrazení</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground w-[80px]">Č. leadu</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Jméno</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Kontakt</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Warmth</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Referrer</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Obchodník</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Vytvořeno</TableHead>
                  <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/lead/${lead.id}`)}
                  >
                    <TableCell className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        L-{String(lead.lead_number || 0).padStart(4, '0')}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{lead.lead_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {lead.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge 
                        variant="outline" 
                        className={`${STATUS_COLORS[lead.status] || ""} text-xs`}
                      >
                        {STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm">{lead.warmth_level}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {lead.referrer ? (
                        <span className="text-xs text-muted-foreground">
                          {lead.referrer.full_name || lead.referrer.email}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {lead.assigned_obchodnik ? (
                        <span className="text-xs text-muted-foreground">
                          {lead.assigned_obchodnik.full_name || lead.assigned_obchodnik.email}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(lead.created_at), "d. M. yyyy", { locale: cs })}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
}
