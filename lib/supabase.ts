import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL が設定されていません");
}

if (!rawSupabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません");
}

// 前後の空白と、誤って付いた /rest/v1 を除去
const supabaseUrl = rawSupabaseUrl
  .trim()
  .replace(/\/rest\/v1\/?$/, "");

const supabaseAnonKey = rawSupabaseAnonKey.trim();

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);