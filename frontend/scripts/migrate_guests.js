import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = 'https://pjmdlifojfwoviyugjwq.supabase.co';
const key = 'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9';
const supabase = createClient(url, key);

function parseSqlInserts(filePath, tableName, numFields) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const index = lines.findIndex(l => l.includes(`INSERT INTO \`${tableName}\``));
  if (index === -1) return [];

  let fullInsert = lines[index];
  let currentIdx = index + 1;
  while (!fullInsert.endsWith(';') && currentIdx < lines.length) {
    fullInsert += lines[currentIdx];
    currentIdx++;
  }

  // Quick manual splitting by '),(' to be safer
  const valuesStr = fullInsert.substring(fullInsert.indexOf('VALUES') + 6).trim();
  const rawRows = valuesStr.split(/\),\s*\(/);
  
  const rows = [];
  for (let raw of rawRows) {
    raw = raw.replace(/^\(/, '').replace(/\);?$/, '');
    // Split by comma, respecting quotes
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === "'" && (i === 0 || raw[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (raw[i] === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += raw[i];
      }
    }
    fields.push(currentField);
    
    // Clean fields
    const cleaned = fields.map(f => {
      let val = f.trim();
      if (val === 'NULL') return null;
      if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
      return val;
    });
    rows.push(cleaned);
  }
  return rows;
}

async function migrate() {
  const mphbRows = parseSqlInserts('../previous databases/sparkle7_wp_ovaru.sql', 'V9FFLZ7ap_mphb_customers', 14);
  const wcRows = parseSqlInserts('../previous databases/sparkle7_wp_ovaru.sql', 'V9FFLZ7ap_wc_customer_lookup', 12);
  
  const guestsMap = new Map();
  
  for (const row of wcRows) {
    const email = row[5];
    if (!email || email === 'NULL') continue;
    
    guestsMap.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      first_name: row[3] !== 'NULL' ? row[3] : '',
      last_name: row[4] !== 'NULL' ? row[4] : '',
      nationality: row[8] !== 'NULL' ? row[8] : '',
      phone: '', 
      segment: 'standard',
      vip_status: false,
      wallet_balance: 0,
      loyalty_points: 0
    });
  }
  
  for (const row of mphbRows) {
    const email = row[2];
    if (!email || email === 'NULL') continue;
    const emailLower = email.toLowerCase();
    
    const existing = guestsMap.get(emailLower) || {
      email: emailLower,
      segment: 'standard',
      vip_status: false,
      wallet_balance: 0,
      loyalty_points: 0
    };
    
    existing.first_name = row[3] !== 'NULL' ? row[3] : existing.first_name;
    existing.last_name = row[4] !== 'NULL' ? row[4] : existing.last_name;
    existing.phone = row[5] !== 'NULL' ? row[5] : existing.phone;
    existing.nationality = row[6] !== 'NULL' ? row[6] : existing.nationality;
    
    guestsMap.set(emailLower, existing);
  }
  
  const finalGuests = Array.from(guestsMap.values());
  console.log(`Extracted ${finalGuests.length} unique guests.`);
  
  if (finalGuests.length === 0) {
    console.log("No guests found in SQL dumps!");
    return;
  }
  
  const chunkSize = 50;
  for (let i = 0; i < finalGuests.length; i += chunkSize) {
    const chunk = finalGuests.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('crm_guests').insert(chunk);
    if (error) {
      console.error(`Error inserting chunk ${i}:`, error.message);
    } else {
      console.log(`Inserted chunk ${i} to ${i + chunk.length}`);
    }
  }
  
  console.log("Migration finished.");
}

migrate();
