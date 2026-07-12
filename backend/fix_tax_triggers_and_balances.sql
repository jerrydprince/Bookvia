-- =========================================================================
-- DATABASE MIGRATION: FIX TAX TRIGGERS AND BALANCES (12.5% Room Tax)
-- =========================================================================

-- 1. Redefine recalculate_booking_total to use 12.5% for rooms, 7.5% for services, and ROUND everything to avoid decimal pennies.
CREATE OR REPLACE FUNCTION public.recalculate_booking_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_tax_rate DECIMAL(5,2) := 7.5;
  v_room_tax_rate DECIMAL(5,2) := 12.5; -- 7.5% VAT + 5% Consumption
  v_room_subtotal DECIMAL(12,2);
  v_room_tax DECIMAL(12,2);
  v_taxable_extras DECIMAL(12,2);
  v_nontaxable_extras DECIMAL(12,2);
  v_extras_tax DECIMAL(12,2);
BEGIN
  v_room_subtotal := GREATEST(0, COALESCE(NEW.total_room_price_ngn, 0) - COALESCE(NEW.discount_amount_ngn, 0));
  v_room_tax := ROUND(v_room_subtotal * (v_room_tax_rate/100));
  
  SELECT 
    COALESCE(SUM(CASE WHEN s.tax_inclusive = TRUE THEN bs.total_price_ngn ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.tax_inclusive = FALSE THEN bs.total_price_ngn ELSE 0 END), 0)
  INTO v_taxable_extras, v_nontaxable_extras
  FROM public.booking_services bs
  JOIN public.services s ON bs.service_id = s.id
  WHERE bs.booking_id = NEW.id AND bs.status != 'cancelled';
  
  NEW.total_extras_price_ngn := ROUND(v_taxable_extras + v_nontaxable_extras);
  v_extras_tax := ROUND(v_taxable_extras * (v_service_tax_rate/100));
  
  NEW.total_amount_ngn := ROUND(v_room_subtotal + v_room_tax + (v_taxable_extras + v_extras_tax) + v_nontaxable_extras);
  
  RETURN NEW;
END;
$$;

-- 2. Redefine sync_booking_to_invoice
CREATE OR REPLACE FUNCTION public.sync_booking_to_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_tax_rate DECIMAL(5,2) := 7.5;
  v_room_tax_rate DECIMAL(5,2) := 12.5;
  v_room_subtotal DECIMAL(12,2);
  v_taxable_extras DECIMAL(12,2);
  v_nontaxable_extras DECIMAL(12,2);
  v_extras_tax DECIMAL(12,2);
  v_subtotal DECIMAL(12,2);
  v_tax DECIMAL(12,2);
BEGIN
  v_room_subtotal := GREATEST(0, COALESCE(NEW.total_room_price_ngn, 0) - COALESCE(NEW.discount_amount_ngn, 0));
  
  SELECT 
    COALESCE(SUM(CASE WHEN s.tax_inclusive = TRUE THEN bs.total_price_ngn ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.tax_inclusive = FALSE THEN bs.total_price_ngn ELSE 0 END), 0)
  INTO v_taxable_extras, v_nontaxable_extras
  FROM public.booking_services bs
  JOIN public.services s ON bs.service_id = s.id
  WHERE bs.booking_id = NEW.id AND bs.status != 'cancelled';

  v_extras_tax := ROUND(v_taxable_extras * (v_service_tax_rate/100));
  v_subtotal := ROUND(COALESCE(NEW.total_room_price_ngn, 0) + v_taxable_extras + v_nontaxable_extras);
  v_tax := ROUND(v_room_subtotal * (v_room_tax_rate/100) + v_extras_tax);

  UPDATE public.invoices
  SET total_amount = ROUND(NEW.total_amount_ngn),
      subtotal = v_subtotal,
      tax_amount = v_tax,
      amount_paid = ROUND(NEW.amount_paid_ngn),
      status = CASE 
        WHEN ROUND(NEW.amount_paid_ngn) >= ROUND(NEW.total_amount_ngn) THEN 'paid'::invoice_status
        WHEN ROUND(NEW.amount_paid_ngn) > 0 THEN 'partial'::invoice_status
        ELSE status
      END,
      updated_at = now()
  WHERE booking_id = NEW.id;

  RETURN NEW;
END;
$$;

