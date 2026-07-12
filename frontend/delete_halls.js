import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function inspectAndDelete() {
  const invoiceNumbers = [
    'INV-HALL-20260622-e268',
    'INV-HALL-20260622-c491',
    'INV-HALL-20260622-8053',
    'INV-HALL-20260622-8ae2',
    'INV-HALL-20260622-7ce6',
    'INV-HALL-20260622-ae00',
    'INV-HALL-20260621-3caf',
    'INV-HALL-20260621-5a77',
    'INV-HALL-20260621-6980'
  ];

  // Fetch invoices
  const { data: invoices, error: invErr } = await supabase.from('invoices').select('*').in('invoice_number', invoiceNumbers);
  
  if (invErr) {
    console.error("Error fetching invoices:", invErr);
    return;
  }
  
  console.log(`Found ${invoices.length} invoices to delete.`);
  
  const hallBookingIds = invoices.map(i => i.hall_booking_id).filter(id => id != null);
  
  console.log("Associated hall_booking_ids:", hallBookingIds);

  // Fetch payments
  const { data: payments } = await supabase.from('payments').select('id, amount').in('hall_booking_id', hallBookingIds);
  console.log(`Found ${payments?.length || 0} associated payments to delete.`);

  // PERFORM DELETIONS
  
  // 1. Delete payments
  if (hallBookingIds.length > 0) {
      const { error: payDelErr } = await supabase.from('payments').delete().in('hall_booking_id', hallBookingIds);
      if (payDelErr) console.error("Error deleting payments:", payDelErr);
      else console.log("Payments deleted.");
  }

  // 2. Delete invoices
  const invoiceIds = invoices.map(i => i.id);
  if (invoiceIds.length > 0) {
      const { error: invDelErr } = await supabase.from('invoices').delete().in('id', invoiceIds);
      if (invDelErr) console.error("Error deleting invoices:", invDelErr);
      else console.log("Invoices deleted.");
  }
  
  // 3. Delete hall_bookings
  if (hallBookingIds.length > 0) {
      const { error: hallDelErr } = await supabase.from('hall_bookings').delete().in('id', hallBookingIds);
      if (hallDelErr) console.error("Error deleting hall bookings:", hallDelErr);
      else console.log("Hall bookings deleted.");
  }

  // Log action
  await supabase.from('system_logs').insert([{
    action: 'Database Correction',
    details: `System correction: Deleted ${invoices.length} rogue hall booking entries and associated payments/invoices by user request.`
  }]);
  
  console.log("Deletion complete.");
}

inspectAndDelete();
