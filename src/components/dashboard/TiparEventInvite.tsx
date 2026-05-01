import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  Copy, 
  Check, 
  MapPin, 
  Users,
  Clock,
  ExternalLink,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface EventSlot {
  id: string;
  start_time: string;
  capacity: number;
  registered_count: number;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  image_url: string | null;
  event_slots: EventSlot[];
}

interface TiparEventInviteProps {
  affiliateCode: string | null;
}

export const TiparEventInvite = ({ affiliateCode }: TiparEventInviteProps) => {
  const { user } = useAuth();
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // Fetch active events with slots
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["tipar-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          location_name,
          image_url,
          event_slots (
            id,
            start_time,
            capacity,
            registered_count
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter to only show events with future slots
      const now = new Date();
      return (data as Event[])?.filter(event =>
        event.event_slots.some(slot => new Date(slot.start_time) > now)
      ).map(event => ({
        ...event,
        event_slots: event.event_slots
          .filter(slot => new Date(slot.start_time) > now)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      })) || [];
    },
  });

  // Fetch seminar registrations count for this tipar
  const { data: seminarStats } = useQuery({
    queryKey: ["tipar-seminar-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, attended: 0 };

      const { count: totalCount, error: totalError } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      const { count: attendedCount, error: attendedError } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .eq("attended", true);

      if (totalError || attendedError) {
        console.error("Stats error:", totalError || attendedError);
        return { total: 0, attended: 0 };
      }

      return {
        total: totalCount || 0,
        attended: attendedCount || 0
      };
    },
    enabled: !!user?.id,
  });

  const generateEventLink = (eventId: string) => {
    const baseUrl = `${window.location.origin}/udalosti`;
    const params = new URLSearchParams();
    params.set("event", eventId);
    if (affiliateCode) {
      params.set("ref", affiliateCode);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const copyEventLink = async (eventId: string) => {
    const link = generateEventLink(eventId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedEventId(eventId);
      toast.success("Odkaz zkopírován do schránky!");
      setTimeout(() => setCopiedEventId(null), 2000);
    } catch {
      toast.error("Nepodařilo se zkopírovat odkaz");
    }
  };

  const getTotalCapacity = (slots: EventSlot[]) => {
    return slots.reduce((sum, slot) => sum + slot.capacity, 0);
  };

  const getTotalRegistered = (slots: EventSlot[]) => {
    return slots.reduce((sum, slot) => sum + slot.registered_count, 0);
  };

  const getNextSlotDate = (slots: EventSlot[]) => {
    if (slots.length === 0) return null;
    return new Date(slots[0].start_time);
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              Vaše semináře - statistiky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">
                  {seminarStats?.total || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Přihlášených přes váš odkaz
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-primary">
                  {seminarStats?.attended || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Zúčastnilo se
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Events List */}
      <Card className="bg-card border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <CalendarDays className="h-5 w-5 text-primary" />
            Pozvat na seminář
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {eventsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : events && events.length > 0 ? (
            <div className="divide-y divide-border/50">
              {events.map((event, index) => {
                const nextDate = getNextSlotDate(event.event_slots);
                const totalCapacity = getTotalCapacity(event.event_slots);
                const totalRegistered = getTotalRegistered(event.event_slots);
                const isCopied = copiedEventId === event.id;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Event Info */}
                      <div className="flex items-start gap-3 flex-1">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {event.title}
                          </h3>
                          {event.location_name && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              <span className="truncate">{event.location_name}</span>
                            </div>
                          )}
                          {nextDate && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              <span>
                                Nejbližší: {format(nextDate, "d. MMMM yyyy HH:mm", { locale: cs })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Slots info */}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-secondary/50">
                            <Users className="h-3 w-3 mr-1" />
                            {totalRegistered}/{totalCapacity}
                          </Badge>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            {event.event_slots.length} termín{event.event_slots.length > 1 ? "y" : ""}
                          </Badge>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary/30 hover:bg-primary/10"
                            asChild
                          >
                            <a 
                              href={generateEventLink(event.id)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Zobrazit</span>
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => copyEventLink(event.id)}
                            className={isCopied 
                              ? "bg-emerald-500 hover:bg-emerald-600" 
                              : "bg-primary hover:bg-primary/90"
                            }
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Zkopírováno
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Kopírovat pozvánku</span>
                                <span className="sm:hidden">Kopírovat</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-6">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Žádné aktivní semináře</p>
              <p className="text-sm text-muted-foreground/70">
                Momentálně nejsou naplánovány žádné semináře k pozvání.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
