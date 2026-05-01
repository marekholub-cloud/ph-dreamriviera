import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Flame, 
  AlertCircle, 
  CheckCircle2,
  UserPlus,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { motion } from "framer-motion";
import { calculateCommission, type LeadLevelKey } from "@/utils/affiliateCode";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  seminar_accepted: boolean | null;
  questionnaire_completed_independently: boolean | null;
  created_at: string;
}

interface LeadsOverviewProps {
  leads: Lead[];
  onAddLead: () => void;
  affiliateLink: string;
}

const getLeadLevelKey = (level: number | null): LeadLevelKey => {
  if (level === 3) return 'SUPERTIP';
  if (level === 2) return 'PERSONAL';
  return 'INFLUENCER';
};

const levelConfig: Record<number, { label: string; color: string; bgColor: string }> = {
  1: { label: "Level 1", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  2: { label: "Level 2", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  3: { label: "Level 3", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
};

export const LeadsOverview = ({ leads, onAddLead, affiliateLink }: LeadsOverviewProps) => {
  // Calculate statistics
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => l.lead_level === 3).length;
  const pendingLeads = leads.filter(l => l.lead_level !== 3).length;
  
  // Calculate total potential commission
  const totalCommission = leads.reduce((acc, lead) => {
    if (!lead.property_value) return acc;
    const levelKey = getLeadLevelKey(lead.lead_level);
    const result = calculateCommission(
      lead.property_value,
      levelKey,
      lead.seminar_accepted ?? false,
      lead.questionnaire_completed_independently ?? false
    );
    return acc + (result.qualified ? result.commission : 0);
  }, 0);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Users className="w-5 h-5 text-primary" />
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    Celkem
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-foreground mt-2">{totalLeads}</p>
                <p className="text-xs text-muted-foreground">Doporučených leadů</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Level 3
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-foreground mt-2">{qualifiedLeads}</p>
                <p className="text-xs text-muted-foreground">Kvalifikovaných</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 hover:border-amber-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                    Čekající
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-foreground mt-2">{pendingLeads}</p>
                <p className="text-xs text-muted-foreground">K kvalifikaci</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-card to-secondary border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    Provize
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-primary mt-2">
                  {new Intl.NumberFormat('cs-CZ').format(Math.round(totalCommission))}
                </p>
                <p className="text-xs text-muted-foreground">USD potenciálně</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onAddLead} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <UserPlus className="w-4 h-4 mr-2" />
            Přidat osobní doporučení
          </Button>
          <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" asChild>
            <a href={affiliateLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Zobrazit affiliate odkaz
            </a>
          </Button>
        </div>

        {/* Leads List */}
        <Card className="bg-card border-border/50">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Vaši doporučení leadové
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leads.length === 0 ? (
              <div className="text-center py-12 px-6">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Zatím nemáte žádné leady</p>
                <p className="text-sm text-muted-foreground/70">
                  Sdílejte svůj partnerský odkaz nebo přidejte osobní doporučení
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {leads.slice(0, 10).map((lead, index) => {
                  const level = lead.lead_level || 1;
                  const config = levelConfig[level] || levelConfig[1];
                  const levelKey = getLeadLevelKey(level);
                  const commissionResult = lead.property_value 
                    ? calculateCommission(
                        lead.property_value,
                        levelKey,
                        lead.seminar_accepted ?? false,
                        lead.questionnaire_completed_independently ?? false
                      )
                    : null;

                  return (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                            <Flame className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{lead.lead_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {lead.email || lead.phone || "Bez kontaktu"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                          {/* Warmth Progress */}
                          <div className="w-full md:w-32">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Ohřátí</span>
                              <span className={`text-xs font-medium ${
                                lead.warmth_level === 100 ? "text-emerald-400" :
                                lead.warmth_level >= 75 ? "text-amber-400" :
                                "text-blue-400"
                              }`}>
                                {lead.warmth_level}%
                              </span>
                            </div>
                            <Progress 
                              value={lead.warmth_level} 
                              className="h-2 bg-secondary"
                            />
                          </div>

                          {/* Level Badge */}
                          <Badge variant="outline" className={`${config.bgColor} ${config.color} border-current`}>
                            {config.label}
                          </Badge>

                          {/* Commission */}
                          <div className="text-right min-w-[100px]">
                            {commissionResult ? (
                              commissionResult.qualified ? (
                                <p className="text-sm font-medium text-primary">
                                  {new Intl.NumberFormat('cs-CZ').format(Math.round(commissionResult.commission))} USD
                                </p>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-sm text-amber-400 flex items-center gap-1 cursor-help">
                                      <AlertCircle className="w-3 h-3" />
                                      Čeká
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{commissionResult.reason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            ) : (
                              <p className="text-sm text-muted-foreground">—</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(lead.created_at), "d. MMM", { locale: cs })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
