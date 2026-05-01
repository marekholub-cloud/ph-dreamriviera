import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reservationId: string;
  propertyId: string;
  hostId: string;
  onSubmitted?: () => void;
}

interface StarInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

const StarInput = ({ label, value, onChange }: StarInputProps) => (
  <div className="flex items-center justify-between gap-3">
    <Label className="text-sm">{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 hover:scale-110 transition"
          aria-label={`${label}: ${n}`}
        >
          <Star className={cn("h-5 w-5", n <= value ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  </div>
);

export const RentalReviewForm = ({ open, onOpenChange, reservationId, propertyId, hostId, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [overall, setOverall] = useState(5);
  const [cleanliness, setCleanliness] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [checkin, setCheckin] = useState(5);
  const [accuracy, setAccuracy] = useState(5);
  const [location, setLocation] = useState(5);
  const [valueR, setValueR] = useState(5);
  const [publicComment, setPublicComment] = useState("");
  const [privateFeedback, setPrivateFeedback] = useState("");

  const handleSubmit = async () => {
    if (!user) return;
    if (overall < 1) {
      toast({ title: "Vyberte celkové hodnocení", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("rental_reviews").insert({
      reservation_id: reservationId,
      property_id: propertyId,
      guest_id: user.id,
      host_id: hostId,
      overall_rating: overall,
      cleanliness_rating: cleanliness,
      communication_rating: communication,
      checkin_rating: checkin,
      accuracy_rating: accuracy,
      location_rating: location,
      value_rating: valueR,
      public_comment: publicComment.trim() || null,
      private_feedback: privateFeedback.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Chyba odeslání", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Děkujeme za recenzi!" });
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Ohodnoťte svůj pobyt</DialogTitle>
          <DialogDescription>Vaše hodnocení pomůže ostatním hostům.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <StarInput label="Celkové hodnocení *" value={overall} onChange={setOverall} />
          <StarInput label="Čistota" value={cleanliness} onChange={setCleanliness} />
          <StarInput label="Komunikace" value={communication} onChange={setCommunication} />
          <StarInput label="Check-in" value={checkin} onChange={setCheckin} />
          <StarInput label="Přesnost popisu" value={accuracy} onChange={setAccuracy} />
          <StarInput label="Lokalita" value={location} onChange={setLocation} />
          <StarInput label="Poměr cena/výkon" value={valueR} onChange={setValueR} />

          <div className="grid gap-2 mt-2">
            <Label>Veřejná recenze</Label>
            <Textarea value={publicComment} onChange={(e) => setPublicComment(e.target.value)} rows={4} placeholder="Co se vám líbilo, co byste vyzdvihli…" />
          </div>

          <div className="grid gap-2">
            <Label>Soukromá zpráva pro hostitele</Label>
            <Textarea value={privateFeedback} onChange={(e) => setPrivateFeedback(e.target.value)} rows={3} placeholder="Tip pro hostitele, který se nezobrazí veřejně" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Odeslat recenzi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
