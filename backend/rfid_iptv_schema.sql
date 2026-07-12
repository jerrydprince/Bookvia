-- ==============================================================================
-- RFID KEYCARD MANAGEMENT & HOSPITALITY IPTV SCHEMA
-- ==============================================================================

-- 1. DOOR LOCKS
CREATE TABLE IF NOT EXISTS public.door_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    vendor VARCHAR(100) NOT NULL, -- e.g., 'vingcard', 'salto', 'dormakaba'
    mac_address VARCHAR(50),
    ip_address VARCHAR(50),
    status VARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'maintenance'
    battery_level INT DEFAULT 100,
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. KEYCARDS
CREATE TABLE IF NOT EXISTS public.keycards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfid_uid VARCHAR(100) UNIQUE NOT NULL, -- The physical card UID
    card_type VARCHAR(50) NOT NULL, -- 'guest', 'vip', 'master', 'housekeeping', 'maintenance', 'security', 'temporary', 'staff', 'emergency'
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL, -- Nullable for master/staff cards
    guest_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'revoked', 'lost', 'stolen'
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. CARD ACCESS LOGS
CREATE TABLE IF NOT EXISTS public.card_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES public.keycards(id) ON DELETE CASCADE,
    lock_id UUID REFERENCES public.door_locks(id) ON DELETE SET NULL,
    event_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    access_status VARCHAR(20) NOT NULL, -- 'granted', 'denied'
    denial_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. IPTV DEVICES
CREATE TABLE IF NOT EXISTS public.iptv_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    mac_address VARCHAR(50) UNIQUE,
    ip_address VARCHAR(50),
    model VARCHAR(100), -- e.g., 'Android TV 11', 'Samsung Tizen'
    status VARCHAR(20) DEFAULT 'offline', -- 'online', 'offline', 'standby'
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. IPTV SESSIONS (Tracks current active guest session per room)
CREATE TABLE IF NOT EXISTS public.iptv_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.iptv_devices(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'ended'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_door_locks_updated_at BEFORE UPDATE ON public.door_locks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_keycards_updated_at BEFORE UPDATE ON public.keycards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_iptv_devices_updated_at BEFORE UPDATE ON public.iptv_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_iptv_sessions_updated_at BEFORE UPDATE ON public.iptv_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.door_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keycards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iptv_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iptv_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users for door_locks" ON public.door_locks FOR SELECT USING (true);
CREATE POLICY "Allow all access to admins for door_locks" ON public.door_locks FOR ALL USING (true);

CREATE POLICY "Allow read access to all users for keycards" ON public.keycards FOR SELECT USING (true);
CREATE POLICY "Allow all access to admins for keycards" ON public.keycards FOR ALL USING (true);

CREATE POLICY "Allow read access to all users for card_access_logs" ON public.card_access_logs FOR SELECT USING (true);
CREATE POLICY "Allow all access to admins for card_access_logs" ON public.card_access_logs FOR ALL USING (true);

CREATE POLICY "Allow read access to all users for iptv_devices" ON public.iptv_devices FOR SELECT USING (true);
CREATE POLICY "Allow all access to admins for iptv_devices" ON public.iptv_devices FOR ALL USING (true);

CREATE POLICY "Allow read access to all users for iptv_sessions" ON public.iptv_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all access to admins for iptv_sessions" ON public.iptv_sessions FOR ALL USING (true);
