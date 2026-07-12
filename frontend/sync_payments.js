import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function syncPayments() {
  const { data: bookings } = await supabase.from('bookings').select('id, booking_reference, amount_paid_ngn, created_at, guest_name');
  const { data: payments } = await supabase.from('payments').select('booking_id, amount').eq('status', 'completed');
  
  const paymentSums = {};
  for (const p of payments) {
     if (!p.booking_id) continue;
     paymentSums[p.booking_id] = (paymentSums[p.booking_id] || 0) + Number(p.amount);
  }
  
  const missingPayments = [];
  
  for (const b of bookings) {
     const paidInBooking = Number(b.amount_paid_ngn || 0);
     const sumOfPayments = paymentSums[b.id] || 0;
     
     if (paidInBooking > sumOfPayments) {
         const diff = paidInBooking - sumOfPayments;
         if (diff > 1) { // more than 1 naira diff
             missingPayments.push({
                 booking_id: b.id,
                 processed_by: null,
                 amount: diff,
                 currency: 'NGN',
                 method: 'bank_transfer', // Default assumption
                 transaction_ref: `RECONCILE-${b.booking_reference}-${Date.now().toString().slice(-4)}`,
                 status: 'completed',
                 processed_at: b.created_at,
                 is_refund: false,
                 notes: `System Reconciliation: Missing payment record for ${b.guest_name}`
             });
         }
     }
  }
  
  console.log(`Found ${missingPayments.length} missing payments to insert. Total missing amount: ${missingPayments.reduce((acc, curr) => acc + curr.amount, 0)}`);
  
  if (missingPayments.length > 0) {
      // Chunk inserts to avoid large payload errors
      const chunkSize = 100;
      for (let i = 0; i < missingPayments.length; i += chunkSize) {
          const chunk = missingPayments.slice(i, i + chunkSize);
          const { error } = await supabase.from('payments').insert(chunk);
          if (error) {
              console.error("Error inserting chunk:", error);
          } else {
              console.log(`Inserted chunk ${i / chunkSize + 1}`);
          }
      }
      console.log("Reconciliation complete.");
      
      await supabase.from('system_logs').insert([{
        user_id: null,
        action: 'Database Correction',
        details: `System correction: Reconciled ${missingPayments.length} missing payment records to sync General Ledger with Booking Revenue.`
      }]);
  }
}

syncPayments();
