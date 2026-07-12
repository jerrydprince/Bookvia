import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function findAnomalies() {
  const { data: bData } = await supabase
    .from('bookings')
    .select('id, booking_reference, total_amount_ngn, amount_paid_ngn, total_room_price_ngn')
    .gt('total_amount_ngn', 5000000);
    
  console.log("Bookings with total_amount > 5m:", bData?.map(b => `${b.booking_reference}: tot=${b.total_amount_ngn}, pd=${b.amount_paid_ngn}, room=${b.total_room_price_ngn}`));

  const { data: bData2 } = await supabase
    .from('bookings')
    .select('id, booking_reference, total_amount_ngn, amount_paid_ngn, total_room_price_ngn')
    .gt('amount_paid_ngn', 5000000);
    
  console.log("Bookings with amount_paid > 5m:", bData2?.map(b => `${b.booking_reference}: pd=${b.amount_paid_ngn}`));
}

findAnomalies();
