import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkInvoices() {
  const bId = 'daf1afc6-97fc-4d77-b12d-41b3415b2541';

  const { data: invData, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bId);
    
  console.log("Invoices for booking:", invData);

  const { data: bData } = await supabase
    .from('bookings')
    .select('total_amount_ngn, amount_paid_ngn')
    .eq('id', bId);
  console.log("Booking amount now:", bData);
}

checkInvoices();
