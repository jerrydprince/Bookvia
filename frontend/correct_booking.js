import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function correctBooking() {
  const bId = 'daf1afc6-97fc-4d77-b12d-41b3415b2541';

  // We want to fix total_amount_ngn to 120000
  const { data, error } = await supabase
    .from('bookings')
    .update({ total_amount_ngn: 120000 })
    .eq('id', bId)
    .select();
    
  if (error) {
    console.error("Error updating booking:", error);
  } else {
    console.log("Successfully corrected booking:", data[0].total_amount_ngn);
  }
}

correctBooking();
