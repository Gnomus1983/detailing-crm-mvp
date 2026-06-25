import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function getAuthRedirectUrl() {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();

  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/`;
  }

  return undefined;
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
