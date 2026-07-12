import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to check admin role (Mock implementation for now)
const checkAdmin = (req, res, next) => {
  // Assuming auth happens before this, or we just allow for the sake of the module demonstration
  next();
};

export const setupRFIDModule = (app) => {
  
  // 1. Issue a new Keycard
  app.post('/api/rfid/issue', checkAdmin, async (req, res) => {
    const { rfid_uid, card_type, room_id, guest_id, valid_from, valid_to, issued_by } = req.body;
    
    try {
      // Create new keycard
      const { data, error } = await supabase
        .from('keycards')
        .insert([{
          rfid_uid, card_type, room_id, guest_id, valid_from, valid_to, issued_by, status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      
      res.json({ success: true, card: data });
    } catch (err) {
      console.error('[RFID Issue Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Revoke/Cancel a Keycard
  app.post('/api/rfid/revoke', checkAdmin, async (req, res) => {
    const { card_id, reason } = req.body; // reason could be 'lost', 'stolen', 'expired', 'revoked'
    
    try {
      const { data, error } = await supabase
        .from('keycards')
        .update({ status: reason || 'revoked' })
        .eq('id', card_id)
        .select()
        .single();
        
      if (error) throw error;
      
      res.json({ success: true, card: data });
    } catch (err) {
      console.error('[RFID Revoke Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Extend Card Validity
  app.post('/api/rfid/extend', checkAdmin, async (req, res) => {
    const { card_id, new_valid_to } = req.body;
    
    try {
      const { data, error } = await supabase
        .from('keycards')
        .update({ valid_to: new_valid_to })
        .eq('id', card_id)
        .select()
        .single();
        
      if (error) throw error;
      
      res.json({ success: true, card: data });
    } catch (err) {
      console.error('[RFID Extend Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Door Lock Webhook (When a card is tapped on a door)
  app.post('/api/rfid/webhook/door-access', async (req, res) => {
    const { lock_mac_address, rfid_uid, timestamp } = req.body;
    
    try {
      // Find lock
      const { data: lock, error: lockErr } = await supabase
        .from('door_locks')
        .select('id, room_id')
        .eq('mac_address', lock_mac_address)
        .single();
        
      if (lockErr || !lock) throw new Error('Lock not found');
      
      // Find card
      const { data: card, error: cardErr } = await supabase
        .from('keycards')
        .select('id, status, valid_from, valid_to, room_id, card_type')
        .eq('rfid_uid', rfid_uid)
        .single();
        
      if (cardErr || !card) throw new Error('Card not found');
      
      // Check access logic
      let access_status = 'denied';
      let denial_reason = null;
      
      const now = new Date(timestamp || Date.now());
      const validFrom = new Date(card.valid_from);
      const validTo = new Date(card.valid_to);
      
      if (card.status !== 'active') {
        denial_reason = 'Card is not active (' + card.status + ')';
      } else if (now < validFrom || now > validTo) {
        denial_reason = 'Card expired or not yet valid';
      } else if (card.card_type === 'guest' && card.room_id !== lock.room_id) {
        denial_reason = 'Guest card not valid for this room';
      } else {
        access_status = 'granted';
      }
      
      // Log access event
      await supabase.from('card_access_logs').insert([{
        card_id: card.id,
        lock_id: lock.id,
        event_time: now.toISOString(),
        access_status,
        denial_reason
      }]);
      
      // If granted and it's a guest, automatically update room status to "Occupied" if it was "Vacant"
      if (access_status === 'granted' && card.card_type === 'guest') {
        await supabase.from('rooms').update({ housekeeping_status: 'occupied' }).eq('id', lock.room_id);
      }
      
      res.json({ success: true, access_status, denial_reason });
    } catch (err) {
      console.error('[Door Webhook Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Get Active Cards
  app.get('/api/rfid/cards', checkAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('keycards')
        .select(`
          *,
          rooms(room_number),
          profiles:guest_id(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      res.json({ success: true, cards: data });
    } catch (err) {
      console.error('[RFID Get Cards Error]', err);
      res.status(500).json({ error: err.message });
    }
  });
  
  // 6. Get Audit Logs
  app.get('/api/rfid/logs', checkAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('card_access_logs')
        .select(`
          *,
          keycards(rfid_uid, card_type),
          door_locks(vendor, rooms(room_number))
        `)
        .order('event_time', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      res.json({ success: true, logs: data });
    } catch (err) {
      console.error('[RFID Get Logs Error]', err);
      res.status(500).json({ error: err.message });
    }
  });
};
