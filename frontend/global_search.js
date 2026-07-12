import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function globalSearch() {
  // Query multiple tables to see if 122259000 exists anywhere
  const tables = ['bookings', 'payments', 'invoices', 'daily_closures', 'revenue', 'general_ledger', 'system_logs', 'booking_services', 'ar_accounts'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(100);
    if (!error && data) {
      let found = false;
      for (const row of data) {
         const str = JSON.stringify(row);
         if (str.includes('122259000')) {
            console.log(`Found in table ${table}:`, row.id);
            found = true;
         }
      }
    }
  }
  console.log("Global search complete.");
}

globalSearch();
