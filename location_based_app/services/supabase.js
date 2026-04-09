import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uhfgfoiueykqlmlxnbsw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZmdmb2l1ZXlrcWxtbHhuYnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTk5OTYsImV4cCI6MjA5MTIzNTk5Nn0.8VOJXNoYokFIDvWq7HP7RP-rJ8pcKxpERfM2bTq2wBk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
