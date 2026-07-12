BEGIN;

-- Drop triggers temporarily to allow UPDATE on historic double-booked rooms
DROP TRIGGER IF EXISTS trigger_check_booking_overlap ON bookings;
DROP TRIGGER IF EXISTS trigger_auto_invoice ON bookings;

-- 1. Fix sorting/pagination issue by resetting created_at on migrated bookings to match their check-in dates
-- This pushes historical bookings back chronologically so they stop flooding page 1 of current active records.
UPDATE bookings
SET created_at = check_in_date::timestamp
WHERE check_in_date < CURRENT_DATE AND created_at >= CURRENT_DATE;

-- 2. Generate Invoices for historic bookings
INSERT INTO invoices (booking_id, invoice_number, issue_date, due_date, subtotal, tax_rate_percent, tax_amount, total_amount, amount_paid, status, created_at, updated_at)
SELECT 
  id,
  'MIG-INV-' || substr(id::text, 1, 8) || '-' || substr(md5(random()::text), 1, 4),
  check_in_date,
  check_in_date,
  total_amount_ngn / 1.075,
  7.5,
  total_amount_ngn - (total_amount_ngn / 1.075),
  total_amount_ngn,
  amount_paid_ngn,
  CASE 
    WHEN amount_paid_ngn >= total_amount_ngn THEN 'paid'::invoice_status
    WHEN amount_paid_ngn > 0 THEN 'partial'::invoice_status
    ELSE 'draft'::invoice_status
  END,
  check_in_date::timestamp,
  check_in_date::timestamp
FROM bookings b
WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.booking_id = b.id);

-- 3. Generate Payments for historic bookings so they reflect in Finance & Audit ledgers
INSERT INTO payments (booking_id, amount, currency, method, transaction_ref, status, processed_at)
SELECT 
  id,
  amount_paid_ngn,
  'NGN',
  'bank_transfer'::payment_method,
  'MIG-PAY-' || substr(id::text, 1, 8) || '-' || substr(md5(random()::text), 1, 4),
  'completed'::payment_status,
  check_in_date::timestamp
FROM bookings b
WHERE amount_paid_ngn > 0
AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.id);

CREATE TRIGGER trigger_check_booking_overlap BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();
CREATE TRIGGER trigger_auto_invoice AFTER INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION auto_generate_invoice();

COMMIT;
