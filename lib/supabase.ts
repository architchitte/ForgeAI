import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const rawKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(
  rawUrl &&
    rawUrl.startsWith('http') &&
    rawKey &&
    rawKey.length > 0
);

if (!isSupabaseConfigured) {
  console.warn(
    '\n⚠️ [Forge - Supabase Configuration Warning]\n' +
      'EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing or invalid.\n' +
      'Ensure your .env variables start with EXPO_PUBLIC_ and restart Metro with cache reset:\n' +
      '  npx expo start -c\n'
  );
}

// Safe fallback preventing top-level validateSupabaseUrl runtime crash
const supabaseUrl = isSupabaseConfigured && rawUrl ? rawUrl : 'https://placeholder.supabase.co';
const supabaseKey = isSupabaseConfigured && rawKey ? rawKey : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
