-- Run this in your Supabase Dashboard SQL Editor to add 'waiver' to the allowed payment methods

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'waiver';

-- Note: Depending on whether the expenses table uses a check constraint instead of the enum, you might also need:
-- ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;
-- ALTER TABLE expenses ADD CONSTRAINT expenses_payment_method_check CHECK (payment_method IN ('stripe', 'paystack', 'paypal', 'bank_transfer', 'pos', 'cash', 'waiver'));
