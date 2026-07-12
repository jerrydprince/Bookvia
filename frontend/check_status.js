import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkBookingStatus() {
  const shortRef2 = 'b6b90590-f7d1-4b6a-924d-1dcd0ed37506';

  const { data: bData } = await supabase.from('bookings').select('payment_status, total_amount_ngn, amount_paid_ngn').eq('id', shortRef2).single();
  console.log("Booking:", bData);
  
  if (bData.payment_status !== 'paid' && bData.amount_paid_ngn >= bData.total_amount_ngn) {
     await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', shortRef2);
     console.log("Updated booking payment_status to paid");
  }

  const { data: invData } = await supabase.from('invoices').select('status, total_amount, amount_paid').eq('booking_id', shortRef2).single();
  console.log("Invoice:", invData);
  
  if (invData && invData.status !== 'paid' && invData.amount_paid >= invData.total_amount) {
     await supabase.from('invoices').update({ status: 'paid' }).eq('booking_id', shortRef2);
     console.log("Updated invoice status to paid");
  }
}

checkBookingStatus();
