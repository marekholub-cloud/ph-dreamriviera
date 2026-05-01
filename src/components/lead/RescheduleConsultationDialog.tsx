import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, setHours, setMinutes } from "date-fns";
import { cs } from "date-fns/locale";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";

interface RescheduleConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    requested_time: string | null;
    slot?: {
      start_time: string;
    } | null;
  };
  onSuccess: () => void;
}

export function RescheduleConsultationDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: RescheduleConsultationDialogProps) {
  const currentTime = booking.slot?.start_time || booking.requested_time;
  const initialDate = currentTime ? new Date(currentTime) : new Date();
  
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTime, setSelectedTime] = useState(
    currentTime ? format(new Date(currentTime), "HH:mm") : "10:00"
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Vyberte datum a čas");
      return;
    }

    setSaving(true);
    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const newDateTime = setMinutes(setHours(selectedDate, hours), minutes);

      const { error } = await supabase
        .from("consultation_bookings")
        .update({
          requested_time: newDateTime.toISOString(),
          slot_id: null, // Reset slot_id when rescheduling manually
          notes: notes || undefined,
          status: 'pending', // Reset to pending when time changes
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Termín konzultace byl změněn");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error rescheduling:", error);
      toast.error("Nepodařilo se změnit termín");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Změnit termín konzultace</DialogTitle>
          <DialogDescription>
            Vyberte nový datum a čas pro konzultaci
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4" />
              Datum
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={cs}
              className="rounded-md border"
              disabled={(date) => date < new Date()}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" />
              Čas
            </Label>
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block">Poznámka (volitelné)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Důvod změny termínu..."
              className="min-h-[80px]"
            />
          </div>

          {selectedDate && selectedTime && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Nový termín:</p>
              <p className="font-medium">
                {format(selectedDate, "EEEE d. MMMM yyyy", { locale: cs })} v {selectedTime}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleReschedule} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CalendarIcon className="h-4 w-4 mr-2" />
            )}
            Uložit změnu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
