import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkLedger() {
  const bId = 'daf1afc6-97fc-4d77-b12d-41b3415b2541';

  // Check journals, ledgers, or similar tables. We can search for 122259000
  // Instead of guessing, let's query the database to see which tables contain this amount.
  // We can query payments, journals, ledgers, etc.
  
  const tablesToCheck = ['payments', 'general_ledger', 'journals', 'journal_entries', 'revenue', 'transactions', 'daily_closures'];
  
  for (const table of tablesToCheck) {
     const { data, error } = await supabase
       .from(table)
       .select('*')
       .eq('amount', 122259000)
       .limit(10);
       
     if (!error && data && data.length > 0) {
       console.log(`Found 122259000 in ${table}:`, data);
     }
     
     // also check by booking id if column exists
     const { data: bData, error: bError } = await supabase
       .from(table)
       .select('*')
       .eq('booking_id', bId)
       .limit(10);
       
     if (!bError && bData && bData.length > 0) {
       console.log(`Found booking_id in ${table}:`, bData);
     }
  }
}

checkLedger();
