// ============================================================
// supabase-config.js — Public Supabase project settings
// ============================================================
// These two values are NOT secret. The "publishable" key (Supabase's
// current name for what used to be called the "anon" key) is DESIGNED to be
// embedded in browser-side code exactly like this. Every request it makes
// is checked against the Row Level Security policies defined in
// supabase/schema.sql — that is the real security boundary, not the
// secrecy of this string. Committing this file is normal and expected.
//
// The one Supabase key that must NEVER appear here, or anywhere in this
// repository, is the "service_role" / "secret" key. That key bypasses
// Row Level Security entirely and must stay inside the Supabase dashboard.
// ============================================================
const SUPABASE_URL = 'https://mnqjotawezawtemdhekm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_srjd8QEquWIJXF8uajwOhw_OhyolpGc';
