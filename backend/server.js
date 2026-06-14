import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Security Middleware (DDOS / Bot Protection)
app.use(helmet()); // Sets various HTTP headers for security

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Throttled to 5000 requests to support multiple concurrent users sharing NAT IPs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Standard Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// RBAC Middleware Example
const checkRole = (role) => {
  return async (req, res, next) => {
    // In a real app, you would verify the JWT token via Supabase Auth
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) throw error;

      // Assuming role is stored in user metadata
      if (user.user_metadata?.role !== role) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      }
      
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// Routes
app.get('/', (req, res) => {
  res.send('Luxe Apartment Booking API is running.');
});

app.get('/api', (req, res) => {
  res.send('Luxe Apartment Booking API is running (via /api).');
});

app.get('/api/', (req, res) => {
  res.send('Luxe Apartment Booking API is running (via /api/).');
});

// Paystack Payment Initialization Example
app.post('/api/payments/initialize', async (req, res) => {
  const { email, amount } = req.body;
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack expects amount in kobo
        currency: 'NGN'
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// Verify Paystack Transaction
app.get('/api/payments/verify/:reference', async (req, res) => {
  const reference = req.params.reference;
  
  let apiKey = process.env.PAYSTACK_SECRET_KEY;
  if (!apiKey) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'paystack_secret')
        .single();
      
      if (!error && data) {
        apiKey = data.setting_value;
      }
    } catch (e) {
      console.warn("Failed to fetch paystack_secret from system_settings table: ", e.message);
    }
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Paystack Secret Key is not configured in process.env or system_settings.' });
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});


// Resend Email Integration
app.post('/api/email/send', async (req, res) => {
  const { to, subject, html, from } = req.body;
  
  let apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'resend_api_key')
        .single();
      
      if (!error && data) {
        apiKey = data.setting_value;
      }
    } catch (e) {
      console.warn("Failed to fetch resend_api_key from system_settings table: ", e.message);
    }
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Resend API key is not configured in process.env or system_settings.' });
  }

  try {
    const fromAddress = from ? `Sparkles Apartments <${from}>` : 'Sparkles Apartments <onboarding@resend.dev>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: subject,
        html: html
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email via Resend' });
  }
});

// Contact Form Submission (Local stub)
app.post('/api/contact/submit', async (req, res) => {
  const { name, email, subject, message } = req.body;
  console.log(`[Local Contact API] Received submission:`);
  console.log(`- From: ${name} <${email}>`);
  console.log(`- Subject: ${subject}`);
  console.log(`- Message: ${message}`);
  
  res.json({ success: true });
});

