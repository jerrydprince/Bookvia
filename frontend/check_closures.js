import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjmdlifojfwoviyugjwq.supabase.co',
  'sb_publishable_Cd0GkjlGkIfFUJ0IR2etLA_IxImAYU9'
);

async function checkClosures() {
  const { data, error } = await supabase
    .from('daily_closures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log("Recent closures:", data?.map(d => ({ date: d.closure_date, total_revenue: d.total_revenue })));
}

checkClosures();
