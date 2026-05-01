import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  CalendarCheck,
  Clock,
  User,
  AlertCircle,
  Check,
  X,
  Edit,
  Loader2,
} from "lucide-react";
import { RescheduleConsultationDialog } from "./RescheduleConsultationDialog";

interface ConsultationBooking {
  id: string;
  status: string;
  requested_time: string | null;
  notes: string | null;
  investor_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  cancellation_reason: string | null;
  slot?: {
    start_time: string;
    end_time: string;
  } | null;
  assigned_obchodnik?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

interface ConsultationBookingTabProps {
  leadId: string;
  canEdit: boolean;
  onRefresh?: () => void;
}

export function ConsultationBookingTab({ leadId, canEdit, onRefresh }: ConsultationBookingTabProps) {
  const [booking, setBooking] = useState<ConsultationBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [leadId]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("consultation_bookings")
        .select(`
          *,
          slot:consultation_slots(start_time, end_time),
          assigned_obchodnik:profiles!consultation_bookings_assigned_obchodnik_id_fkey(id, full_name, email)
        `)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching booking:", error);
      } else {
        setBooking(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Čeká na potvrzení</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Potvrzeno</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Dokončeno</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">Zrušeno</Badge>;
      case 'no_show':
        return <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">Nedostavil se</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScheduledTime = () => {
    if (booking?.slot?.start_time) {
      return {
        date: format(new Date(booking.slot.start_time), "EEEE d. MMMM yyyy", { locale: cs }),
        time: format(new Date(booking.slot.start_time), "HH:mm"),
        isConfirmed: true,
      };
    }
    if (booking?.requested_time) {
      return {
        date: format(new Date(booking.requested_time), "EEEE d. MMMM yyyy", { locale: cs }),
        time: format(new Date(booking.requested_time), "HH:mm"),
        isConfirmed: false,
      };
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!booking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Rezervace konzultace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <CalendarCheck className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Žádná rezervace konzultace</p>
            <p className="text-sm mt-2">Investor zatím nepožádal o konzultaci</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scheduledTime = getScheduledTime();

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Rezervace konzultace
            </CardTitle>
            <CardDescription>
              Vytvořeno {format(new Date(booking.created_at), "d. MMMM yyyy HH:mm", { locale: cs })}
            </CardDescription>
          </div>
          {canEdit && booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <Button variant="outline" size="sm" onClick={() => setShowReschedule(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Změnit termín
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Status</p>
                {getStatusBadge(booking.status)}
              </div>
              
              {scheduledTime && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Termín</p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{scheduledTime.date}</p>
                      <p className="text-lg font-bold text-primary">{scheduledTime.time}</p>
                      {!scheduledTime.isConfirmed && (
                        <Badge variant="outline" className="mt-1 text-xs">Požadovaný čas</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {booking.assigned_obchodnik && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Přiřazený obchodník</p>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <User className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">{booking.assigned_obchodnik.full_name || booking.assigned_obchodnik.email}</p>
                      <p className="text-sm text-muted-foreground">{booking.assigned_obchodnik.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {!booking.assigned_obchodnik && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Přiřazený obchodník</p>
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Čeká na přiřazení</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {booking.investor_notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Poznámky investora</p>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm">{booking.investor_notes}</p>
              </div>
            </div>
          )}

          {booking.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Interní poznámky</p>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm">{booking.notes}</p>
              </div>
            </div>
          )}

          {/* Timeline of status changes */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Historie</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Vytvořeno:</span>
                <span>{format(new Date(booking.created_at), "d. MMM yyyy HH:mm", { locale: cs })}</span>
              </div>
              {booking.confirmed_at && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Potvrzeno:</span>
                  <span>{format(new Date(booking.confirmed_at), "d. MMM yyyy HH:mm", { locale: cs })}</span>
                </div>
              )}
              {booking.completed_at && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Dokončeno:</span>
                  <span>{format(new Date(booking.completed_at), "d. MMM yyyy HH:mm", { locale: cs })}</span>
                </div>
              )}
              {booking.cancelled_at && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Zrušeno:</span>
                  <span>{format(new Date(booking.cancelled_at), "d. MMM yyyy HH:mm", { locale: cs })}</span>
                  {booking.cancellation_reason && (
                    <span className="text-muted-foreground">({booking.cancellation_reason})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <RescheduleConsultationDialog
        open={showReschedule}
        onOpenChange={setShowReschedule}
        booking={booking}
        onSuccess={() => {
          fetchBooking();
          onRefresh?.();
        }}
      />
    </>
  );
}
