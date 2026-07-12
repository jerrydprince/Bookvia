import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function fixStatus() {
  const shortRef1 = 'daf1afc6';
  const shortRef2 = 'b6b90590';

  // Fix invoice status to 'paid' if amount_paid >= total_amount
  const { data: invs } = await supabase.from('invoices').select('*');
  let fixedCount = 0;
  for (const inv of invs) {
    if (inv.status !== 'paid' && Number(inv.amount_paid) >= Number(inv.total_amount)) {
       await supabase.from('invoices').update({ status: 'paid' }).eq('id', inv.id);
       fixedCount++;
    }
  }
  console.log(`Fixed status for ${fixedCount} invoices.`);
  
  // Let's also check daily_closures just in case
  const { data: closures } = await supabase.from('daily_closures').select('*');
  console.log(`Found ${closures?.length || 0} closures.`);
  if (closures && closures.length > 0) {
      console.log(closures.map(c => c.total_revenue));
  }
}

fixStatus();
