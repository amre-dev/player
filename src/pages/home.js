import { h, icon, run, toast } from '../ui.js';
import { rpc, sb, q } from '../api/client.js';
import { store, refreshMe } from '../store.js';
import { navBar } from '../components.js';

export async function homePage(root) {
  const code = h('input', { class: 'input code', placeholder: 'كود الغرفة', maxlength: 6, autocapitalize: 'characters', autocomplete: 'off' });
  const coins = h('span', null, store.me?.coins_balance ?? 0);
  const go = (path) => { location.hash = path; };

  const mode = (ic, title, desc, create) => h('div', { class: 'mode' },
    h('div', { class: 'mode-ic' }, icon(ic, 30)),
    h('h3', null, title), h('p', { class: 'muted small' }, desc),
    h('button', { class: 'btn primary block', onClick: (e) => run(create, e.currentTarget) }, 'غرفة جديدة'));

  const join = h('button', { class: 'btn ghost', onClick: (e) => run(async () => {
    if (code.value.trim().length < 4) throw new Error('أدخل كود الغرفة');
    const r = await rpc('join_by_code', { p_code: code.value });
    go(`#/${r.mode}/${r.id}`);
  }, e.currentTarget) }, 'انضم');

  root.replaceChildren(h('main', { class: 'page' },
    h('header', { class: 'home-head' },
      h('div', { class: 'logo sm' }, h('span', null, 'PLAYER'), h('b', null, 'IQ')),
      h('div', { class: 'pill gold' }, icon('coin', 18), coins)),
    h('section', { class: 'modes' },
      mode('duel', 'مبارزة التخمين', 'أسئلة نعم/لا لتكشف لاعب خصمك السري.', async () => { const r = await rpc('create_room'); go('#/duel/' + r.id); }),
      mode('gavel', 'طور المزاد', 'ميزانية 200 مليون لتبني أقوى تشكيلة.', async () => { const r = await rpc('create_auction'); go('#/auction/' + r.id); })),
    h('section', { class: 'card stack' }, h('h3', null, 'عندك كود؟'), h('div', { class: 'row' }, code, join))),
    navBar('#/home'));

  // مكافأة الدخول اليومية
  run(async () => {
    const got = await rpc('claim_daily_login');
    if (got > 0) { toast(`+${got} عملة مكافأة دخول اليوم`, 'ok'); await refreshMe(); coins.textContent = store.me.coins_balance; }
  });
}
