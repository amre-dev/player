import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
});

const isNative = () => !!window.Capacitor?.isNativePlatform?.();
// وجهة الروابط القادمة من الإيميل: تطبيق أندرويد (رابط عميق) أو صفحة الويب
export const authRedirect = () => (isNative() ? 'studio.spider.playeriq://auth' : location.origin + location.pathname);

const arabicError = (e) => {
  const m = ((e && (e.message || e.msg)) || '') + ' ' + ((e && e.code) || '');
  if (/Invalid login credentials/i.test(m)) return 'البريد أو كلمة المرور غير صحيحة';
  if (/already registered|already been registered|user_already_exists/i.test(m)) return 'هذا البريد مسجّل مسبقا، سجّل دخولك أو استعد كلمة المرور';
  if (/Email not confirmed|email_not_confirmed/i.test(m)) return 'لم يتم تأكيد بريدك بعد، افتح الرابط الذي أرسلناه لك';
  if (/rate limit|over_email_send_rate_limit|over_request_rate_limit/i.test(m)) return 'محاولات كثيرة، انتظر دقيقة ثم أعد المحاولة';
  if (/weak_password|pwned|Password should be|easy to guess/i.test(m)) return 'كلمة المرور ضعيفة أو مسرّبة من قبل، اختر كلمة أقوى';
  if (/same_password|different from the old/i.test(m)) return 'كلمة المرور الجديدة يجب أن تختلف عن القديمة';
  if (/valid email|email_address_invalid|invalid format/i.test(m)) return 'صيغة البريد الإلكتروني غير صحيحة';
  if (/expired|invalid.*(link|token|code)|otp_expired|flow_state/i.test(m)) return 'الرابط غير صالح أو انتهت صلاحيته، اطلب رابطا جديدا';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'تعذّر الاتصال بالإنترنت';
  return (e && e.message) || 'حدث خطأ غير متوقع';
};

// شروط كلمة المرور: 8 أحرف على الأقل، فيها حرف ورقم
export function checkPassword(pw) {
  if (!pw || pw.length < 8) return 'كلمة المرور 8 أحرف على الأقل';
  if (!/[A-Za-z\u0600-\u06FF]/.test(pw) || !/\d/.test(pw)) return 'كلمة المرور يجب أن تحتوي حروفا وأرقاما';
  return null;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normEmail = (e) => (e || '').trim().toLowerCase();
export function checkEmail(e) { return EMAIL_RE.test(normEmail(e)) ? null : 'صيغة البريد الإلكتروني غير صحيحة'; }

// يرجع { verify: true } إذا كان لازم تأكيد الإيميل قبل الدخول
export async function signUp(username, email, password) {
  username = username.trim();
  if (username.length < 3 || username.length > 20 || /\s/.test(username)) throw new Error('اسم المستخدم من 3 إلى 20 حرفا بدون مسافات');
  const e = checkEmail(email); if (e) throw new Error(e);
  const pe = checkPassword(password); if (pe) throw new Error(pe);
  const { data: free, error: fe } = await sb.rpc('is_username_available', { p_username: username });
  if (fe) throw new Error(arabicError(fe));
  if (!free) throw new Error('اسم المستخدم محجوز، اختر اسما آخر');
  const { data, error } = await sb.auth.signUp({ email: normEmail(email), password, options: { data: { username }, emailRedirectTo: authRedirect() } });
  if (error) throw new Error(arabicError(error));
  // إيميل مسجّل مسبقا: Supabase يرجع نجاحا وهميا بدون identities
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error(arabicError({ message: 'already registered' }));
  return { verify: !data.session };
}

export async function signIn(email, password) {
  const e = checkEmail(email); if (e) throw new Error(e);
  const { error } = await sb.auth.signInWithPassword({ email: normEmail(email), password });
  if (error) throw new Error(arabicError(error));
}

export async function resendVerification(email) {
  const { error } = await sb.auth.resend({ type: 'signup', email: normEmail(email), options: { emailRedirectTo: authRedirect() } });
  if (error) throw new Error(arabicError(error));
}

export async function requestPasswordReset(email) {
  const e = checkEmail(email); if (e) throw new Error(e);
  const { error } = await sb.auth.resetPasswordForEmail(normEmail(email), { redirectTo: authRedirect() });
  if (error) throw new Error(arabicError(error));
}

export async function updatePassword(password) {
  const pe = checkPassword(password); if (pe) throw new Error(pe);
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(arabicError(error));
}

// يعالج الرابط القادم من الإيميل (تأكيد/استعادة). يرجع نوع النتيجة
export async function consumeAuthUrl(urlStr) {
  let u; try { u = new URL(urlStr); } catch { return null; }
  const hp = /^#(error|access_token)/.test(u.hash) ? new URLSearchParams(u.hash.slice(1)) : null;
  const err = u.searchParams.get('error_description') || hp?.get('error_description');
  if (err) throw new Error(arabicError({ message: err }));
  const code = u.searchParams.get('code');
  if (!code) return null;
  const { error } = await sb.auth.exchangeCodeForSession(code);
  // فتح الرابط من جهاز/متصفح آخر: الإيميل تأكّد لكن الجلسة لا تُنشأ
  if (error) return 'confirmed-elsewhere';
  return 'session';
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
