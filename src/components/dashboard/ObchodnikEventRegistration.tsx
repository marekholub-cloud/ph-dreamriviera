import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Calendar, MapPin, Users, Clock, Check, Loader2, ExternalLink } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  maps_url: string | null;
  image_url: string | null;
  is_active: boolean;
}

interface EventSlot {
  id: string;
  event_id: string;
  start_time: string;
  capacity: number;
  registered_count: number;
}

interface Registration {
  id: string;
  slot_id: string;
  attended: boolean;
}

interface Lead {
  id: string;
  lead_name: string;
  email: string | null;
  phone: string | null;
}

export const ObchodnikEventRegistration = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [slots, setSlots] = useState<Record<string, EventSlot[]>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration dialog state
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch active events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Fetch all slots for these events
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(e => e.id);
        const { data: slotsData, error: slotsError } = await supabase
          .from("event_slots")
          .select("*")
          .in("event_id", eventIds)
          .order("start_time", { ascending: true });

        if (slotsError) throw slotsError;

        // Group slots by event_id
        const slotsByEvent: Record<string, EventSlot[]> = {};
        slotsData?.forEach((slot) => {
          if (!slotsByEvent[slot.event_id]) {
            slotsByEvent[slot.event_id] = [];
          }
          slotsByEvent[slot.event_id].push(slot);
        });
        setSlots(slotsByEvent);
      }

      // Fetch leads assigned to this obchodnik (via their tipar's profile)
      // First get profiles that have this user as assigned_obchodnik
      const { data: assignedProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("assigned_obchodnik_id", user.id);

      if (profilesError) throw profilesError;

      if (assignedProfiles && assignedProfiles.length > 0) {
        const profileIds = assignedProfiles.map(p => p.id);
        const { data: leadsData, error: leadsError } = await supabase
          .from("leads")
          .select("id, lead_name, email, phone")
          .in("referrer_id", profileIds)
          .order("lead_name", { ascending: true });

        if (leadsError) throw leadsError;
        setLeads(leadsData || []);

        // Fetch existing registrations for these leads
        if (leadsData && leadsData.length > 0) {
          const leadIds = leadsData.map(l => l.id);
          const { data: regsData, error: regsError } = await supabase
            .from("event_registrations")
            .select("id, slot_id, attended")
            .in("lead_id", leadIds);

          if (regsError) throw regsError;
          setRegistrations(regsData || []);
        }
      }
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast({
        title: "Chyba při načítání eventů",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openRegisterDialog = (event: Event) => {
    setSelectedEvent(event);
    setSelectedSlotId("");
    setSelectedLeadId("");
    setIsRegisterDialogOpen(true);
  };

  const handleRegister = async () => {
    if (!selectedSlotId || !selectedLeadId || !user) return;

    setRegistering(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .insert({
          slot_id: selectedSlotId,
          lead_id: selectedLeadId,
          referrer_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Registrace úspěšná",
        description: "Lead byl úspěšně přihlášen na event.",
      });

      setIsRegisterDialogOpen(false);
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error("Error registering:", error);
      toast({
        title: "Chyba při registraci",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  const getEventStats = (eventId: string) => {
    const eventSlots = slots[eventId] || [];
    const totalCapacity = eventSlots.reduce((sum, s) => sum + s.capacity, 0);
    const totalRegistered = eventSlots.reduce((sum, s) => sum + s.registered_count, 0);
    return { totalCapacity, totalRegistered, slotCount: eventSlots.length };
  };

  const isLeadRegisteredForEvent = (eventId: string, leadId: string) => {
    const eventSlotIds = (slots[eventId] || []).map(s => s.id);
    return registrations.some(r => eventSlotIds.includes(r.slot_id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Momentálně nejsou žádné aktivní eventy</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Nadcházející eventy</h3>
          <p className="text-sm text-muted-foreground">Přihlaste své leady na semináře a eventy</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => {
          const stats = getEventStats(event.id);
          const eventSlots = slots[event.id] || [];
          const availableSlots = eventSlots.filter(s => s.registered_count < s.capacity);

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors">
                {event.image_url && (
                  <div className="h-32 overflow-hidden rounded-t-lg">
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    {event.maps_url && (
                      <a
                        href={event.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-4 flex-wrap">
                    {event.location_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {stats.totalRegistered}/{stats.totalCapacity}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Slots preview */}
                  <div className="space-y-2">
                    {eventSlots.slice(0, 3).map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                      >
                        <span className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(slot.start_time), "d.M. HH:mm", { locale: cs })}
                        </span>
                        <Badge variant={slot.registered_count >= slot.capacity ? "secondary" : "outline"}>
                          {slot.registered_count}/{slot.capacity}
                        </Badge>
                      </div>
                    ))}
                    {eventSlots.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {eventSlots.length - 3} dalších slotů
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => openRegisterDialog(event)}
                    disabled={availableSlots.length === 0 || leads.length === 0}
                  >
                    <Check className="h-4 w-4" />
                    Přihlásit leada
                  </Button>
                  {leads.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Nemáte přidělené žádné leady k registraci
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Registration Dialog */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="">Přihlásit leada na event</DialogTitle>
            <DialogDescription>
              {selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lead">Vyberte leada</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte leada..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.lead_name} {lead.phone && `(${lead.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slot">Vyberte termín</Label>
              <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte termín..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedEvent && (slots[selectedEvent.id] || [])
                    .filter(s => s.registered_count < s.capacity)
                    .map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {format(new Date(slot.start_time), "d. MMMM yyyy HH:mm", { locale: cs })}
                        {" "}({slot.registered_count}/{slot.capacity} míst)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterDialogOpen(false)}>
              Zrušit
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!selectedSlotId || !selectedLeadId || registering}
            >
              {registering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Přihlásit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
