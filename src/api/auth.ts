import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type SignupResult = {
  requiresEmailConfirmation: boolean;
};

export async function login(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signup(email: string, password: string): Promise<SignupResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw new Error(error.message);
  }

  return {
    requiresEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data.session;
}

export async function hasSession(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session);
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
