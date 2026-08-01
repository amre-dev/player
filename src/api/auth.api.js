import { supabase } from '../config/supabaseClient.js';

/**
 * إنشاء حساب جديد. اسم المستخدم يُمرَّر عبر options.data ليقرأه
 * تريجر handle_new_user في قاعدة البيانات ويُنشئ صف profiles تلقائيًا.
 */
export async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
