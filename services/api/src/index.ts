import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("SUPABASE_URL and SUPABASE_ANON_KEY should be set.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log("API service (Supabase) ready.");
