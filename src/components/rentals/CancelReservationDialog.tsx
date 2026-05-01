import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reservation: {
    id: string;
    property_id: string;
    host_id: string;
    guest_id: string;
    total_amount: number;
    currency: string;
    reservation_code: string;
  } | null;
  onCancelled?: () => void;
}

export const CancelReservationDialog = ({ open, onOpenChange, reservation, onCancelled }: Props) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && reservation) {
      setReason("");
      setRefund(String(reservation.total_amount ?? 0));
    }
  }, [open, reservation]);

  const submit = async () => {
    if (!reservation || !user) return;
    const refundNum = parseFloat(refund) || 0;
    setSaving(true);

    const { error: updErr } = await supabase
      .from("rental_reservations")
      .update({
        booking_status: "cancelled_by_host" as any,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason || null,
        refund_amount: refundNum,
      })
      .eq("id", reservation.id);

    if (updErr) {
      setSaving(false);
      toast({ title: "Chyba", description: updErr.message, variant: "destructive" });
      return;
    }

    if (refundNum > 0) {
      await supabase.from("rental_transactions").insert({
        reservation_id: reservation.id,
        property_id: reservation.property_id,
        host_id: reservation.host_id,
        guest_id: reservation.guest_id,
        type: "refund",
        status: "completed",
        amount: -Math.abs(refundNum),
        currency: reservation.currency,
        payment_method: "other",
        notes: reason ? `Storno: ${reason}` : "Storno hostitelem",
        created_by: user.id,
      });
    }

    setSaving(false);
    toast({ title: "Rezervace stornována" });
    onOpenChange(false);
    onCancelled?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Stornovat rezervaci</DialogTitle>
          <DialogDescription>
            {reservation ? `${reservation.reservation_code} — ${reservation.total_amount.toLocaleString()} ${reservation.currency}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Důvod storna</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Volitelná zpráva pro hosta" />
          </div>
          <div>
            <Label>Částka k vrácení ({reservation?.currency})</Label>
            <Input type="number" step="0.01" min="0" value={refund} onChange={(e) => setRefund(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              Pokud zadáte částku &gt; 0, automaticky se vytvoří refund transakce.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Zpět</Button>
            <Button variant="destructive" onClick={submit} disabled={saving}>
              {saving ? "Stornuji…" : "Stornovat rezervaci"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
