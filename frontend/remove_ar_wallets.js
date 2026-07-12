import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function removeArWallets() {
  const shortIds = ['71c1e303', '9d0c2370', 'd6e91617', 'b9580788'];

  // Fetch guests whose ID starts with these prefixes
  const { data: guests, error } = await supabase.from('crm_guests').select('id, first_name, last_name, wallet_balance');
  
  if (error) {
    console.error("Error fetching guests:", error);
    return;
  }
  
  const guestsToUpdate = guests.filter(g => shortIds.some(shortId => g.id.startsWith(shortId)));
  
  console.log(`Found ${guestsToUpdate.length} guests to update:`, guestsToUpdate.map(g => `${g.id} (${g.first_name} ${g.last_name})`));

  for (const g of guestsToUpdate) {
    const { error: updErr } = await supabase.from('crm_guests').update({ wallet_balance: null }).eq('id', g.id);
    if (updErr) {
      console.error(`Error updating guest ${g.id}:`, updErr);
    } else {
      console.log(`Successfully reset wallet for guest ${g.id}`);
    }
  }
  
  // also check if they are in ar_accounts table
  const { data: arAccounts } = await supabase.from('ar_accounts').select('*');
  if (arAccounts) {
      const arToDel = arAccounts.filter(a => guestsToUpdate.some(g => a.guest_id === g.id) || shortIds.some(short => a.id.includes(short)));
      for (const a of arToDel) {
          await supabase.from('ar_accounts').delete().eq('id', a.id);
          console.log(`Deleted ar_account: ${a.id}`);
      }
  }

  // Log action
  await supabase.from('system_logs').insert([{
    action: 'Database Correction',
    details: `System correction: Removed AR Wallet entries (wallet_balance reset) for guests: ${shortIds.join(', ')} by user request.`
  }]);
  
  console.log("AR Wallet removal complete.");
}

removeArWallets();
