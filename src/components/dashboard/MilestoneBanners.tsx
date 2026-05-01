import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GraduationCap, Crown, Star, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MilestoneBannersProps {
  userId: string;
  closedDealsCount: number;
  totalTurnoverAed: number;
  lifecycleStatus: string;
  roles: string[];
}

interface Milestone {
  id: string;
  type: 'tipar_5_deals' | 'senior_obchodnik' | 'vip_client';
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  borderColor: string;
}

export const MilestoneBanners = ({
  userId,
  closedDealsCount,
  totalTurnoverAed,
  lifecycleStatus,
  roles,
}: MilestoneBannersProps) => {
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);
  const [notifiedMilestones, setNotifiedMilestones] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed banners from localStorage
    const dismissed = localStorage.getItem(`dismissed_milestones_${userId}`);
    if (dismissed) {
      setDismissedBanners(JSON.parse(dismissed));
    }
  }, [userId]);

  const dismissBanner = (milestoneType: string) => {
    const newDismissed = [...dismissedBanners, milestoneType];
    setDismissedBanners(newDismissed);
    localStorage.setItem(`dismissed_milestones_${userId}`, JSON.stringify(newDismissed));
  };

  const sendNotification = async (milestone: Milestone, userEmail: string, userName?: string) => {
    if (notifiedMilestones.includes(milestone.type)) return;

    try {
      const response = await supabase.functions.invoke('send-milestone-notification', {
        body: {
          user_id: userId,
          milestone_type: milestone.type,
          user_email: userEmail,
          user_name: userName,
        },
      });

      if (response.data?.success) {
        setNotifiedMilestones(prev => [...prev, milestone.type]);
      }
    } catch (error) {
      console.error("Failed to send milestone notification:", error);
    }
  };

  // Determine active milestones
  const activeMilestones: Milestone[] = [];

  // Tipar with 5+ closed deals
  const isTipar = roles.includes('tipar');
  if (isTipar && closedDealsCount >= 5) {
    activeMilestones.push({
      id: 'tipar_5_deals',
      type: 'tipar_5_deals',
      title: 'Gratulujeme! Máte nárok na kurz obchodníka',
      description: `Dosáhli jste ${closedDealsCount} uzavřených obchodů. Jako odměnu vám nabízíme možnost absolvovat náš exkluzivní kurz obchodníka.`,
      icon: GraduationCap,
      gradient: 'from-amber-500/20 via-amber-600/10 to-amber-700/20',
      borderColor: 'border-amber-500/50',
    });
  }

  // Senior obchodnik milestone
  const isSeniorObchodnik = roles.includes('senior_obchodnik');
  const isObchodnik = roles.includes('obchodnik');
  if (isSeniorObchodnik && !dismissedBanners.includes('senior_obchodnik')) {
    activeMilestones.push({
      id: 'senior_obchodnik',
      type: 'senior_obchodnik',
      title: 'Povýšení na Senior Obchodníka!',
      description: 'Díky vašemu výjimečnému výkonu jste byli povýšeni na pozici Senior Obchodník.',
      icon: Star,
      gradient: 'from-purple-500/20 via-purple-600/10 to-purple-700/20',
      borderColor: 'border-purple-500/50',
    });
  }

  // VIP client milestone
  if (lifecycleStatus === 'vip') {
    activeMilestones.push({
      id: 'vip_client',
      type: 'vip_client',
      title: 'Vítejte v klubu VIP klientů!',
      description: 'Váš celkový obrat přesáhl 10 000 000 USD. Nyní máte přístup k exkluzivním off-market nabídkám.',
      icon: Crown,
      gradient: 'from-primary/20 via-amber-500/10 to-primary/20',
      borderColor: 'border-primary/50',
    });
  }

  // Filter out dismissed banners
  const visibleMilestones = activeMilestones.filter(
    m => !dismissedBanners.includes(m.id)
  );

  if (visibleMilestones.length === 0) return null;

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {visibleMilestones.map((milestone) => {
          const Icon = milestone.icon;
          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Card className={`relative overflow-hidden border ${milestone.borderColor} bg-gradient-to-r ${milestone.gradient}`}>
                {/* Animated sparkles background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Sparkles className="absolute top-2 left-4 h-4 w-4 text-primary/30 animate-pulse" />
                  <Sparkles className="absolute top-4 right-12 h-3 w-3 text-primary/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <Sparkles className="absolute bottom-3 left-1/3 h-3 w-3 text-primary/25 animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-foreground">
                          {milestone.title}
                        </h3>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                          Nový milník
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>

                    {/* Dismiss button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => dismissBanner(milestone.id)}
                      className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
