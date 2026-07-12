import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

export const processSmsAutomations = async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Automations] Missing Supabase URL or Key, cannot run automations.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    console.log('[Automations] Starting SMS automations check...');
    
    // 1. Fetch active rules
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select('*, notification_templates(*)')
      .eq('is_active', true);
      
    if (rulesError || !rules || rules.length === 0) return;
    
    const smsRules = rules.filter(r => r.notification_templates && r.notification_templates.channel === 'sms');
    if (smsRules.length === 0) return;

    // Get today's bounds
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    for (const rule of smsRules) {
      const trigger = rule.trigger_event;
      const template = rule.notification_templates;
      
      let targetBookings = [];

      // Logic based on trigger
      if (trigger === 'booking_created') {
        // Run for bookings created today
        const { data } = await supabase.from('bookings').select('*, guests(*)').gte('created_at', `${todayStr}T00:00:00.000Z`);
        if (data) targetBookings = data;
      } else if (trigger === 'check_in_morning') {
        // Run morning of check-in (e.g. between 9 AM and 11 AM)
        if (currentHour >= 9 && currentHour <= 11) {
          const { data } = await supabase.from('bookings').select('*, guests(*)').eq('check_in_date', todayStr).in('status', ['confirmed', 'pending']);
          if (data) targetBookings = data;
        }
      } else if (trigger === 'checkout_morning') {
        // Run morning of checkout (e.g. between 9 AM and 11 AM)
        if (currentHour >= 9 && currentHour <= 11) {
          const { data } = await supabase.from('bookings').select('*, guests(*)').eq('check_out_date', todayStr).in('status', ['confirmed', 'checked_in']);
          if (data) targetBookings = data;
        }
      } else if (trigger === 'clear_bills') {
        // Run morning of checkout ONLY if balance_due > 0
        if (currentHour >= 9 && currentHour <= 11) {
          const { data } = await supabase.from('bookings').select('*, guests(*)').eq('check_out_date', todayStr).in('status', ['confirmed', 'checked_in']).gt('balance_due', 0);
          if (data) targetBookings = data;
        }
      } else if (trigger === 'checkout_appreciation') {
        // Run on checkout date but in the afternoon (e.g. between 13:00 and 17:00) OR if status is checked_out
        if (currentHour >= 13 && currentHour <= 17) {
          const { data } = await supabase.from('bookings').select('*, guests(*)').eq('check_out_date', todayStr).eq('status', 'checked_out');
          if (data) targetBookings = data;
        }
      }

      if (targetBookings.length === 0) continue;

      for (const booking of targetBookings) {
        if (!booking.guests || !booking.guests.phone) continue;
        
        const phone = booking.guests.phone;
        const guestName = booking.guests.first_name || 'Guest';

        // Check if already sent today for this exact template and phone
        const { data: logs } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('recipient', phone)
          .eq('template_name', template.name)
          .gte('sent_at', `${todayStr}T00:00:00.000Z`)
          .limit(1);

        if (logs && logs.length > 0) {
          continue; // Already sent today
        }

        // Send SMS
        let parsedBody = template.body.replace(/\{\{guest_name\}\}/g, guestName);
        parsedBody = parsedBody.replace(/\{\{booking_id\}\}/g, booking.booking_reference || booking.id.substring(0, 8));

        console.log(`[Automations] Triggering ${trigger} SMS to ${phone} for booking ${booking.id}`);

        try {
          // Use internal API or direct call (we can just call the local API route or implement dispatch here)
          await axios.post(`http://localhost:${process.env.PORT || 5000}/api/sms/send`, {
            to: phone,
            message: parsedBody
          });

          // Log success
          await supabase.from('notification_logs').insert([{
            recipient: phone,
            channel: 'sms',
            template_name: template.name,
            status: 'delivered',
            sent_at: new Date().toISOString()
          }]);
        } catch (err) {
          console.error(`[Automations] Failed to send SMS to ${phone}:`, err.message);
        }
      }
    }
    
  } catch (err) {
    console.error('[Automations] Error processing SMS automations:', err);
  }
};
