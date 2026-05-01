-- Transaction type enum
DO $$ BEGIN
  CREATE TYPE public.rental_transaction_type AS ENUM (
    'deposit', 'balance', 'full_payment', 'refund', 'security_deposit',
    'security_deposit_refund', 'discount', 'extra_fee', 'cleaning_fee',
    'cancellation_fee', 'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rental_transaction_status AS ENUM ('pending','completed','failed','refunded','voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Transactions table (manual ledger, ready for future Stripe integration)
CREATE TABLE IF NOT EXISTS public.rental_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.rental_reservations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  type public.rental_transaction_type NOT NULL,
  status public.rental_transaction_status NOT NULL DEFAULT 'completed',
  -- positive = money in (towards host), negative = money out (refund / discount)
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text,            -- cash, bank_transfer, card, stripe, other
  reference text,                 -- external reference / note
  notes text,
  -- future Stripe fields (nullable now)
  stripe_payment_intent_id text,
  stripe_charge_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_transactions_reservation ON public.rental_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_host ON public.rental_transactions(host_id);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_property ON public.rental_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_occurred ON public.rental_transactions(occurred_at DESC);

ALTER TABLE public.rental_transactions ENABLE ROW LEVEL SECURITY;

-- Hosts: full access to their own transactions
CREATE POLICY "Hosts can view own transactions"
  ON public.rental_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL AND host_id = auth.uid());

CREATE POLICY "Hosts can insert own transactions"
  ON public.rental_transactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND host_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "Hosts can update own transactions"
  ON public.rental_transactions FOR UPDATE
  USING (auth.uid() IS NOT NULL AND host_id = auth.uid());

CREATE POLICY "Hosts can delete own transactions"
  ON public.rental_transactions FOR DELETE
  USING (auth.uid() IS NOT NULL AND host_id = auth.uid());

-- Guests: read-only on their own
CREATE POLICY "Guests can view own transactions"
  ON public.rental_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL AND guest_id = auth.uid());

-- Admins
CREATE POLICY "Admins manage all rental transactions"
  ON public.rental_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_rental_transactions_updated_at ON public.rental_transactions;
CREATE TRIGGER trg_rental_transactions_updated_at
  BEFORE UPDATE ON public.rental_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add cancellation tracking columns to reservations
ALTER TABLE public.rental_reservations
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric;

-- Helper: total paid (sum of completed positive txns minus refunds) per reservation
CREATE OR REPLACE FUNCTION public.rental_reservation_balance(p_reservation_id uuid)
RETURNS TABLE (paid numeric, refunded numeric, net numeric, total numeric, outstanding numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  SELECT total_amount INTO v_total FROM rental_reservations WHERE id = p_reservation_id;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 AND status='completed' THEN amount ELSE 0 END),0) AS paid,
    COALESCE(SUM(CASE WHEN amount < 0 AND status='completed' THEN -amount ELSE 0 END),0) AS refunded,
    COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0) AS net,
    COALESCE(v_total,0) AS total,
    COALESCE(v_total,0) - COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0) AS outstanding
  FROM rental_transactions WHERE reservation_id = p_reservation_id;
END $$;