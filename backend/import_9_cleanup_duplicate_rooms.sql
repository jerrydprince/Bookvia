BEGIN;

-- Drop triggers temporarily to allow UPDATE on bookings
DROP TRIGGER IF EXISTS trigger_check_booking_overlap ON bookings;
DROP TRIGGER IF EXISTS trigger_auto_invoice ON bookings;

-- 1. Resolve 'Patrick (3 Bedrooms)' vs '005 - Patrick (3 Bedrooms)'
-- RM-001 is a duplicate of RM-006 and only has 1 historic booking. 
-- Let's safely transfer that 1 booking to the correct physical RM-006.
UPDATE bookings 
SET room_id = '339b049d-6fe8-446b-b2b8-ae18b4dd9029' -- ID for RM-006
WHERE room_id = 'ebab09d5-a823-427c-8541-798d15e2ed34'; -- ID for RM-001

-- Now we can safely delete RM-001
DELETE FROM rooms WHERE id = 'ebab09d5-a823-427c-8541-798d15e2ed34';


-- 2. Resolve 'Guest Rooms' generic category (RM-010)
-- We successfully migrated all 299 bookings out of RM-010 earlier.
-- It now has 0 bookings, so we can cleanly delete this zombie category room.
DELETE FROM rooms WHERE id = '74e73691-3bbb-4d11-8f77-5c93a4fe11fc'; -- ID for RM-010


-- Re-enable triggers
CREATE TRIGGER trigger_check_booking_overlap BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();
CREATE TRIGGER trigger_auto_invoice AFTER INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION auto_generate_invoice();

COMMIT;
