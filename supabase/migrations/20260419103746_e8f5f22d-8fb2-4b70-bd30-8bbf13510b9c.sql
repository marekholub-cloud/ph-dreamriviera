-- Threads vázané na rezervaci (volitelně) a property
CREATE TABLE public.rental_message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.rental_reservations(id) ON DELETE SET NULL,
  guest_id uuid NOT NULL,
  host_id uuid NOT NULL,
  subject text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  guest_unread_count integer NOT NULL DEFAULT 0,
  host_unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rmt_guest ON public.rental_message_threads(guest_id, last_message_at DESC);
CREATE INDEX idx_rmt_host ON public.rental_message_threads(host_id, last_message_at DESC);
CREATE INDEX idx_rmt_property ON public.rental_message_threads(property_id);
CREATE UNIQUE INDEX uq_rmt_reservation ON public.rental_message_threads(reservation_id) WHERE reservation_id IS NOT NULL;

CREATE TABLE public.rental_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.rental_message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rm_thread ON public.rental_messages(thread_id, created_at);

ALTER TABLE public.rental_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_messages ENABLE ROW LEVEL SECURITY;

-- Threads: účastníci (guest/host) a admin
CREATE POLICY "Participants can view threads"
  ON public.rental_message_threads FOR SELECT
  USING (auth.uid() IS NOT NULL AND (guest_id = auth.uid() OR host_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated guests can create threads"
  ON public.rental_message_threads FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND guest_id = auth.uid()
              AND EXISTS (SELECT 1 FROM rental_properties p WHERE p.id = property_id AND p.owner_id = host_id));

CREATE POLICY "Participants can update threads"
  ON public.rental_message_threads FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (guest_id = auth.uid() OR host_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete threads"
  ON public.rental_message_threads FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Messages
CREATE POLICY "Participants can view messages"
  ON public.rental_messages FOR SELECT
  USING (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM rental_message_threads t WHERE t.id = thread_id
    AND (t.guest_id = auth.uid() OR t.host_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "Participants can send messages"
  ON public.rental_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM rental_message_threads t WHERE t.id = thread_id
                AND (t.guest_id = auth.uid() OR t.host_id = auth.uid())));

CREATE POLICY "Senders can update own messages"
  ON public.rental_messages FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (sender_id = auth.uid() OR EXISTS (
    SELECT 1 FROM rental_message_threads t WHERE t.id = thread_id
    AND (t.guest_id = auth.uid() OR t.host_id = auth.uid())
  )));

-- Trigger: po vložení zprávy aktualizuj last_message_at + unread counts
CREATE OR REPLACE FUNCTION public.bump_thread_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest uuid; v_host uuid;
BEGIN
  SELECT guest_id, host_id INTO v_guest, v_host FROM rental_message_threads WHERE id = NEW.thread_id;
  UPDATE rental_message_threads
  SET last_message_at = NEW.created_at,
      updated_at = now(),
      guest_unread_count = CASE WHEN NEW.sender_id = v_host THEN guest_unread_count + 1 ELSE guest_unread_count END,
      host_unread_count  = CASE WHEN NEW.sender_id = v_guest THEN host_unread_count + 1 ELSE host_unread_count END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_thread AFTER INSERT ON public.rental_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_thread_on_message();

CREATE TRIGGER trg_rmt_updated BEFORE UPDATE ON public.rental_message_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_message_threads;