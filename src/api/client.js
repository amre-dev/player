import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

// اسم المستخدم -> بريد وهمي ثابت (لا يوجد بريد حقيقي في اللعبة)
async function emailFor(username) {
  const bytes = new TextEncoder().encode(username.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `u${hex.slice(0, 24)}@players.local`;
}

const arabicError = (e) => {
  const m = (e && e.message) || '';
  if (/Invalid login credentials/i.test(m)) return 'اسم المستخدم أو كلمة المرور غير صحيحة';
  if (/already registered|already been registered/i.test(m)) return 'اسم المستخدم مستخدم مسبقا';
  if (/Email not confirmed/i.test(m)) return 'الحساب غير مفعّل، تواصل مع الدعم';
  if (/Password should be/i.test(m)) return 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال بالإنترنت';
  return m || 'حدث خطأ غير متوقع';
};

export async function signUp(username, password) {
  username = username.trim();
  if (!/^[\p{L}\p{N}_]{3,20}$/u.test(username)) throw new Error('اسم المستخدم من 3 إلى 20 حرفا (حروف أو أرقام أو _)');
  const { error } = await sb.auth.signUp({ email: await emailFor(username), password, options: { data: { username } } });
  if (error) throw new Error(arabicError(error));
  const { data } = await sb.auth.getSession();
  if (!data.session) await signIn(username, password);
}

export async function signIn(username, password) {
  const { error } = await sb.auth.signInWithPassword({ email: await emailFor(username), password });
  if (error) throw new Error(arabicError(error));
}

export const signOut = () => sb.auth.signOut();

export async function rpc(fn, args = {}) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(arabicError(error));
  return data;
}

export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(arabicError(error));
  return data;
}

// قناة realtime واحدة لكل شاشة
export function subscribe(name, specs, handler) {
  let ch = sb.channel(name);
  for (const s of specs) ch = ch.on('postgres_changes', { event: '*', schema: 'public', ...s }, handler);
  ch.subscribe();
  return () => { sb.removeChannel(ch); };
}
