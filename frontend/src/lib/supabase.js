import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetches all records from a Supabase query by automatically paginating through the 1000-row limit.
 * @param {function} queryFn - A function that returns a Supabase query builder.
 * @param {number} step - The batch size per request (max 1000).
 * @returns {Promise<{data: any[], error: any}>}
 */
export async function fetchAllPaginated(queryFn, step = 1000) {
  let allData = [];
  let hasMore = true;
  let start = 0;
  
  while (hasMore) {
    const { data, error } = await queryFn().range(start, start + step - 1);
    
    if (error) {
      console.error("Paginated fetch error:", error);
      return { data: null, error };
    }
    
    if (data && data.length > 0) {
      allData = allData.concat(data);
      start += step;
      if (data.length < step) {
        hasMore = false; // Reached the end
      }
    } else {
      hasMore = false;
    }
  }
  
  return { data: allData, error: null };
}
