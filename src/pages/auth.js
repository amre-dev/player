import { h, run, toast } from '../ui.js';
import { signIn, signUp, resendVerification, requestPasswordReset } from '../api/client.js';
import { refreshMe } from '../store.js';

export function authPage(root, { notice } = {}) {
  let mode = 'login', sentKind = null, sentEmail = '', cooldown = 0, timer = null;
  const field = (props) => h('input', { class: 'input', ...props });
  const username = field({ placeholder: 'اسم المستخدم (يظهر للاعبين)', autocomplete: 'nickname', maxlength: 20 });
  const email = field({ type: 'email', placeholder: 'البريد الإلكتروني', autocomplete: 'email', inputmode: 'email', dir: 'ltr' });
  const pass = field({ type: 'password', placeholder: 'كلمة المرور', autocomplete: 'current-password' });
  const pass2 = field({ type: 'password', placeholder: 'أعد كتابة كلمة المرور', autocomplete: 'new-password' });
  const hint = h('div', { class: 'muted small' }, '8 أحرف على الأقل، وتحتوي حروفا وأرقاما');
  const submit = h('button', { class: 'btn primary block', type: 'submit' });
  const links = h('div', { class: 'stack center' });
  const box = h('div', { class: 'stack' });

  const go = (m) => { mode = m; paint(); };
  function paint() {
    clearInterval(timer);
    if (mode === 'sent') return paintSent();
    submit.textContent = { login: 'دخول', signup: 'إنشاء حساب', forgot: 'أرسل رابط الاستعادة' }[mode];
    pass.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    const fields = mode === 'signup' ? [username, email, pass, pass2, hint] : mode === 'forgot' ? [h('p', { class: 'muted small center' }, 'اكتب بريدك وسنرسل لك رابطا لتعيين كلمة مرور جديدة.'), email] : [email, pass];
    links.replaceChildren(...[
      mode === 'login' ? h('button', { class: 'link', type: 'button', onClick: () => go('forgot') }, 'نسيت كلمة المرور؟') : null,
      h('button', { class: 'link', type: 'button', onClick: () => go(mode === 'login' ? 'signup' : 'login') },
        mode === 'login' ? 'ما عندك حساب؟ أنشئ حساب جديد' : 'عندك حساب؟ سجّل دخولك')].filter(Boolean));
    box.replaceChildren(h('form', { class: 'stack', onSubmit: onSubmit }, ...fields, submit), links);
  }

  function onSubmit(e) {
    e.preventDefault();
    run(async () => {
      if (mode === 'login') {
        try { await signIn(email.value, pass.value); }
        catch (err) {
          if (/لم يتم تأكيد/.test(err.message)) { sentKind = 'verify'; sentEmail = email.value.trim(); go('sent'); return; }
          throw err;
        }
        await refreshMe(); location.hash = '#/home';
      } else if (mode === 'signup') {
        if (pass.value !== pass2.value) throw new Error('كلمتا المرور غير متطابقتين');
        const r = await signUp(username.value, email.value, pass.value);
        if (r.verify) { sentKind = 'verify'; sentEmail = email.value.trim(); go('sent'); }
        else { await refreshMe(); location.hash = '#/home'; }
      } else {
        await requestPasswordReset(email.value);
        sentKind = 'reset'; sentEmail = email.value.trim(); go('sent');
      }
    }, submit);
  }

  function paintSent() {
    const resend = h('button', { class: 'btn ghost block' });
    const tick = () => { resend.disabled = cooldown > 0; resend.textContent = cooldown > 0 ? `إعادة الإرسال بعد ${cooldown}ث` : 'إعادة إرسال الرسالة'; };
    cooldown = 60; tick();
    timer = setInterval(() => { cooldown = Math.max(0, cooldown - 1); tick(); if (!cooldown) clearInterval(timer); }, 1000);
    resend.onclick = () => run(async () => {
      await (sentKind === 'verify' ? resendVerification(sentEmail) : requestPasswordReset(sentEmail));
      toast('تم إرسال الرسالة', 'ok'); cooldown = 60; tick();
      clearInterval(timer); timer = setInterval(() => { cooldown = Math.max(0, cooldown - 1); tick(); if (!cooldown) clearInterval(timer); }, 1000);
    });
    box.replaceChildren(h('div', { class: 'card center stack' },
      h('h3', null, sentKind === 'verify' ? 'تحقق من بريدك' : 'تم إرسال الرابط'),
      h('p', { class: 'muted' }, sentKind === 'verify' ? 'أرسلنا رابط تأكيد إلى' : 'أرسلنا رابط استعادة كلمة المرور إلى'),
      h('b', { dir: 'ltr' }, sentEmail),
      h('p', { class: 'muted small' }, sentKind === 'verify' ? 'افتح الرابط من هاتفك لتفعيل حسابك، ثم ارجع وسجّل دخولك. إذا ما وصلتك فتفقد مجلد الرسائل غير المرغوبة (Spam).' : 'افتح الرابط من هاتفك لتعيين كلمة مرور جديدة. إذا ما وصلتك فتفقد مجلد Spam.'),
      resend,
      h('button', { class: 'link', onClick: () => go('login') }, 'العودة لتسجيل الدخول')));
  }

  paint();
  root.replaceChildren(h('main', { class: 'auth' },
    h('div', { class: 'logo' }, h('span', null, 'PLAYER'), h('b', null, 'IQ')),
    h('p', { class: 'muted center' }, 'خمّن لاعب خصمك قبل ما يخمّن لاعبك'),
    notice ? h('div', { class: 'card center small' }, notice) : null,
    box));
  return () => clearInterval(timer);
}
