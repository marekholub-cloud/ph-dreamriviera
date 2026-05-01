import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Star, Shield, Users, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface UserStatusCardProps {
  fullName: string | null;
  email: string;
  lifecycleStatus: string;
  roles: string[];
  totalTurnoverAed: number;
  closedDealsCount: number;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; gradient: string; textColor: string }> = {
  visitor: { 
    label: "Návštěvník", 
    icon: Users, 
    gradient: "from-slate-600 to-slate-800",
    textColor: "text-slate-300"
  },
  lead: { 
    label: "Zájemce", 
    icon: Star, 
    gradient: "from-blue-600 to-blue-800",
    textColor: "text-blue-300"
  },
  qualified: { 
    label: "Kvalifikovaný", 
    icon: TrendingUp, 
    gradient: "from-cyan-600 to-cyan-800",
    textColor: "text-cyan-300"
  },
  client: { 
    label: "Klient", 
    icon: Shield, 
    gradient: "from-emerald-600 to-emerald-800",
    textColor: "text-emerald-300"
  },
  premium: { 
    label: "Premium Klient", 
    icon: Crown, 
    gradient: "from-amber-500 to-amber-700",
    textColor: "text-amber-300"
  },
  vip: { 
    label: "VIP Klient", 
    icon: Sparkles, 
    gradient: "from-purple-500 via-amber-500 to-purple-600",
    textColor: "text-amber-200"
  },
};

const roleLabels: Record<string, { label: string; color: string }> = {
  user: { label: "Uživatel", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
  tipar: { label: "Tipař", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  obchodnik: { label: "Obchodník", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  senior_obchodnik: { label: "Senior Obchodník", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  influencer_coordinator: { label: "Koordinátor", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  admin: { label: "Admin", color: "bg-red-500/20 text-red-300 border-red-500/30" },
};

export const UserStatusCard = ({ 
  fullName, 
  email, 
  lifecycleStatus, 
  roles, 
  totalTurnoverAed, 
  closedDealsCount 
}: UserStatusCardProps) => {
  const status = statusConfig[lifecycleStatus] || statusConfig.visitor;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-secondary">
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              {/* Status Icon with gradient background */}
              <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${status.gradient} flex items-center justify-center shadow-lg`}>
                <StatusIcon className="w-8 h-8 text-white" />
                {lifecycleStatus === 'vip' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-pulse" />
                )}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {fullName || email.split('@')[0]}
                </h2>
                <p className="text-muted-foreground text-sm">{email}</p>
                
                {/* Status Badge */}
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant="outline" 
                    className={`${status.textColor} border-current font-semibold`}
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Role Badges */}
            <div className="flex flex-col items-start md:items-end gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Aktivní role</span>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role) => {
                    const roleConfig = roleLabels[role] || { label: role, color: "bg-muted text-muted-foreground" };
                    return (
                      <Badge 
                        key={role} 
                        variant="outline" 
                        className={`${roleConfig.color} border`}
                      >
                        {roleConfig.label}
                      </Badge>
                    );
                  })
                ) : (
                  <Badge variant="outline" className="bg-muted/20 text-muted-foreground">
                    Žádné speciální role
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          {(totalTurnoverAed > 0 || closedDealsCount > 0) && (
            <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-2 gap-4">
              <div className="text-center md:text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Celkový obrat</p>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('cs-CZ').format(totalTurnoverAed)} USD
                </p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Uzavřené obchody</p>
                <p className="text-2xl font-bold text-foreground">{closedDealsCount}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
