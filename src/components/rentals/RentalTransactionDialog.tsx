import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  PAYMENT_METHODS, TX_TYPE_LABEL, NEGATIVE_TYPES,
  type RentalTransactionType,
} from "@/lib/rentalTransactions";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reservation: {
    id: string;
    property_id: string;
    host_id: string;
    guest_id: string;
    currency: string;
    reservation_code: string;
  } | null;
  defaultType?: RentalTransactionType;
  defaultAmount?: number;
  onSaved?: () => void;
}

export const RentalTransactionDialog = ({ open, onOpenChange, reservation, defaultType = "balance", defaultAmount, onSaved }: Props) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<RentalTransactionType>(defaultType);
  const [amount, setAmount] = useState<string>(defaultAmount != null ? String(defaultAmount) : "");
  const [method, setMethod] = useState<string>("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredAt, setOccurredAt] = useState<string>(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setAmount(defaultAmount != null ? String(defaultAmount) : "");
      setMethod("bank_transfer");
      setReference("");
      setNotes("");
      setOccurredAt(new Date().toISOString().slice(0, 16));
    }
  }, [open, defaultType, defaultAmount]);

  const submit = async () => {
    if (!reservation || !user) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      toast({ title: "Neplatná částka", variant: "destructive" });
      return;
    }
    const signed = NEGATIVE_TYPES.includes(type) ? -Math.abs(num) : Math.abs(num);

    setSaving(true);
    const { error } = await supabase.from("rental_transactions").insert({
      reservation_id: reservation.id,
      property_id: reservation.property_id,
      host_id: reservation.host_id,
      guest_id: reservation.guest_id,
      type,
      status: "completed",
      amount: signed,
      currency: reservation.currency,
      payment_method: method,
      reference: reference || null,
      notes: notes || null,
      occurred_at: new Date(occurredAt).toISOString(),
      created_by: user.id,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Transakce uložena" });
      onOpenChange(false);
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Přidat transakci</DialogTitle>
          <DialogDescription>
            {reservation ? `Rezervace ${reservation.reservation_code}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Typ</Label>
            <Select value={type} onValueChange={(v) => setType(v as RentalTransactionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TX_TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {NEGATIVE_TYPES.includes(type) && (
              <p className="text-xs text-muted-foreground mt-1">Tento typ se uloží jako odchozí (mínus).</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Částka ({reservation?.currency})</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Datum</Label>
              <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Způsob platby</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reference (volitelné)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Variabilní symbol, ID transakce…" />
          </div>

          <div>
            <Label>Poznámka</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Ukládám…" : "Uložit"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
