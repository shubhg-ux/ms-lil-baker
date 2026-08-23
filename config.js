// Ms. Lil Baker — Supabase connection
// Used by both the admin panel (admin-products.js) and the customer site (script.js)

const SUPABASE_URL = "https://dqedwfbowxevwjspwiti.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZWR3ZmJvd3hldndqc3B3aXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTI3NDgsImV4cCI6MjEwMjk4ODc0OH0.AEM12VTGE2Mvyw0D2PTwXMQJo3zF6mX7DdHmpXwCxK8";

// Format expected by admin-products.js
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Format expected by script.js (the customer-facing homepage)
window.MSB_CONFIG = { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
