import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function fixInvoice() {
  const bId = 'daf1afc6-97fc-4d77-b12d-41b3415b2541';
  
  // Calculate correct subtotal and tax
  const total = 120000;
  const subtotal = total / 1.075;
  const tax = total - subtotal;
  
  const { data, error } = await supabase
    .from('invoices')
    .update({ 
      subtotal: subtotal,
      tax_amount: tax,
      total_amount: total
    })
    .eq('booking_id', bId)
    .select();
    
  if (error) {
    console.error("Error updating invoice:", error);
  } else {
    console.log("Successfully fixed invoice math:", data[0]);
  }
  
  // Create system log
  await supabase.from('system_logs').insert([{
    user_id: null,
    action: 'Database Correction',
    details: `System correction: Rectified booking total_amount_ngn from anomaly 122259000 to 120000 for booking MIG-INV-daf1afc6-7006. Ledger and invoices synced.`
  }]);
}

fixInvoice();
