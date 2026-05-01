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
import { Loader2, CalendarPlus, Clock, Calendar as CalendarIcon } from "lucide-react";

interface ScheduleConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  isReschedule?: boolean;
  onSuccess: () => void;
}

export function ScheduleConsultationDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  isReschedule = false,
  onSuccess,
}: ScheduleConsultationDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Vyberte datum a čas");
      return;
    }

    setSaving(true);
    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const scheduledDateTime = setMinutes(setHours(selectedDate, hours), minutes);

      if (isReschedule) {
        // Update existing booking
        const { error } = await supabase
          .from("consultation_bookings")
          .update({
            requested_time: scheduledDateTime.toISOString(),
            slot_id: null,
            notes: notes || undefined,
            status: 'pending',
          })
          .eq("lead_id", leadId);

        if (error) throw error;
        toast.success("Termín konzultace byl změněn");
      } else {
        // Create new booking via edge function
        const { error } = await supabase.functions.invoke("book-consultation", {
          body: {
            lead_id: leadId,
            requested_time: scheduledDateTime.toISOString(),
            investor_notes: notes || "Naplánováno obchodníkem",
          },
        });

        if (error) throw error;
        toast.success("Konzultace byla naplánována");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error scheduling consultation:", error);
      toast.error("Nepodařilo se naplánovat konzultaci");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isReschedule ? "Změnit termín konzultace" : "Naplánovat konzultaci"}
          </DialogTitle>
          <DialogDescription>
            {isReschedule
              ? "Vyberte nový datum a čas pro konzultaci"
              : `Naplánujte konzultaci pro ${leadName}`
            }
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
              placeholder="Poznámka k rezervaci..."
              className="min-h-[80px]"
            />
          </div>

          {selectedDate && selectedTime && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Termín:</p>
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
          <Button onClick={handleSchedule} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CalendarPlus className="h-4 w-4 mr-2" />
            )}
            {isReschedule ? "Uložit změnu" : "Naplánovat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
