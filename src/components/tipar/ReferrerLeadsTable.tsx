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
import { 
  User, 
  Trophy, 
  Star, 
  Clock, 
  CheckCircle2, 
  CircleDot,
  TrendingUp,
  Loader2,
  Handshake,
  Ban
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface ReferrerLead {
  id: string;
  lead_name: string;
  status: string;
  lead_level: number | null;
  property_value: number | null;
  warmth_level: number;
  commission_rate: number | null;
  lead_type: string;
  created_at: string;
}

interface ReferrerLeadsTableProps {
  leads: ReferrerLead[];
}

// Status configuration with privacy-focused labels
const statusConfig: Record<string, { 
  label: string; 
  description: string;
  icon: React.ElementType; 
  color: string;
  progress: number;
}> = {
  influencer: { 
    label: "Nový lead", 
    description: "Čeká na kontaktování",
    icon: CircleDot, 
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    progress: 20
  },
  personal: { 
    label: "V jednání", 
    description: "Probíhá komunikace",
    icon: Loader2, 
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    progress: 40
  },
  supertip: { 
    label: "Kvalifikovaný", 
    description: "Vážný zájem potvrzen",
    icon: Star, 
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    progress: 60
  },
  qualified: { 
    label: "Kvalifikovaný", 
    description: "Vážný zájem potvrzen",
    icon: Star, 
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    progress: 60
  },
  meeting_scheduled: { 
    label: "Schůzka", 
    description: "Naplánována schůzka",
    icon: Clock, 
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    progress: 70
  },
  offer_sent: { 
    label: "Nabídka", 
    description: "Nabídka odeslána",
    icon: TrendingUp, 
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    progress: 80
  },
  closed_won: { 
    label: "Uzavřeno ✓", 
    description: "Obchod úspěšně uzavřen!",
    icon: CheckCircle2, 
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    progress: 100
  },
  closed_lost: { 
    label: "Neúspěšné", 
    description: "Lead nekonvertoval",
    icon: Ban, 
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    progress: 0
  },
};

// Calculate commission based on lead data
const calculateCommissionDisplay = (lead: ReferrerLead): { 
  amount: string; 
  type: "potential" | "confirmed" | "none";
  tooltip: string;
} => {
  if (!lead.property_value || lead.property_value <= 0) {
    return { 
      amount: "—", 
      type: "none",
      tooltip: "Hodnota nemovitosti zatím není známa"
    };
  }

  const rate = lead.commission_rate || 0.01;
  const commission = lead.property_value * rate;
  const formattedCommission = new Intl.NumberFormat('cs-CZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(commission);

  if (lead.status === "closed_won") {
    return { 
      amount: `${formattedCommission} USD`, 
      type: "confirmed",
      tooltip: "Provize potvrzena - obchod uzavřen"
    };
  }

  return { 
    amount: `~${formattedCommission} USD`, 
    type: "potential",
    tooltip: `Potenciální provize (${(rate * 100).toFixed(1)}% z hodnoty)`
  };
};

// Mask name for campaign leads
const getDisplayName = (lead: ReferrerLead): string => {
  if (lead.lead_type === "campaign" || lead.lead_type === "influencer") {
    // Show only first name initial + last name initial for campaign leads
    const parts = lead.lead_name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}. ${parts[parts.length - 1].charAt(0)}.`;
    }
    return `${lead.lead_name.charAt(0)}.`;
  }
  return lead.lead_name;
};

export const ReferrerLeadsTable = ({ leads }: ReferrerLeadsTableProps) => {
  if (leads.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <User className="h-10 w-10 text-primary/60" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Zatím nemáte žádné leady
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Sdílejte svůj partnerský odkaz nebo vyplňte investorský formulář pro své kontakty.
        </p>
      </div>
    );
  }

  // Calculate summary stats
  const confirmedCommission = leads
    .filter(l => l.status === "closed_won" && l.property_value)
    .reduce((sum, l) => sum + (l.property_value! * (l.commission_rate || 0.01)), 0);

  const potentialCommission = leads
    .filter(l => l.status !== "closed_won" && l.status !== "closed_lost" && l.property_value)
    .reduce((sum, l) => sum + (l.property_value! * (l.commission_rate || 0.01)), 0);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Commission Summary */}
        {(confirmedCommission > 0 || potentialCommission > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-400">Potvrzená provize</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {new Intl.NumberFormat('cs-CZ').format(confirmedCommission)} USD
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-400">Potenciální provize</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">
                ~{new Intl.NumberFormat('cs-CZ').format(potentialCommission)} USD
              </div>
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                <TableHead className="text-muted-foreground font-semibold">Lead</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Průběh</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Provize</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Vytvořeno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const config = statusConfig[lead.status] || statusConfig.influencer;
                const StatusIcon = config.icon;
                const commissionInfo = calculateCommissionDisplay(lead);
                const displayName = getDisplayName(lead);
                const isCampaignLead = lead.lead_type === "campaign" || lead.lead_type === "influencer";

                return (
                  <TableRow 
                    key={lead.id} 
                    className="hover:bg-muted/20 transition-colors border-b border-border/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {isCampaignLead ? (
                            <Handshake className="h-5 w-5 text-primary/60" />
                          ) : (
                            <User className="h-5 w-5 text-primary/60" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isCampaignLead ? "Kampañový lead" : "Osobní doporučení"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`${config.color} border cursor-help`}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${lead.status === "personal" ? "animate-spin" : ""}`} />
                            {config.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{config.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <Progress 
                          value={config.progress} 
                          className="h-2"
                        />
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {config.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`font-semibold cursor-help ${
                            commissionInfo.type === "confirmed" 
                              ? "text-emerald-500" 
                              : commissionInfo.type === "potential"
                                ? "text-amber-500"
                                : "text-muted-foreground"
                          }`}>
                            {commissionInfo.amount}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{commissionInfo.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {format(new Date(lead.created_at), "d. MMM yyyy", { locale: cs })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
};