-- 3. Redefine sync_booking_services_to_billing
CREATE OR REPLACE FUNCTION public.sync_booking_services_to_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_taxable_extras DECIMAL(12,2);
  v_nontaxable_extras DECIMAL(12,2);
  v_total_extras DECIMAL(12,2);
  v_extras_tax DECIMAL(12,2);
  v_total_room DECIMAL(12,2);
  v_discount DECIMAL(12,2);
  v_amount_paid DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
  v_service_tax_rate DECIMAL(5,2) := 7.5;
  v_room_tax_rate DECIMAL(5,2) := 12.5;
  v_subtotal DECIMAL(12,2);
  v_tax DECIMAL(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_booking_id := OLD.booking_id;
  ELSE
    v_booking_id := NEW.booking_id;
  END IF;

  SELECT 
    COALESCE(SUM(CASE WHEN s.tax_inclusive = TRUE THEN bs.total_price_ngn ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.tax_inclusive = FALSE THEN bs.total_price_ngn ELSE 0 END), 0)
  INTO v_taxable_extras, v_nontaxable_extras
  FROM public.booking_services bs
  JOIN public.services s ON bs.service_id = s.id
  WHERE bs.booking_id = v_booking_id AND bs.status != 'cancelled';

  v_total_extras := ROUND(v_taxable_extras + v_nontaxable_extras);
  v_extras_tax := ROUND(v_taxable_extras * (v_service_tax_rate/100));

  SELECT total_room_price_ngn, COALESCE(discount_amount_ngn, 0), amount_paid_ngn INTO v_total_room, v_discount, v_amount_paid
  FROM public.bookings
  WHERE id = v_booking_id;

  v_subtotal := ROUND(GREATEST(0, COALESCE(v_total_room, 0) + v_total_extras));
  v_tax := ROUND(GREATEST(0, COALESCE(v_total_room, 0) - v_discount) * (v_room_tax_rate/100) + v_extras_tax);
  v_total_amount := ROUND(GREATEST(0, COALESCE(v_total_room, 0) - v_discount) * (1 + v_room_tax_rate/100) + v_taxable_extras + v_extras_tax + v_nontaxable_extras);

  UPDATE public.bookings
  SET total_extras_price_ngn = v_total_extras,
      total_amount_ngn = v_total_amount,
      payment_status = CASE 
        WHEN ROUND(v_amount_paid) >= ROUND(v_total_amount) THEN 'paid'
        WHEN ROUND(v_amount_paid) > 0 THEN 'partial'
        ELSE 'unpaid'
      END,
      updated_at = now()
  WHERE id = v_booking_id;

  IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = v_booking_id) THEN
    UPDATE public.invoices
    SET total_amount = v_total_amount,
        subtotal = v_subtotal,
        tax_amount = v_tax,
        amount_paid = ROUND(v_amount_paid),
        status = CASE 
          WHEN ROUND(v_amount_paid) >= v_total_amount THEN 'paid'::invoice_status
          WHEN ROUND(v_amount_paid) > 0 THEN 'partial'::invoice_status
          ELSE 'sent'::invoice_status
        END,
        updated_at = now()
    WHERE booking_id = v_booking_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. FIX HISTORICAL BOOKING BALANCES
-- My previous script incorrectly divided by 1.075, resulting in ~139535 instead of 133333.
-- And it caused pennies and partial statuses.
-- We must convert them back to the original 150000 by multiplying by 1.075, then divide by 1.125!
-- BUT we also must ensure that the NEW trigger evaluates the EXACT inclusive amount without fractions.

-- We temporarily disable the trigger so we can mass update, then re-enable and manually run the fix, OR we let the trigger do it!
-- If we just update `total_room_price_ngn` to ROUND((total_room_price_ngn * 1.075) / 1.125), the trigger WILL FIRE and recalculate `total_amount_ngn` correctly!

UPDATE public.bookings
SET total_room_price_ngn = ROUND((total_room_price_ngn * 1.075) / 1.125)
WHERE total_room_price_ngn > 0;

-- Some bookings where the inclusive total is e.g. 150,000 might result in 133333.
-- 133333 * 1.125 = 149,999.625 -> ROUNDs to 150,000.
-- So `total_amount_ngn` will become exactly 150,000, perfectly matching `amount_paid_ngn`.

-- Re-sync invoices status for everything
UPDATE public.invoices
SET status = 'paid'::invoice_status
WHERE ROUND(amount_paid) >= ROUND(total_amount);

-- Force reload PGRST cache
NOTIFY pgrst, 'reload schema';
