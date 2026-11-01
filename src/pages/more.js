import { h, icon, run, fmtDate } from '../ui.js';
import { rpc, sb, q, signOut } from '../api/client.js';
import { store, refreshMe } from '../store.js';
import { navBar } from '../components.js';
import { SUPPORT_WHATSAPP } from '../config.js';

export async function morePage(root) {
  const [notes, news, stats] = await Promise.all([
    q(sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)),
    q(sb.from('app_news').select('*').order('created_at', { ascending: false }).limit(10)),
    rpc('get_app_stats'),
  ]);
  const notesBox = h('div', { class: 'stack' });
  function noteCard(n, list) {
    const accept = n.type === 'challenge' ? h('button', { class: 'btn primary sm', onClick: (e) => run(async () => {
      const mode = n.link_room_id ? 'duel' : 'auction';
      const r = await rpc('accept_challenge', { p_mode: mode, p_id: n.link_room_id || n.link_auction_id });
      await rpc('dismiss_notification', { p_id: n.id });
      location.hash = `#/${r.mode}/${r.id}`;
    }, e.currentTarget) }, 'قبول التحدي') : null;
    const del = h('button', { class: 'btn ghost sm', onClick: (e) => run(async () => {
      await rpc('dismiss_notification', { p_id: n.id });
      paintNotes(list.filter(x => x.id !== n.id));
    }, e.currentTarget) }, 'حذف');
    return h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('b', null, n.title), h('small', { class: 'muted' }, fmtDate(n.created_at))),
      n.body ? h('div', { class: 'muted small' }, n.body) : null,
      h('div', { class: 'row' }, accept, del));
  }
  function paintNotes(list) {
    const cards = list.length ? list.map(n => noteCard(n, list)) : [h('div', { class: 'empty' }, 'لا إشعارات')];
    notesBox.replaceChildren(...cards);
  }
  paintNotes(notes);
  await rpc('mark_news_seen').catch(() => {});

  root.replaceChildren(h('main', { class: 'page' }, h('h2', null, 'المزيد'),
    h('h3', null, 'الإشعارات'), notesBox,
    h('h3', null, 'الأخبار'), news.length ? news.map(n => h('div', { class: 'card' }, h('b', null, n.title), n.body ? h('p', { class: 'muted small' }, n.body) : null)) : h('div', { class: 'empty' }, 'لا أخبار حاليا'),
    h('section', { class: 'card stack' }, h('h3', null, 'عن اللعبة'),
      h('div', { class: 'row between' }, h('span', null, 'لاعبون'), h('b', null, stats.players)),
      h('div', { class: 'row between' }, h('span', null, 'مباريات'), h('b', null, stats.matches)),
      h('div', { class: 'row between' }, h('span', null, 'مستخدمون'), h('b', null, stats.users)),
      h('small', { class: 'muted' }, 'Spider Studio')),
    h('a', { class: 'btn ghost block', href: `https://wa.me/${SUPPORT_WHATSAPP}`, target: '_blank', rel: 'noopener' }, 'تواصل مع الدعم'),
    h('button', { class: 'btn danger block', onClick: async () => { await signOut(); store.me = null; location.hash = '#/auth'; } }, icon('logout', 18), ' تسجيل الخروج')),
    navBar('#/more'));
}
