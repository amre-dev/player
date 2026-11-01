import { h, icon, run, toast } from '../ui.js';
import { rpc, sb, q } from '../api/client.js';
import { store } from '../store.js';
import { navBar } from '../components.js';

export async function friendsPage(root) {
  const uid = store.me.id;
  const body = h('div', { class: 'stack' });
  const add = h('input', { class: 'input', placeholder: 'اسم المستخدم لإضافته' });
  root.replaceChildren(h('main', { class: 'page' }, h('h2', null, 'الأصدقاء'),
    h('div', { class: 'card row' }, add, h('button', { class: 'btn primary', onClick: (e) => run(async () => {
      await rpc('send_friend_request', { p_username: add.value }); add.value = ''; toast('تم إرسال الطلب', 'ok'); await load();
    }, e.currentTarget) }, icon('plus', 18))), body), navBar('#/friends'));

  async function load() {
    const rows = await q(sb.from('friendships').select('*'));
    const ids = [...new Set(rows.flatMap(r => [r.requester_id, r.addressee_id]))];
    const profs = ids.length ? await q(sb.from('profiles').select('id,username').in('id', ids)) : [];
    const name = (id) => profs.find(p => p.id === id)?.username || '—';
    body.replaceChildren();
    const incoming = rows.filter(r => r.status === 'pending' && r.addressee_id === uid);
    const outgoing = rows.filter(r => r.status === 'pending' && r.requester_id === uid);
    const friends = rows.filter(r => r.status === 'accepted');
    if (incoming.length) body.append(h('h3', null, 'طلبات واردة'), ...incoming.map(r => h('div', { class: 'card row between' }, name(r.requester_id),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary sm', onClick: (e) => run(async () => { await rpc('accept_friend_request', { p_id: r.id }); await load(); }, e.currentTarget) }, 'قبول'),
        h('button', { class: 'btn ghost sm', onClick: (e) => run(async () => { await rpc('remove_friendship', { p_id: r.id }); await load(); }, e.currentTarget) }, 'رفض')))));
    body.append(h('h3', null, `أصدقائي (${friends.length})`));
    if (!friends.length) body.append(h('div', { class: 'empty' }, 'لا أصدقاء بعد، أضف أول صديق.'));
    for (const r of friends) {
      const other = r.requester_id === uid ? r.addressee_id : r.requester_id;
      const challenge = (mode) => (e) => run(async () => {
        const res = await rpc('create_challenge', { p_friend: other, p_mode: mode });
        location.hash = `#/${res.mode}/${res.id}`;
      }, e.currentTarget);
      body.append(h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', null, name(other)),
        h('button', { class: 'link danger', onClick: (e) => run(async () => { await rpc('remove_friendship', { p_id: r.id }); await load(); }, e.currentTarget) }, 'حذف')),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost grow', onClick: challenge('duel') }, 'تحدّ بمبارزة'),
          h('button', { class: 'btn ghost grow', onClick: challenge('auction') }, 'تحدّ بمزاد'))));
    }
    if (outgoing.length) body.append(h('h3', null, 'طلبات مرسلة'), ...outgoing.map(r => h('div', { class: 'card row between muted' }, name(r.addressee_id), 'بانتظار الرد')));
  }
  await run(load);
}
