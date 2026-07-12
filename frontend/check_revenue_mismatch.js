import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkRevenues() {
  // Check sum of amount_paid_ngn in bookings
  const { data: bookings } = await supabase.from('bookings').select('amount_paid_ngn');
  const totalBookingsAmountPaid = bookings.reduce((sum, b) => sum + Number(b.amount_paid_ngn || 0), 0);
  console.log("Total amount_paid_ngn in bookings:", totalBookingsAmountPaid);

  // Check sum of payments
  const { data: payments } = await supabase.from('payments').select('*').eq('status', 'completed');
  let bookingRev = 0;
  let posRev = 0;
  let laundryRev = 0;
  let hallRev = 0;
  let arDep = 0;

  for (const p of payments) {
    const amt = Number(p.amount || 0);
    const isLaundry = p.hall_booking_id == null && p.notes?.toLowerCase().includes('laundry');
    const isPOS = p.hall_booking_id == null && (p.notes?.toLowerCase().includes('pos') || p.notes?.toLowerCase().includes('restaurant') || p.notes?.toLowerCase().includes('f&b'));
    const isARDeposit = p.notes?.toLowerCase().includes('initial ar wallet') ||
                        p.notes?.toLowerCase().includes('prepayment wallet deposit') ||
                        p.notes?.toLowerCase().includes('ar prepayment wallet deposit');
    const isHallBooking = p.hall_booking_id != null || p.transaction_ref?.startsWith('PAY-HALL-') || p.transaction_ref?.startsWith('HALL-WEB-') || p.notes?.toLowerCase().includes('hall booking');

    if (isLaundry) { laundryRev += amt; }
    else if (isPOS) { posRev += amt; }
    else if (isHallBooking) { hallRev += amt; }
    else if (isARDeposit) { arDep += amt; }
    else { bookingRev += amt; }
  }

  console.log("Accounting Breakdown:");
  console.log("- Booking Revenue (from payments):", bookingRev);
  console.log("- POS Revenue (from payments):", posRev);
  console.log("- Laundry Revenue (from payments):", laundryRev);
  console.log("- Hall Revenue (from payments):", hallRev);
  console.log("- AR Deposit:", arDep);
  console.log("Total from payments:", bookingRev + posRev + laundryRev + hallRev + arDep);
}

checkRevenues();
