import { h, icon, fmtDate } from '../ui.js';
import { sb, q } from '../api/client.js';
import { store } from '../store.js';
import { navBar } from '../components.js';

export async function profilePage(root) {
  const me = store.me;
  const [hist, items] = await Promise.all([
    q(sb.from('match_history').select('*').order('created_at', { ascending: false }).limit(50)),
    q(sb.from('shop_items').select('id,name_ar,image_url,type').in('id', [me.avatar_frame_id, me.title_id].filter(Boolean))).catch(() => []),
  ]);
  const wins = hist.filter(m => m.winner_id === me.id).length;
  const draws = hist.filter(m => !m.winner_id).length;
  const losses = hist.length - wins - draws;
  const rate = hist.length ? Math.round((wins / hist.length) * 100) : 0;
  const frame = items.find(i => i.id === me.avatar_frame_id);
  const title = items.find(i => i.id === me.title_id);
  const stat = (n, l) => h('div', { class: 'stat' }, h('b', null, n), h('small', { class: 'muted' }, l));

  root.replaceChildren(h('main', { class: 'page' },
    h('div', { class: 'player-card', style: frame?.image_url ? `background-image:url(${frame.image_url})` : '' },
      h('div', { class: 'pc-avatar' }, icon('user', 56)),
      h('div', { class: 'pc-identity' }, h('div', { class: 'pc-name' }, me.username), title ? h('div', { class: 'gold small' }, title.name_ar) : null),
      h('div', { class: 'pc-stats' }, stat(hist.length, 'مباريات'), stat(wins, 'فوز'), stat(losses, 'خسارة'), stat(rate + '%', 'نسبة الفوز'))),
    h('section', { class: 'card stack' }, h('h3', null, 'آخر المباريات'),
      hist.length ? hist.slice(0, 10).map(m => h('div', { class: 'row between' },
        h('span', null, m.mode === 'duel' ? 'مبارزة' : 'مزاد'),
        h('span', { class: m.winner_id === me.id ? 'win' : m.winner_id ? 'lose' : 'muted' }, m.winner_id === me.id ? 'فوز' : m.winner_id ? 'خسارة' : 'تعادل'),
        h('small', { class: 'muted' }, fmtDate(m.created_at)))) : h('div', { class: 'empty' }, 'ما لعبت أي مباراة بعد'))), navBar('#/profile'));
}
