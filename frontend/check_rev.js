import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkRevenue() {
  const { data: bData } = await supabase.from('bookings').select('amount_paid_ngn').eq('id', 'b6b90590-f7d1-4b6a-924d-1dcd0ed37506').single();
  console.log("Booking amount_paid_ngn:", bData.amount_paid_ngn);
  
  const { data: payData } = await supabase.from('payments').select('amount').eq('booking_id', 'b6b90590-f7d1-4b6a-924d-1dcd0ed37506');
  console.log("Payments:", payData.reduce((acc, p) => acc + p.amount, 0));
}

checkRevenue();