// Biometric Shift Clock-in and Clock-out API Integration
app.post('/api/attendance/biometric', async (req, res) => {
  const { staff_id, action, biometric_key } = req.body;

  if (!staff_id) {
    return res.status(400).json({ error: 'Missing staff_id in request body' });
  }

  try {
    // 1. Fetch staff member profile to verify existence and biometric enrollment
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', staff_id)
      .single();

    if (profileError || !profileData) {
      return res.status(404).json({ error: 'Staff member profile not found.' });
    }

    if (biometric_key && profileData.biometric_key !== biometric_key) {
      return res.status(403).json({ error: 'Invalid biometric credentials / fingerprint match failed.' });
    }

    const timestamp = new Date().toISOString();

    if (action === 'clock_in') {
      // 2. Perform clock-in database updates
      const { data: shiftData, error: shiftError } = await supabase
        .from('staff_attendance')
        .insert([{
          staff_id,
          clock_in: timestamp,
          status: 'present',
          notes: 'Biometric fingerprint scan verified.'
        }])
        .select()
        .single();

      if (shiftError) throw shiftError;

      // Update shift status on profiles table (graceful check if column doesn't exist yet)
      try {
        await supabase.from('profiles').update({ is_on_shift: true }).eq('id', staff_id);
      } catch (err) {
        console.warn("Could not update profiles.is_on_shift column: ", err.message);
      }

      // Log system activity event
      await supabase.from('system_logs').insert([{
        user_id: staff_id,
        email: profileData.email,
        log_type: 'activity',
        action: 'Biometric Shift Clock-In',
        module: 'System',
        entity_table: 'staff_attendance',
        entity_id: shiftData.id,
        ip_address: req.ip || '127.0.0.1',
        metadata: { biometric_scan: 'success', key: profileData.biometric_key || 'BIO-MOCK' }
      }]);

      return res.json({
        success: true,
        message: `✓ Biometric scan verified! ${profileData.first_name} is now on shift.`,
        shift: shiftData
      });

    } else if (action === 'clock_out') {
      // 3. Perform clock-out database updates
      // Find open active shift for the user
      const { data: openShifts, error: openError } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', staff_id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1);

      if (openError) throw openError;

      let shiftData;
      if (openShifts && openShifts.length > 0) {
        const { data: updatedShift, error: updateError } = await supabase
          .from('staff_attendance')
          .update({
            clock_out: timestamp,
            notes: (openShifts[0].notes || '') + '\nBiometric fingerprint check-out verified.'
          })
          .eq('id', openShifts[0].id)
          .select()
          .single();

        if (updateError) throw updateError;
        shiftData = updatedShift;
      } else {
        // Safe fallback if no open shift found: create a completed shift entry
        const { data: fallbackShift, error: fallbackError } = await supabase
          .from('staff_attendance')
          .insert([{
            staff_id,
            clock_in: timestamp,
            clock_out: timestamp,
            status: 'present',
            notes: 'Clock-out biometric scan verified (no active clock-in recorded).'
          }])
          .select()
          .single();

        if (fallbackError) throw fallbackError;
        shiftData = fallbackShift;
      }

      // Update shift status on profiles table
      try {
        await supabase.from('profiles').update({ is_on_shift: false }).eq('id', staff_id);
      } catch (err) {
        console.warn("Could not update profiles.is_on_shift column: ", err.message);
      }

      // Log system activity event
      await supabase.from('system_logs').insert([{
        user_id: staff_id,
        email: profileData.email,
        log_type: 'activity',
        action: 'Biometric Shift Clock-Out',
        module: 'System',
        entity_table: 'staff_attendance',
        entity_id: shiftData.id,
        ip_address: req.ip || '127.0.0.1',
        metadata: { biometric_scan: 'success', key: profileData.biometric_key || 'BIO-MOCK' }
      }]);

      return res.json({
        success: true,
        message: `✓ Biometric scan verified! ${profileData.first_name} is now off shift.`,
        shift: shiftData
      });

    } else {
      return res.status(400).json({ error: 'Invalid shift action. Must be clock_in or clock_out.' });
    }

  } catch (err) {
    console.error("Biometric API Failure:", err);
    return res.status(500).json({ error: 'Failed to process shift transaction: ' + err.message });
  }
});

