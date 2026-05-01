import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  propertyId: string;
  hostId: string;
  reservationId?: string;
  propertyTitle: string;
}

export const ContactHostButton = ({ propertyId, hostId, reservationId, propertyTitle }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (user.id === hostId) {
      toast({ title: "You can't message yourself" });
      return;
    }
    setOpen(true);
  };

  const send = async () => {
    if (!user || !body.trim()) return;
    setSending(true);

    // Find or create thread
    let threadId: string | null = null;
    if (reservationId) {
      const { data: existing } = await supabase
        .from("rental_message_threads")
        .select("id")
        .eq("reservation_id", reservationId)
        .maybeSingle();
      threadId = existing?.id || null;
    }
    if (!threadId) {
      const { data: existing } = await supabase
        .from("rental_message_threads")
        .select("id")
        .eq("property_id", propertyId)
        .eq("guest_id", user.id)
        .eq("host_id", hostId)
        .is("reservation_id", null)
        .maybeSingle();
      threadId = existing?.id || null;
    }
    if (!threadId) {
      const { data: created, error } = await supabase
        .from("rental_message_threads")
        .insert({
          property_id: propertyId,
          host_id: hostId,
          guest_id: user.id,
          reservation_id: reservationId || null,
          subject: `Inquiry: ${propertyTitle}`,
        })
        .select("id")
        .single();
      if (error) {
        setSending(false);
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      threadId = created.id;
    }

    const { error: msgErr } = await supabase.from("rental_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      body: body.trim(),
    });
    setSending(false);
    if (msgErr) {
      toast({ title: "Error", description: msgErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Message sent", description: "The host will reply in your Messages section." });
    setBody("");
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" className="w-full" onClick={handleClick}>
        <MessageSquare className="h-4 w-4 mr-2" /> Message the host
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Message the host</DialogTitle>
            <DialogDescription>{propertyTitle}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Hi, I have a question about…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} disabled={sending || !body.trim()}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
