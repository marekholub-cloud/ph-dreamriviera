import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Flame, User, Trophy, Star, AlertCircle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateCommission, LEAD_LEVELS, type LeadLevelKey } from "@/utils/affiliateCode";

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

interface LeadsTableProps {
  leads: Lead[];
  onRefresh?: () => void;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  visitor: { label: "Level 1", icon: User, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  influencer: { label: "Level 1", icon: User, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  lead: { label: "Level 2", icon: Star, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  personal: { label: "Level 2", icon: Star, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  qualified: { label: "Level 3", icon: Trophy, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  supertip: { label: "Level 3", icon: Trophy, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

const budgetLabels: Record<string, string> = {
  "do-5m": "Do 5 mil. Kč",
  "5m-10m": "5-10 mil. Kč",
  "10m-20m": "10-20 mil. Kč",
  "20m-50m": "20-50 mil. Kč",
  "nad-50m": "50+ mil. Kč",
};

// Convert lead level number to key
const getLeadLevelKey = (level: number | null): LeadLevelKey => {
  if (level === 3) return 'SUPERTIP';
  if (level === 2) return 'PERSONAL';
  return 'INFLUENCER';
};

// Format commission for display
const formatCommission = (propertyValue: number | null, lead: Lead): { display: string; qualified: boolean; reason?: string } => {
  if (!propertyValue || propertyValue <= 0) {
    return { display: "—", qualified: true };
  }

  const levelKey = getLeadLevelKey(lead.lead_level);
  const result = calculateCommission(
    propertyValue,
    levelKey,
    lead.seminar_accepted ?? false,
    lead.questionnaire_completed_independently ?? false
  );

  if (!result.qualified) {
    return { display: "Čeká na kvalifikaci", qualified: false, reason: result.reason };
  }

  // Format as USD with thousands separators
  const formattedCommission = new Intl.NumberFormat('cs-CZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(result.commission);

  return { display: `${formattedCommission} USD`, qualified: true };
};

export const LeadsTable = ({ leads, onRefresh }: LeadsTableProps) => {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Zatím nemáte žádné leady
        </h3>
        <p className="text-muted-foreground text-sm">
          Sdílejte svůj partnerský odkaz nebo přidejte první kontakt.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Jméno</TableHead>
              <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Kontakt</TableHead>
              <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Level</TableHead>
              <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground text-center">Teplota</TableHead>
              <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Rozpočet</TableHead>
              <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">Provize</TableHead>
              <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground text-right">Datum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const config = statusConfig[lead.status] || statusConfig.visitor;
              const StatusIcon = config.icon;
              const commissionInfo = formatCommission(lead.property_value, lead);

              return (
                <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
                    {lead.lead_name}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="space-y-0.5">
                      {lead.email && <div className="text-xs">{lead.email}</div>}
                      {lead.phone && <div className="text-xs">{lead.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="outline" className={`${config.color} border text-xs`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Flame 
                        className={`h-4 w-4 ${
                          lead.warmth_level === 100 ? "text-red-500" :
                          lead.warmth_level === 75 ? "text-orange-500" :
                          "text-blue-400"
                        }`}
                      />
                      <span className={`text-sm font-medium ${
                        lead.warmth_level === 100 ? "text-red-500" :
                        lead.warmth_level === 75 ? "text-orange-500" :
                        "text-blue-400"
                      }`}>
                        {lead.warmth_level}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {lead.budget ? budgetLabels[lead.budget] || lead.budget : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {commissionInfo.qualified ? (
                      <span className="text-sm text-emerald-500 font-medium flex items-center gap-1">
                        {commissionInfo.display !== "—" && <CheckCircle2 className="h-3 w-3" />}
                        {commissionInfo.display}
                      </span>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-amber-500 flex items-center gap-1 cursor-help">
                            <AlertCircle className="h-3 w-3" />
                            {commissionInfo.display}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{commissionInfo.reason}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {format(new Date(lead.created_at), "d. MMM yyyy", { locale: cs })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};