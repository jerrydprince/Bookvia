require('dotenv').config({ path: 'C:/Users/jerry/Desktop/Apartment booking project/frontend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function wipeData() {
  console.log("Wiping accounting data...");
  let { error: err1 } = await supabase.rpc('reset_accounting_data');
  if (err1) console.error("Accounting wipe error:", err1);
  else console.log("Accounting data wiped.");

  console.log("Wiping booking data...");
  let { error: err2 } = await supabase.rpc('reset_booking_data');
  if (err2) console.error("Booking wipe error:", err2);
  else console.log("Booking data wiped.");

  console.log("Wiping guest directory data...");
  let { error: err3 } = await supabase.rpc('reset_guest_directory_data');
  if (err3) console.error("Guest directory wipe error:", err3);
  else console.log("Guest directory data wiped.");

  console.log("Data wipe completed.");
}

wipeData();
