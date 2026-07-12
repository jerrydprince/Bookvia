import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function findMismatches() {
  const { data: bookings } = await supabase.from('bookings').select('id, booking_reference, amount_paid_ngn');
  const { data: payments } = await supabase.from('payments').select('booking_id, amount').eq('status', 'completed');
  
  const paymentSums = {};
  for (const p of payments) {
     if (!p.booking_id) continue;
     paymentSums[p.booking_id] = (paymentSums[p.booking_id] || 0) + Number(p.amount);
  }
  
  let netDiff = 0;
  let totalBookings = 0;
  let totalPayments = 0;
  for (const b of bookings) {
     const paidInBooking = Number(b.amount_paid_ngn || 0);
     const sumOfPayments = paymentSums[b.id] || 0;
     totalBookings += paidInBooking;
     totalPayments += sumOfPayments;
     netDiff += (paidInBooking - sumOfPayments);
  }
  
  // also add payments that have no booking_id
  let unlinkedPayments = 0;
  for (const p of payments) {
     if (!p.booking_id) unlinkedPayments += Number(p.amount);
  }
  
  console.log("Total Bookings amount_paid_ngn:", totalBookings);
  console.log("Total Payments amount (linked to bookings):", totalPayments);
  console.log("Total Payments amount (unlinked):", unlinkedPayments);
  console.log("Net Difference (Bookings - Linked Payments):", netDiff);
  console.log("True Net Difference (Bookings - ALL Payments):", totalBookings - (totalPayments + unlinkedPayments));
}

findMismatches();
