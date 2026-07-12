import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkBooking() {
  const bId = 'b6b90590-f7d1-4b6a-924d-1dcd0ed37506';

  const { data: bData } = await supabase
    .from('bookings')
    .select('group_account_id, bill_to_group, amount_paid_ngn, total_amount_ngn')
    .eq('id', bId);
    
  console.log("Booking details:", bData[0]);
}

checkBooking();
