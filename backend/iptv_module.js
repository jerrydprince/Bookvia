import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export const setupIPTVModule = (app) => {
  
  // 1. Webhook triggered when a guest checks in from PMS
  // In a real system, this might be called by the existing check-in logic
  app.post('/api/iptv/webhook/check-in', async (req, res) => {
    const { room_id, guest_id, booking_id } = req.body;
    
    try {
      // Find the IPTV device for this room
      const { data: device, error: deviceErr } = await supabase
        .from('iptv_devices')
        .select('id')
        .eq('room_id', room_id)
        .single();
        
      if (deviceErr) console.warn('[IPTV Sync] No device found for room', room_id);
      
      // End any existing active sessions for this room
      await supabase
        .from('iptv_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('room_id', room_id)
        .eq('status', 'active');
        
      // Create a new IPTV session
      const { data, error } = await supabase
        .from('iptv_sessions')
        .insert([{
          room_id,
          guest_id,
          booking_id,
          device_id: device ? device.id : null,
          status: 'active',
          started_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (error) throw error;
      res.json({ success: true, session: data });
    } catch (err) {
      console.error('[IPTV Check-in Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Webhook triggered when guest checks out
  app.post('/api/iptv/webhook/check-out', async (req, res) => {
    const { room_id } = req.body;
    
    try {
      await supabase
        .from('iptv_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('room_id', room_id)
        .eq('status', 'active');
        
      res.json({ success: true });
    } catch (err) {
      console.error('[IPTV Check-out Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. API for TV to fetch Welcome Screen info
  app.get('/api/iptv/tv/:room_id/welcome', async (req, res) => {
    const { room_id } = req.params;
    
    try {
      // Fetch the active booking for this room directly from the live bookings table
      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .select(`
          id,
          check_out_date,
          profiles!guest_id (first_name, last_name, title),
          rooms!room_id (room_number)
        `)
        .eq('room_id', room_id)
        .eq('status', 'checked_in')
        .maybeSingle();

      if (bookingErr) throw bookingErr;
      
      if (!booking) {
        return res.json({ 
          success: true, 
          is_occupied: false,
          data: null 
        });
      }

      // Format response according to requirements
      const guestProfile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
      const roomInfo = Array.isArray(booking.rooms) ? booking.rooms[0] : booking.rooms;
      
      const guestName = guestProfile 
        ? `${guestProfile.title || 'Mr/Ms.'} ${guestProfile.first_name} ${guestProfile.last_name}`.trim()
        : 'Valued Guest';

      res.json({
        success: true,
        is_occupied: true,
        data: {
          guest_name: guestName,
          room_number: roomInfo?.room_number || room_id,
          check_out_date: booking.check_out_date || 'Unknown',
          wifi_network: 'Sparkles Guest',
          wifi_password: 'Password123!', // Could be fetched from system settings dynamically
          weather: {
            temp: '26°C',
            condition: 'Clear Sky'
          }
        }
      });
    } catch (err) {
      console.error('[IPTV TV Fetch Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

};
