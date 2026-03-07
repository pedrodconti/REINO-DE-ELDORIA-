import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function ensureSupabaseEnv() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Variaveis de ambiente do Supabase ausentes. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.',
    );
  }
}

if (!isSupabaseConfigured) {
  console.warn(
    '[Reino de Eldoria] Variaveis do Supabase ausentes. O app iniciara, mas login/salvamento falhara ate configurar o .env.',
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder_anon_key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
