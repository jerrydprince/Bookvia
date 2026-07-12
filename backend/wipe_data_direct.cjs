require('dotenv').config({ path: '../frontend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function wipeData() {
  const tables = [
    // Accounting
    'payments', 'payouts', 'shift_logs', 'expenses', 'ledger_entries',
    // Bookings
    'bookings', 'hall_rentals', 'group_accounts', 'invoices',
    // Guests
    'crm_guests', 'ar_accounts', 'communication_logs'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      if (error.code === '42P01') {
        console.log(`Table ${table} does not exist, skipping.`);
      } else {
        console.error(`Error deleting from ${table}:`, error.message);
      }
    } else {
      console.log(`Successfully cleared ${table}.`);
    }
  }

  console.log("Data wipe completed.");
}

wipeData();
