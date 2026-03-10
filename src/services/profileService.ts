import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/types/supabase';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function isRpcMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String(error.code ?? '') : '';
  const message = 'message' in error ? String(error.message ?? '').toLowerCase() : '';

  return code === 'PGRST202' || message.includes('function') && message.includes('not found');
}

export interface UsernameCooldownInfo {
  canChangeNow: boolean;
  nextChangeAt: string | null;
  remainingMs: number;
}

export function sanitizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function validateUsername(input: string): string | null {
  const normalized = sanitizeUsername(input);

  if (!normalized) {
    return 'Informe um nome de jogador.';
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return 'Use 3 a 20 caracteres (letras minusculas, numeros e underscore).';
  }

  return null;
}

export function hasCompleteUsername(username: string | null | undefined): boolean {
  if (!username) {
    return false;
  }

  return USERNAME_REGEX.test(username.trim().toLowerCase());
}

export function getUsernameCooldownInfo(changedAt: string | null | undefined): UsernameCooldownInfo {
  if (!changedAt) {
    return {
      canChangeNow: true,
      nextChangeAt: null,
      remainingMs: 0,
    };
  }

  const changedAtMs = new Date(changedAt).getTime();
  if (Number.isNaN(changedAtMs)) {
    return {
      canChangeNow: true,
      nextChangeAt: null,
      remainingMs: 0,
    };
  }

  const nextChangeMs = changedAtMs + 30 * 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(0, nextChangeMs - Date.now());

  return {
    canChangeNow: remainingMs <= 0,
    nextChangeAt: new Date(nextChangeMs).toISOString(),
    remainingMs,
  };
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

export async function setMyUsername(_userId: string, username: string): Promise<ProfileRow> {
  const normalized = sanitizeUsername(username);

  const { data: rpcData, error: rpcError } = await supabase.rpc('set_profile_username', {
    p_username: normalized,
  });

  if (!rpcError && rpcData) {
    return rpcData as ProfileRow;
  }

  if (rpcError && !isRpcMissingError(rpcError)) {
    throw rpcError;
  }

  throw new Error('Funcao set_profile_username indisponivel no banco. Aplique o patch de username.');
}
