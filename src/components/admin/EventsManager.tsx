import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, Trash2, Edit, Calendar, Users, MapPin, Clock, Eye, ChevronDown, ChevronUp, Loader2, ExternalLink } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  maps_url: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface EventSlot {
  id: string;
  event_id: string;
  start_time: string;
  capacity: number;
  registered_count: number;
}

interface EventRegistration {
  id: string;
  slot_id: string;
  lead_id: string;
  referrer_id: string | null;
  attended: boolean;
  registered_at: string;
  lead?: {
    lead_name: string;
    phone: string | null;
    email: string | null;
  };
  referrer?: {
    full_name: string | null;
    email: string;
  };
  lead_profile?: {
    assigned_obchodnik_id: string | null;
    assigned_obchodnik?: {
      full_name: string | null;
      email: string;
    };
  };
}

export const EventsManager = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [slots, setSlots] = useState<Record<string, EventSlot[]>>({});
  const [registrations, setRegistrations] = useState<Record<string, EventRegistration[]>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location_name: "",
    maps_url: "",
    image_url: "",
    is_active: true
  });
  
  // Slot form state
  const [newSlot, setNewSlot] = useState({
    start_time: "",
    capacity: 20
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);

      // Fetch slots for all events
      const { data: slotsData, error: slotsError } = await supabase
        .from("event_slots")
        .select("*")
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

  const fetchRegistrations = async (eventId: string) => {
    try {
      const eventSlots = slots[eventId] || [];
      const slotIds = eventSlots.map((s) => s.id);

      if (slotIds.length === 0) {
        setRegistrations((prev) => ({ ...prev, [eventId]: [] }));
        return;
      }

      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          *,
          lead:leads(lead_name, phone, email),
          referrer:profiles!event_registrations_referrer_id_fkey(full_name, email)
        `)
        .in("slot_id", slotIds)
        .order("registered_at", { ascending: false });

      if (error) throw error;

      // Fetch assigned obchodnik for each lead
      const regsWithObchodnik = await Promise.all(
        (data || []).map(async (reg) => {
          if (reg.lead_id) {
            const { data: leadData } = await supabase
              .from("leads")
              .select("referrer_id")
              .eq("id", reg.lead_id)
              .maybeSingle();

            if (leadData?.referrer_id) {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("assigned_obchodnik_id")
                .eq("id", leadData.referrer_id)
                .maybeSingle();

              if (profileData?.assigned_obchodnik_id) {
                const { data: obchodnikData } = await supabase
                  .from("profiles")
                  .select("full_name, email")
                  .eq("id", profileData.assigned_obchodnik_id)
                  .maybeSingle();

                return {
                  ...reg,
                  lead_profile: {
                    assigned_obchodnik_id: profileData.assigned_obchodnik_id,
                    assigned_obchodnik: obchodnikData
                  }
                };
              }
            }
          }
          return reg;
        })
      );

      setRegistrations((prev) => ({ ...prev, [eventId]: regsWithObchodnik }));
    } catch (error: any) {
      console.error("Error fetching registrations:", error);
      toast({
        title: "Chyba při načítání registrací",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: formData.title,
          description: formData.description || null,
          location_name: formData.location_name || null,
          maps_url: formData.maps_url || null,
          image_url: formData.image_url || null,
          is_active: formData.is_active
        })
        .select()
        .single();

      if (error) throw error;

      setEvents((prev) => [data, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Event vytvořen",
        description: "Nový event byl úspěšně vytvořen.",
      });
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast({
        title: "Chyba při vytváření eventu",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateEvent = async () => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from("events")
        .update({
          title: formData.title,
          description: formData.description || null,
          location_name: formData.location_name || null,
          maps_url: formData.maps_url || null,
          image_url: formData.image_url || null,
          is_active: formData.is_active
        })
        .eq("id", selectedEvent.id);

      if (error) throw error;

      setEvents((prev) =>
        prev.map((e) =>
          e.id === selectedEvent.id
            ? { ...e, ...formData }
            : e
        )
      );
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Event aktualizován",
        description: "Event byl úspěšně aktualizován.",
      });
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast({
        title: "Chyba při aktualizaci eventu",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Opravdu chcete smazat tento event? Tato akce je nevratná.")) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast({
        title: "Event smazán",
        description: "Event byl úspěšně smazán.",
      });
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast({
        title: "Chyba při mazání eventu",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addSlot = async (eventId: string) => {
    if (!newSlot.start_time) {
      toast({
        title: "Chyba",
        description: "Vyberte datum a čas slotu.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("event_slots")
        .insert({
          event_id: eventId,
          start_time: newSlot.start_time,
          capacity: newSlot.capacity
        })
        .select()
        .single();

      if (error) throw error;

      setSlots((prev) => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), data].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      }));
      setNewSlot({ start_time: "", capacity: 20 });
      toast({
        title: "Slot přidán",
        description: "Nový slot byl úspěšně přidán.",
      });
    } catch (error: any) {
      console.error("Error adding slot:", error);
      toast({
        title: "Chyba při přidávání slotu",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteSlot = async (slotId: string, eventId: string) => {
    if (!confirm("Opravdu chcete smazat tento slot?")) return;

    try {
      const { error } = await supabase
        .from("event_slots")
        .delete()
        .eq("id", slotId);

      if (error) throw error;

      setSlots((prev) => ({
        ...prev,
        [eventId]: prev[eventId]?.filter((s) => s.id !== slotId) || []
      }));
      toast({
        title: "Slot smazán",
        description: "Slot byl úspěšně smazán.",
      });
    } catch (error: any) {
      console.error("Error deleting slot:", error);
      toast({
        title: "Chyba při mazání slotu",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleAttendance = async (registrationId: string, eventId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ attended: !currentValue })
        .eq("id", registrationId);

      if (error) throw error;

      setRegistrations((prev) => ({
        ...prev,
        [eventId]: prev[eventId]?.map((r) =>
          r.id === registrationId ? { ...r, attended: !currentValue } : r
        ) || []
      }));
    } catch (error: any) {
      console.error("Error updating attendance:", error);
      toast({
        title: "Chyba při aktualizaci docházky",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location_name: "",
      maps_url: "",
      image_url: "",
      is_active: true
    });
    setSelectedEvent(null);
  };

  const openEditDialog = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      location_name: event.location_name || "",
      maps_url: event.maps_url || "",
      image_url: event.image_url || "",
      is_active: event.is_active
    });
    setIsEditDialogOpen(true);
  };

  const openDetailDialog = (event: Event) => {
    setSelectedEvent(event);
    fetchRegistrations(event.id);
    setIsDetailDialogOpen(true);
  };

  const getEventStats = (eventId: string) => {
    const eventSlots = slots[eventId] || [];
    const totalCapacity = eventSlots.reduce((sum, s) => sum + s.capacity, 0);
    const totalRegistered = eventSlots.reduce((sum, s) => sum + s.registered_count, 0);
    return { totalCapacity, totalRegistered, slotCount: eventSlots.length };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Správa Eventů</h2>
          <p className="text-muted-foreground">Vytvářejte a spravujte semináře a eventy</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nový Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="">Vytvořit nový Event</DialogTitle>
              <DialogDescription>
                Vyplňte informace o novém eventu nebo semináři
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Název eventu *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Např. Investiční seminář Praha"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Popis (HTML podporován)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Podrobný popis eventu..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="location_name">Místo konání</Label>
                  <Input
                    id="location_name"
                    value={formData.location_name}
                    onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                    placeholder="Např. Hotel Marriott Praha"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maps_url">Odkaz na mapu</Label>
                  <Input
                    id="maps_url"
                    value={formData.maps_url}
                    onChange={(e) => setFormData({ ...formData, maps_url: e.target.value })}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="image_url">URL obrázku</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktivní (viditelný veřejně)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={createEvent} disabled={!formData.title}>
                Vytvořit Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">Zatím nebyly vytvořeny žádné eventy</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => {
            const stats = getEventStats(event.id);
            const isExpanded = expandedEventId === event.id;
            const eventSlots = slots[event.id] || [];

            return (
              <Card key={event.id} className="bg-card border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base font-medium text-foreground">{event.title}</CardTitle>
                        <Badge variant={event.is_active ? "default" : "secondary"}>
                          {event.is_active ? "Aktivní" : "Neaktivní"}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        {event.location_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {stats.slotCount} slot{stats.slotCount !== 1 ? "ů" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {stats.totalRegistered}/{stats.totalCapacity} přihlášených
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailDialog(event)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(event)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEvent(event.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-4 border-t border-border">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Časové sloty</h4>
                      </div>

                      {/* Add new slot */}
                      <div className="flex items-end gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="flex-1 grid gap-2">
                          <Label htmlFor={`slot-time-${event.id}`}>Datum a čas</Label>
                          <Input
                            id={`slot-time-${event.id}`}
                            type="datetime-local"
                            value={newSlot.start_time}
                            onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                          />
                        </div>
                        <div className="w-32 grid gap-2">
                          <Label htmlFor={`slot-capacity-${event.id}`}>Kapacita</Label>
                          <Input
                            id={`slot-capacity-${event.id}`}
                            type="number"
                            min={1}
                            value={newSlot.capacity}
                            onChange={(e) => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value) || 20 })}
                          />
                        </div>
                        <Button onClick={() => addSlot(event.id)} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Přidat slot
                        </Button>
                      </div>

                      {/* Slots list */}
                      {eventSlots.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Datum a čas</TableHead>
                              <TableHead>Kapacita</TableHead>
                              <TableHead>Obsazenost</TableHead>
                              <TableHead className="w-20">Akce</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {eventSlots.map((slot) => (
                              <TableRow key={slot.id}>
                                <TableCell>
                                  {format(new Date(slot.start_time), "d. MMMM yyyy HH:mm", { locale: cs })}
                                </TableCell>
                                <TableCell>{slot.capacity} míst</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted rounded-full h-2 max-w-24">
                                      <div
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{
                                          width: `${Math.min((slot.registered_count / slot.capacity) * 100, 100)}%`
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {slot.registered_count}/{slot.capacity}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteSlot(slot.id, event.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Zatím nebyly přidány žádné sloty
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="">Upravit Event</DialogTitle>
            <DialogDescription>
              Upravte informace o eventu
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Název eventu *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Popis</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-location_name">Místo konání</Label>
                <Input
                  id="edit-location_name"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-maps_url">Odkaz na mapu</Label>
                <Input
                  id="edit-maps_url"
                  value={formData.maps_url}
                  onChange={(e) => setFormData({ ...formData, maps_url: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-image_url">URL obrázku</Label>
              <Input
                id="edit-image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-is_active">Aktivní (viditelný veřejně)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={updateEvent} disabled={!formData.title}>
              Uložit změny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.title}
              {selectedEvent?.maps_url && (
                <a
                  href={selectedEvent.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4">
              {selectedEvent?.location_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedEvent.location_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6">
              {/* Event description */}
              {selectedEvent.description && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(selectedEvent.description, {
                      ALLOWED_TAGS: ['strong', 'em', 'br', 'b', 'i', 'p', 'span', 'div', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
                      ALLOWED_ATTR: ['class', 'href']
                    })
                  }} />
                </div>
              )}

              {/* Registrations by slot */}
              <div className="space-y-4">
                <h4 className="font-medium text-lg">Přihlášení účastníci</h4>
                
                {(slots[selectedEvent.id] || []).map((slot) => {
                  const slotRegistrations = (registrations[selectedEvent.id] || []).filter(
                    (r) => r.slot_id === slot.id
                  );

                  return (
                    <Card key={slot.id} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>
                            {format(new Date(slot.start_time), "d. MMMM yyyy HH:mm", { locale: cs })}
                          </span>
                          <Badge variant="outline">
                            {slot.registered_count}/{slot.capacity} přihlášených
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {slotRegistrations.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Jméno</TableHead>
                                <TableHead>Telefon</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Pozval (Tipař)</TableHead>
                                <TableHead>Obchodník</TableHead>
                                <TableHead>Účast</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {slotRegistrations.map((reg) => (
                                <TableRow key={reg.id}>
                                  <TableCell className="font-medium">
                                    {reg.lead?.lead_name || "-"}
                                  </TableCell>
                                  <TableCell>{reg.lead?.phone || "-"}</TableCell>
                                  <TableCell>{reg.lead?.email || "-"}</TableCell>
                                  <TableCell>
                                    {reg.referrer?.full_name || reg.referrer?.email || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {reg.lead_profile?.assigned_obchodnik?.full_name ||
                                      reg.lead_profile?.assigned_obchodnik?.email ||
                                      "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Switch
                                      checked={reg.attended}
                                      onCheckedChange={() =>
                                        toggleAttendance(reg.id, selectedEvent.id, reg.attended)
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Zatím nikdo není přihlášen na tento slot
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {(slots[selectedEvent.id] || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Event nemá žádné sloty
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
