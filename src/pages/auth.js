import { h, run } from '../ui.js';
import { signIn, signUp } from '../api/client.js';
import { refreshMe } from '../store.js';

export function authPage(root) {
  let mode = 'login';
  const user = h('input', { class: 'input', placeholder: 'اسم المستخدم', autocomplete: 'username', maxlength: 20 });
  const pass = h('input', { class: 'input', type: 'password', placeholder: 'كلمة المرور', autocomplete: 'current-password' });
  const submit = h('button', { class: 'btn primary block', type: 'submit' }, 'دخول');
  const switcher = h('button', { class: 'link', type: 'button', onClick: () => { mode = mode === 'login' ? 'signup' : 'login'; paint(); } });
  function paint() {
    submit.textContent = mode === 'login' ? 'دخول' : 'إنشاء حساب';
    switcher.textContent = mode === 'login' ? 'ما عندك حساب؟ أنشئ حساب جديد' : 'عندك حساب؟ سجّل دخولك';
    pass.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  }
  paint();
  const form = h('form', { class: 'stack', onSubmit: (e) => {
    e.preventDefault();
    run(async () => {
      if (!user.value.trim() || pass.value.length < 6) throw new Error('أدخل اسم المستخدم وكلمة مرور من 6 أحرف على الأقل');
      await (mode === 'login' ? signIn : signUp)(user.value, pass.value);
      await refreshMe();
      location.hash = '#/home';
    }, submit);
  } }, user, pass, submit, switcher);
  root.replaceChildren(h('main', { class: 'auth' },
    h('div', { class: 'logo' }, h('span', null, 'PLAYER'), h('b', null, 'IQ')),
    h('p', { class: 'muted center' }, 'خمّن لاعب خصمك قبل ما يخمّن لاعبك'),
    form));
}
