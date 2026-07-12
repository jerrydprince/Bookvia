-- Task 1: Convert all existing rooms' base prices to be exclusive of 12.5% combined tax
-- (Dividing by 1.125 removes the 7.5% VAT + 5% Consumption Tax that was assumed to be included)
UPDATE public.rooms
SET base_price_ngn = ROUND(base_price_ngn / 1.125);

-- Task 2: Fix historical hard-saved bookings where 7.5% VAT was erroneously applied on top 
-- of the already inclusive 150k rate (which resulted in 161,250).
-- By dividing by 1.075, a 161,250 total drops back to exactly 150,000.
UPDATE public.bookings
SET 
  total_room_price_ngn = ROUND(total_room_price_ngn / 1.075),
  total_amount_ngn = ROUND(total_amount_ngn / 1.075);
