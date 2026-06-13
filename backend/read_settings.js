import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking system_settings table...");
  const { data, error } = await supabase.from('system_settings').select('*');
  if (error) {
    console.error("Error reading system_settings:", error);
  } else {
    console.log("System settings found:", data.length);
    data.forEach(row => {
      console.log(`- Key: ${row.setting_key}, Value type: ${typeof row.setting_value}`);
      if (row.setting_key.includes('paystack') || row.setting_key === 'hotel_bank_name') {
        console.log(`  Value:`, row.setting_value);
      }
    });
  }
}
check();
