import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, addDays, setHours, setMinutes, startOfDay, endOfDay, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, Calendar as CalendarIcon, Clock, Users, Trash2, Check, X, UserCheck } from "lucide-react";

interface Slot {
  id: string;
  obchodnik_id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  capacity: number;
  booked_count: number;
  notes: string | null;
  obchodnik?: {
    full_name: string | null;
    email: string;
  };
}

interface Booking {
  id: string;
  slot_id: string | null;
  lead_id: string;
  referrer_id: string | null;
  assigned_obchodnik_id: string | null;
  status: string;
  requested_time: string | null;
  notes: string | null;
  investor_notes: string | null;
  created_at: string;
  lead?: {
    lead_name: string;
    email: string | null;
    phone: string | null;
  };
  referrer?: {
    full_name: string | null;
  };
  assigned_obchodnik?: {
    full_name: string | null;
  };
  slot?: {
    start_time: string;
    end_time: string;
  };
}

const ConsultationSlotsManager = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00");
  const [obchodnici, setObchodnici] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [selectedObchodnik, setSelectedObchodnik] = useState<string>("");
  const [activeTab, setActiveTab] = useState("slots");

  const isSeniorOrAdmin = isAdmin || hasRole('senior_obchodnik');
  const isObchodnik = hasRole('obchodnik') || hasRole('senior_obchodnik');

  useEffect(() => {
    fetchData();
    if (isSeniorOrAdmin) {
      fetchObchodnici();
    }
  }, [user, selectedDate]);

  const fetchObchodnici = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id, profiles!inner(id, full_name, email)")
      .in("role", ["obchodnik", "senior_obchodnik"]);

    if (data) {
      const unique = Array.from(
        new Map(data.map((d: any) => [d.profiles.id, d.profiles])).values()
      ) as { id: string; full_name: string | null; email: string }[];
      setObchodnici(unique);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch slots for selected date
      const startOfSelectedDay = startOfDay(selectedDate).toISOString();
      const endOfSelectedDay = endOfDay(selectedDate).toISOString();

      let slotsQuery = supabase
        .from("consultation_slots")
        .select("*, obchodnik:profiles!consultation_slots_obchodnik_id_fkey(full_name, email)")
        .gte("start_time", startOfSelectedDay)
        .lte("start_time", endOfSelectedDay)
        .order("start_time");

      if (!isSeniorOrAdmin && user) {
        slotsQuery = slotsQuery.eq("obchodnik_id", user.id);
      }

      const { data: slotsData, error: slotsError } = await slotsQuery;

      if (slotsError) {
        console.error("Error fetching slots:", slotsError);
      } else {
        setSlots(slotsData || []);
      }

      // Fetch bookings
      let bookingsQuery = supabase
        .from("consultation_bookings")
        .select(`
          *,
          lead:leads(lead_name, email, phone),
          referrer:profiles!consultation_bookings_referrer_id_fkey(full_name),
          assigned_obchodnik:profiles!consultation_bookings_assigned_obchodnik_id_fkey(full_name),
          slot:consultation_slots(start_time, end_time)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!isSeniorOrAdmin && user) {
        bookingsQuery = bookingsQuery.eq("assigned_obchodnik_id", user.id);
      }

      const { data: bookingsData, error: bookingsError } = await bookingsQuery;

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
      } else {
        setBookings(bookingsData || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!user) return;

    const obchodnikId = isSeniorOrAdmin && selectedObchodnik ? selectedObchodnik : user.id;

    const [startHour, startMinute] = newSlotStart.split(":").map(Number);
    const [endHour, endMinute] = newSlotEnd.split(":").map(Number);

    const startTime = setMinutes(setHours(selectedDate, startHour), startMinute);
    const endTime = setMinutes(setHours(selectedDate, endHour), endMinute);

    if (endTime <= startTime) {
      toast.error("Konec musí být po začátku");
      return;
    }

    const { error } = await supabase.from("consultation_slots").insert({
      obchodnik_id: obchodnikId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });

    if (error) {
      console.error("Error adding slot:", error);
      toast.error("Nepodařilo se přidat slot");
    } else {
      toast.success("Slot přidán");
      setIsAddSlotOpen(false);
      fetchData();
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("consultation_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast.error("Nepodařilo se smazat slot");
    } else {
      toast.success("Slot smazán");
      fetchData();
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    const updates: any = { status };
    
    if (status === 'confirmed') {
      updates.confirmed_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("consultation_bookings")
      .update(updates)
      .eq("id", bookingId);

    if (error) {
      toast.error("Nepodařilo se aktualizovat rezervaci");
    } else {
      toast.success("Rezervace aktualizována");
      fetchData();
    }
  };

  const handleAssignObchodnik = async (bookingId: string, obchodnikId: string) => {
    const { error } = await supabase
      .from("consultation_bookings")
      .update({ 
        assigned_obchodnik_id: obchodnikId,
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    if (error) {
      toast.error("Nepodařilo se přiřadit obchodníka");
    } else {
      toast.success("Obchodník přiřazen");
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Čeká</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Potvrzeno</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Dokončeno</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Zrušeno</Badge>;
      case 'no_show':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Nedostavil se</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kalendář konzultací</h2>
        {isObchodnik && (
          <Dialog open={isAddSlotOpen} onOpenChange={setIsAddSlotOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Přidat slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Přidat dostupný termín</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Datum</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDate, "EEEE d. MMMM yyyy", { locale: cs })}
                  </p>
                </div>
                {isSeniorOrAdmin && (
                  <div>
                    <Label>Obchodník</Label>
                    <Select value={selectedObchodnik} onValueChange={setSelectedObchodnik}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte obchodníka" />
                      </SelectTrigger>
                      <SelectContent>
                        {obchodnici.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.full_name || o.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Začátek</Label>
                    <Input
                      type="time"
                      value={newSlotStart}
                      onChange={(e) => setNewSlotStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Konec</Label>
                    <Input
                      type="time"
                      value={newSlotEnd}
                      onChange={(e) => setNewSlotEnd(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleAddSlot} className="w-full">
                  Přidat slot
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="slots">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Dostupné termíny
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Users className="h-4 w-4 mr-2" />
            Rezervace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slots" className="space-y-4">
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            <Card>
              <CardContent className="pt-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={cs}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {format(selectedDate, "EEEE d. MMMM", { locale: cs })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {slots.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Žádné dostupné termíny pro tento den
                  </p>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          slot.booked_count >= slot.capacity
                            ? "bg-muted"
                            : "bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="font-medium">
                              {format(new Date(slot.start_time), "HH:mm")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(slot.end_time), "HH:mm")}
                            </p>
                          </div>
                          {isSeniorOrAdmin && slot.obchodnik && (
                            <p className="text-sm">
                              {slot.obchodnik.full_name || slot.obchodnik.email}
                            </p>
                          )}
                          <Badge variant={slot.booked_count >= slot.capacity ? "secondary" : "default"}>
                            {slot.booked_count}/{slot.capacity}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSlot(slot.id)}
                          disabled={slot.booked_count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Termín</TableHead>
                    <TableHead>Obchodník</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.lead?.lead_name || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{booking.lead?.email || "—"}</p>
                          <p className="text-muted-foreground">{booking.lead?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.slot ? (
                          <div className="text-sm">
                            <p>{format(new Date(booking.slot.start_time), "d.M.yyyy")}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(booking.slot.start_time), "HH:mm")}
                            </p>
                          </div>
                        ) : booking.requested_time ? (
                          <div className="text-sm">
                            <p>{format(new Date(booking.requested_time), "d.M.yyyy")}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(booking.requested_time), "HH:mm")}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">Požadován</Badge>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {booking.assigned_obchodnik?.full_name || (
                          isSeniorOrAdmin ? (
                            <Select onValueChange={(val) => handleAssignObchodnik(booking.id, val)}>
                              <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Přiřadit" />
                              </SelectTrigger>
                              <SelectContent>
                                {obchodnici.map((o) => (
                                  <SelectItem key={o.id} value={o.id}>
                                    {o.full_name || o.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline">Nepřiřazen</Badge>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {booking.referrer?.full_name || "—"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {booking.status === 'pending' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                              title="Potvrdit"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                              title="Dokončit"
                            >
                              <UserCheck className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {!['cancelled', 'completed', 'no_show'].includes(booking.status) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                              title="Zrušit"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bookings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Žádné rezervace
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsultationSlotsManager;
