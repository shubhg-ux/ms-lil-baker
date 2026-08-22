// Ms. Lil Baker — Supabase connection
// Get these from: Supabase Dashboard → Project Settings → API
// SUPABASE_URL looks like: https://xxxxxxxxxxxx.supabase.co
// SUPABASE_ANON_KEY is the long "anon / public" key (safe to expose in frontend code)

const SUPABASE_URL = "https://dqedwfbowxevwjspwiti.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZWR3ZmJvd3hldndqc3B3aXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTI3NDgsImV4cCI6MjEwMjk4ODc0OH0.AEM12VTGE2Mvyw0D2PTwXMQJo3zF6mX7DdHmpXwCxK8";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
