import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { PhoneInputWithValidation } from "@/components/PhoneInputWithValidation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, isWeekend, isBefore, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";
import { getAffiliateCode } from "@/utils/affiliateCode";
import confetti from "canvas-confetti";

interface ConsultationRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

export const ConsultationRequestDialog = ({ open, onOpenChange }: ConsultationRequestDialogProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error("Vyplňte prosím všechna povinná pole");
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("Vyberte prosím datum a čas konzultace");
      return;
    }

    setIsSubmitting(true);

    try {
      const affiliateCode = getAffiliateCode();
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const preferredTime = `${format(selectedDate, "yyyy-MM-dd")} ${selectedTime}`;
      const requestedTimeISO = `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`;

      // Create lead via edge function (bypasses RLS)
      const { data: leadResult, error: leadError } = await supabase.functions.invoke("create-or-update-lead", {
        body: {
          name: fullName,
          phone: phone.trim(),
          source_type: "contact_form",
          source_page: window.location.href,
          affiliate_code: affiliateCode,
          preferred_contact_time: preferredTime,
          message: "Rychlá poptávka konzultace z webu",
        },
      });

      if (leadError) {
        console.error("Error creating lead:", leadError);
        throw new Error("Nepodařilo se vytvořit poptávku");
      }

      const leadId = leadResult?.lead_id;
      if (!leadId) {
        console.error("No lead_id in response:", leadResult);
        throw new Error("Nepodařilo se vytvořit poptávku");
      }

      // Book consultation
      const { error: bookingError } = await supabase.functions.invoke("book-consultation", {
        body: {
          lead_id: leadId,
          requested_time: requestedTimeISO,
          investor_notes: "Rychlá poptávka z webu",
        },
      });

      if (bookingError) {
        console.error("Error booking consultation:", bookingError);
        // Continue even if booking fails - lead was created
      }

      // Success
      setIsSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success("Děkujeme! Brzy vás budeme kontaktovat.");

      // Reset after delay
      setTimeout(() => {
        setIsSuccess(false);
        setFirstName("");
        setLastName("");
        setPhone("");
        setSelectedDate(undefined);
        setSelectedTime(undefined);
        onOpenChange(false);
      }, 3000);

    } catch (error) {
      console.error("Error submitting consultation request:", error);
      toast.error("Něco se pokazilo. Zkuste to prosím znovu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabledDays = (date: Date) => {
    const today = startOfDay(new Date());
    // Disable past dates and Sundays (0 = Sunday)
    return isBefore(date, today) || date.getDay() === 0;
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Děkujeme za váš zájem!</h3>
            <p className="text-muted-foreground">
              Brzy vás budeme kontaktovat ohledně vaší konzultace.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Chci více informací, kontaktujte mě
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Jméno *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jan"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Příjmení *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Novák"
                required
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon *</Label>
            <PhoneInputWithValidation
              value={phone}
              onChange={setPhone}
              required
              placeholder="777 123 456"
            />
          </div>

          {/* Date selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Vyberte termín konzultace
            </Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                locale={cs}
                fromDate={new Date()}
                toDate={addDays(new Date(), 60)}
                className="rounded-md border pointer-events-auto"
              />
            </div>
          </div>

          {/* Time selection */}
          {selectedDate && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Vyberte čas ({format(selectedDate, "d. MMMM", { locale: cs })})
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(time)}
                    className="w-full"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Selected summary */}
          {selectedDate && selectedTime && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <strong>Vybraný termín:</strong>{" "}
              {format(selectedDate, "EEEE d. MMMM yyyy", { locale: cs })} v {selectedTime}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !firstName || !lastName || !phone || !selectedDate || !selectedTime}
          >
            {isSubmitting ? "Odesílám..." : "Odeslat"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