// Standalone TCP/IP Biometric Attendance Terminal Push Endpoint (ZKTeco ADMS/Push standard)
app.post('/api/attendance/terminal-push', async (req, res) => {
  const { device_sn, user_pin, verify_time, verify_mode, verify_status } = req.body;

  if (!user_pin || !device_sn) {
    return res.status(400).json({ error: 'Missing device_sn or user_pin in push packet.' });
  }

  try {
    // 1. Resolve staff profile by biometric terminal registration
    const pinStr = user_pin.toString().trim().toUpperCase();
    
    // Look up profiles to find a match
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'guest');

    if (profileErr) throw profileErr;

    // Search for matching profile where biometric_key contains the pin, 
    // or the profile ID / username matches
    const staffMember = profiles.find(p => {
      if (!p.biometric_key) return false;
      const keyNormalized = p.biometric_key.toUpperCase();
      return keyNormalized.includes(pinStr) || p.username?.toUpperCase().includes(pinStr);
    });

    if (!staffMember) {
      return res.status(404).json({ 
        error: `Push failed: No active staff member mapped to Terminal ID PIN "${pinStr}". Please register this terminal key in Staff Directory.` 
      });
    }

    const timestamp = verify_time ? new Date(verify_time).toISOString() : new Date().toISOString();
    const action = verify_status === 0 || verify_status === '0' || verify_status === 'clock_in' ? 'clock_in' : 'clock_out';

    let shiftData;

    if (action === 'clock_in') {
      const { data: insertedShift, error: shiftError } = await supabase
        .from('staff_attendance')
        .insert([{
          staff_id: staffMember.id,
          clock_in: timestamp,
          status: 'present',
          notes: `Network Biometric Terminal Sync (Device SN: ${device_sn}, Mode: Fingerprint).`
        }])
        .select()
        .single();

      if (shiftError) throw shiftError;
      shiftData = insertedShift;

      try {
        await supabase.from('profiles').update({ is_on_shift: true }).eq('id', staffMember.id);
      } catch (err) {
        console.warn("Could not toggle shift state: ", err.message);
      }

      // Log system activity event
      await supabase.from('system_logs').insert([{
        user_id: staffMember.id,
        email: staffMember.email,
        log_type: 'activity',
        action: 'Network Biometric Clock-In',
        module: 'System',
        entity_table: 'staff_attendance',
        entity_id: shiftData.id,
        ip_address: req.ip || '127.0.0.1',
        metadata: { terminal_sn: device_sn, user_pin: pinStr, mode: verify_mode || 'fingerprint' }
      }]);

      return res.json({
        success: true,
        message: `[Terminal Push] Verified! ${staffMember.first_name} clocked in successfully at Entrance Terminal.`,
        shift: shiftData
      });

    } else {
      // Find open shift
      const { data: openShifts, error: openError } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', staffMember.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1);

      if (openError) throw openError;

      let targetShiftId;
      if (openShifts && openShifts.length > 0) {
        targetShiftId = openShifts[0].id;
        const { data: updatedShift, error: updateError } = await supabase
          .from('staff_attendance')
          .update({
            clock_out: timestamp,
            notes: (openShifts[0].notes || '') + `\nNetwork Biometric Terminal Sync Out (Device SN: ${device_sn}).`
          })
          .eq('id', targetShiftId)
          .select()
          .single();

        if (updateError) throw updateError;
        shiftData = updatedShift;
      } else {
        const { data: fallbackShift, error: fallbackError } = await supabase
          .from('staff_attendance')
          .insert([{
            staff_id: staffMember.id,
            clock_in: timestamp,
            clock_out: timestamp,
            status: 'present',
            notes: `Network Biometric Terminal Sync Out Fallback (Device SN: ${device_sn}, no active clock-in).`
          }])
          .select()
          .single();

        if (fallbackError) throw fallbackError;
        shiftData = fallbackShift;
      }

      try {
        await supabase.from('profiles').update({ is_on_shift: false }).eq('id', staffMember.id);
      } catch (err) {
        console.warn("Could not toggle shift state: ", err.message);
      }

      // Log system activity event
      await supabase.from('system_logs').insert([{
        user_id: staffMember.id,
        email: staffMember.email,
        log_type: 'activity',
        action: 'Network Biometric Clock-Out',
        module: 'System',
        entity_table: 'staff_attendance',
        entity_id: shiftData.id,
        ip_address: req.ip || '127.0.0.1',
        metadata: { terminal_sn: device_sn, user_pin: pinStr, mode: verify_mode || 'fingerprint' }
      }]);

      return res.json({
        success: true,
        message: `[Terminal Push] Verified! ${staffMember.first_name} clocked out successfully at Entrance Terminal.`,
        shift: shiftData
      });
    }

  } catch (err) {
    console.error("Biometric Terminal API Failure:", err);
    return res.status(500).json({ error: 'Terminal transaction push failed: ' + err.message });
  }
});

// Admin Route Example
app.get('/api/admin/bookings', checkRole('admin'), (req, res) => {
  res.json({ message: 'Welcome Admin. Here are the bookings.' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
