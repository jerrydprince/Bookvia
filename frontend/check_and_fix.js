import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkAndFixBooking() {
  const shortRef = 'b6b90590';
  
  // 1. Find the booking ID using the invoice number or booking ID matching the short ref
  let bId = null;
  const { data: invData } = await supabase.from('invoices').select('*').ilike('invoice_number', `%${shortRef}%`);
  
  if (invData && invData.length > 0) {
    bId = invData[0].booking_id;
    console.log("Found invoice:", invData[0]);
  } else {
    // try bookings directly
    const { data: bData } = await supabase.from('bookings').select('*').ilike('id', `%${shortRef}%`);
    if (bData && bData.length > 0) {
       bId = bData[0].id;
    }
  }
  
  if (!bId) {
    console.log("Could not find booking for", shortRef);
    return;
  }
  
  const { data: bookingData } = await supabase.from('bookings').select('*').eq('id', bId).single();
  console.log("Found booking:", {
     id: bookingData.id,
     total_room_price_ngn: bookingData.total_room_price_ngn,
     total_extras_price_ngn: bookingData.total_extras_price_ngn,
     total_amount_ngn: bookingData.total_amount_ngn,
     amount_paid_ngn: bookingData.amount_paid_ngn
  });
  
  const { data: payData } = await supabase.from('payments').select('*').eq('booking_id', bId);
  console.log("Payments:", payData.map(p => p.amount));

  // Determine correct total amount (usually amount_paid_ngn or total_room_price_ngn + total_extras_price_ngn)
  let correctTotal = Number(bookingData.total_room_price_ngn) + Number(bookingData.total_extras_price_ngn);
  
  if (bookingData.total_amount_ngn !== correctTotal) {
      console.log(`Mismatch detected! Current total_amount_ngn: ${bookingData.total_amount_ngn}. Correcting to: ${correctTotal}`);
      
      await supabase.from('bookings').update({ total_amount_ngn: correctTotal }).eq('id', bId);
      
      // Update invoice math
      const subtotal = correctTotal / 1.075;
      const tax = correctTotal - subtotal;
      
      await supabase.from('invoices').update({
         subtotal: subtotal,
         tax_amount: tax,
         total_amount: correctTotal
      }).eq('booking_id', bId);
      
      // Create system log
      await supabase.from('system_logs').insert([{
        user_id: null,
        action: 'Database Correction',
        details: `System correction: Rectified booking total_amount_ngn from anomaly ${bookingData.total_amount_ngn} to ${correctTotal} for booking ${shortRef}. Ledger and invoices synced.`
      }]);
      
      console.log("Correction applied successfully.");
  } else {
      console.log("Booking total_amount_ngn is already correct.");
  }
}

checkAndFixBooking();
