import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkBooking() {
  const bId = 'daf1afc6-97fc-4d77-b12d-41b3415b2541';

  const { data: bData } = await supabase
    .from('bookings')
    .select('*, rooms(room_number, name)')
    .eq('id', bId);
    
  console.log("Booking:", bData[0]);

  const { data: bServices } = await supabase
    .from('booking_services')
    .select('*, services(name)')
    .eq('booking_id', bId);
    
  console.log("Booking Services:", bServices);
  
  const { data: pData } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bId);
    
  console.log("Payments:", pData);
}

checkBooking();
