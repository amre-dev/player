import { h, run, toast } from '../ui.js';
import { sb, updatePassword } from '../api/client.js';
import { store } from '../store.js';

// تعيين كلمة مرور جديدة (بعد رابط الاستعادة أو من صفحة المزيد)
export async function resetPage(root) {
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    root.replaceChildren(h('main', { class: 'auth' }, h('div', { class: 'card center stack' },
      h('h3', null, 'الرابط غير صالح'), h('p', { class: 'muted' }, 'انتهت صلاحية الرابط أو استُخدم مسبقا.'),
      h('a', { class: 'btn primary', href: '#/auth' }, 'اطلب رابطا جديدا'))));
    return;
  }
  const p1 = h('input', { class: 'input', type: 'password', placeholder: 'كلمة المرور الجديدة', autocomplete: 'new-password' });
  const p2 = h('input', { class: 'input', type: 'password', placeholder: 'أعد كتابة كلمة المرور', autocomplete: 'new-password' });
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, 'حفظ كلمة المرور');
  root.replaceChildren(h('main', { class: 'auth' }, h('h2', { class: 'center' }, 'كلمة مرور جديدة'),
    h('form', { class: 'stack', onSubmit: (e) => { e.preventDefault(); run(async () => {
      if (p1.value !== p2.value) throw new Error('كلمتا المرور غير متطابقتين');
      await updatePassword(p1.value);
      store.recovering = false; toast('تم تغيير كلمة المرور', 'ok'); location.hash = '#/home';
    }, btn); } }, p1, p2, h('div', { class: 'muted small' }, '8 أحرف على الأقل، وتحتوي حروفا وأرقاما'), btn,
    store.me ? h('a', { class: 'link center', href: '#/more' }, 'إلغاء') : null)));
}
