/**
 * Committed on purpose.
 *
 * Publishable (anon) keys are designed to be public in frontend code — they carry no
 * privileges beyond what row-level security grants, and the browser would receive
 * this value anyway. Keeping it in source rather than an environment variable means
 * the deploy needs no configuration at all.
 *
 * A service-role key would be a different matter entirely and must never be committed.
 */
export const SUPABASE_URL = "https://sdkjgyrtvaviuvujfsbr.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gVP3PMpXZtO8uADNwwX3yw_e8yNbOjz";
