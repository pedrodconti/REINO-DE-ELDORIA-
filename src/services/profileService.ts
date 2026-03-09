import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/types/supabase';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function sanitizeUsername(input: string): string {
  return input.trim().replace(/\s+/g, '_');
}

export function validateUsername(input: string): string | null {
  const normalized = sanitizeUsername(input);

  if (!normalized) {
    return 'Informe um nome de jogador.';
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return 'Use 3 a 20 caracteres (letras, numeros e underscore).';
  }

  return null;
}

export async function getMyProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ProfileRow | null) ?? null;
}

export async function updateMyUsername(userId: string, username: string): Promise<ProfileRow> {
  const normalized = sanitizeUsername(username);

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        username: normalized,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as ProfileRow;
}
