-- Create laundry_items table for dynamic price list
CREATE TABLE IF NOT EXISTS public.laundry_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cloth_type TEXT NOT NULL,
    washing_amount DECIMAL(10,2) DEFAULT 0.00,
    ironing_amount DECIMAL(10,2) DEFAULT 0.00,
    starching_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_laundry_items_updated_at') THEN
        CREATE TRIGGER set_laundry_items_updated_at
            BEFORE UPDATE ON public.laundry_items
            FOR EACH ROW
            EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.laundry_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON public.laundry_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated admins and laundry staff" ON public.laundry_items;
DROP POLICY IF EXISTS "Enable update access for authenticated admins and laundry staff" ON public.laundry_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated admins and laundry staff" ON public.laundry_items;

-- Recreate policies
CREATE POLICY "Enable read access for all users" 
    ON public.laundry_items FOR SELECT 
    USING (true);

CREATE POLICY "Enable insert access for authenticated admins and laundry staff" 
    ON public.laundry_items FOR INSERT 
    WITH CHECK (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('super_admin', 'admin', 'hotel_manager', 'laundry_manager', 'laundry_staff')
    ));

CREATE POLICY "Enable update access for authenticated admins and laundry staff" 
    ON public.laundry_items FOR UPDATE 
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('super_admin', 'admin', 'hotel_manager', 'laundry_manager', 'laundry_staff')
    ));

CREATE POLICY "Enable delete access for authenticated admins and laundry staff" 
    ON public.laundry_items FOR DELETE 
    USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('super_admin', 'admin', 'hotel_manager', 'laundry_manager', 'laundry_staff')
    ));

-- Seed default data if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.laundry_items) THEN
        INSERT INTO public.laundry_items (cloth_type, washing_amount, ironing_amount, starching_amount) VALUES
        ('Shirt', 2000, 1500, 1000),
        ('T-Shirt', 1500, 1000, 0),
        ('Trousers / Pants', 3000, 2000, 1500),
        ('Jeans', 3500, 1500, 0),
        ('Suit (2-piece)', 10000, 5000, 0),
        ('Dress', 5000, 3000, 1500),
        ('Skirt', 3000, 2000, 1000),
        ('Traditional Wear', 4500, 3000, 2000),
        ('Bedsheet', 4000, 2500, 2000),
        ('Towel', 2000, 1000, 0),
        ('Undergarments/Socks', 1000, 0, 0);
    END IF;
END $$;
