import { createClient } from "@supabase/supabase-js";

// This client runs in the browser. Only Supabase's publishable/anon key belongs here;
// database access is restricted by Row Level Security.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY in the deployment environment.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
