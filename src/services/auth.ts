import { supabase } from "./supabase";
import type {
  AuthChangeEvent,
  Session,
  User,
  Subscription,
  AuthResponse,
  AuthTokenResponsePassword,
} from "@supabase/supabase-js";

// Register a new user
export async function signUp(
  email: string,
  password: string,
): Promise<AuthResponse["data"]> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });
  if (error) throw error;
  return data;
}

// Authenticate an existing user
export async function signIn(
  email: string,
  password: string,
): Promise<AuthTokenResponsePassword["data"]> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// End the current session
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Retrieve the authenticated user securely from the server
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Retrieve the current local session
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// Subscribe to authentication changes (returns the subscription for cleanup)
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): Subscription {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
