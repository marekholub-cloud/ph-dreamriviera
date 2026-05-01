import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Network, 
  Users, 
  DollarSign, 
  TrendingUp,
  Crown,
  Flame
} from "lucide-react";
import { motion } from "framer-motion";

interface TiparStats {
  id: string;
  fullName: string | null;
  email: string;
  totalLeads: number;
  qualifiedLeads: number;
  totalCommission: number;
  warmthAverage: number;
}

interface CoordinatorNetworkProps {
  tipars: TiparStats[];
  totalSuperCommission: number;
}

export const CoordinatorNetwork = ({ tipars, totalSuperCommission }: CoordinatorNetworkProps) => {
  const totalLeadsInNetwork = tipars.reduce((acc, t) => acc + t.totalLeads, 0);
  const totalQualifiedInNetwork = tipars.reduce((acc, t) => acc + t.qualifiedLeads, 0);

  return (
    <div className="space-y-6">
      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-purple-900/30 to-card border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Network className="w-5 h-5 text-purple-400" />
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                  Síť
                </Badge>
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">{tipars.length}</p>
              <p className="text-xs text-muted-foreground">Tipařů v síti</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-card to-secondary border-border/50 hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="w-5 h-5 text-primary" />
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  Celkem
                </Badge>
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">{totalLeadsInNetwork}</p>
              <p className="text-xs text-muted-foreground">Leadů v síti</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-card to-secondary border-border/50 hover:border-emerald-500/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Level 3
                </Badge>
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">{totalQualifiedInNetwork}</p>
              <p className="text-xs text-muted-foreground">Kvalifikovaných</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-amber-900/30 to-card border-amber-500/20 hover:border-amber-500/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Crown className="w-5 h-5 text-amber-400" />
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                  Super
                </Badge>
              </div>
              <p className="text-2xl font-bold text-amber-400 mt-2">
                {new Intl.NumberFormat('cs-CZ').format(Math.round(totalSuperCommission))}
              </p>
              <p className="text-xs text-muted-foreground">USD superprovize</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tipars List */}
      <Card className="bg-card border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="w-5 h-5 text-purple-400" />
            Moje síť tipařů
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tipars.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Network className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Zatím nemáte přiřazené žádné tipaře</p>
              <p className="text-sm text-muted-foreground/70">
                Kontaktujte administrátora pro přidělení tipařů do vaší sítě
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {tipars.map((tipar, index) => (
                <motion.div
                  key={tipar.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {tipar.fullName || tipar.email.split('@')[0]}
                        </p>
                        <p className="text-sm text-muted-foreground">{tipar.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                      {/* Leads Count */}
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{tipar.totalLeads}</p>
                        <p className="text-xs text-muted-foreground">leadů</p>
                      </div>

                      {/* Qualified Count */}
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">{tipar.qualifiedLeads}</p>
                        <p className="text-xs text-muted-foreground">kvalif.</p>
                      </div>

                      {/* Average Warmth */}
                      <div className="w-24">
                        <div className="flex items-center justify-between mb-1">
                          <Flame className={`w-3 h-3 ${
                            tipar.warmthAverage >= 80 ? "text-emerald-400" :
                            tipar.warmthAverage >= 60 ? "text-amber-400" :
                            "text-blue-400"
                          }`} />
                          <span className="text-xs text-muted-foreground">{Math.round(tipar.warmthAverage)}%</span>
                        </div>
                        <Progress 
                          value={tipar.warmthAverage} 
                          className="h-1.5 bg-secondary"
                        />
                      </div>

                      {/* Commission */}
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm font-medium text-primary">
                          {new Intl.NumberFormat('cs-CZ').format(Math.round(tipar.totalCommission))} USD
                        </p>
                        <p className="text-xs text-muted-foreground">provize</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
