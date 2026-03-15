import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./src/loadEnv.js";

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL が設定されていません");
}

if (!supabaseAnonKey) {
  throw new Error("SUPABASE_ANON_KEY が設定されていません");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
