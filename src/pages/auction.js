import { h, run, toast, lineLabel } from '../ui.js';
import { rpc, sb, q, subscribe } from '../api/client.js';
import { store, getPlayers, playerById } from '../store.js';
import { playerCard, header, playerAvatar } from '../components.js';

export async function auctionPage(root, { id }) {
  const uid = store.me.id;
  let s = null, squads = [], names = {}, seq = 0, amount = '';
  const view = h('main', { class: 'page room' });
  root.replaceChildren(header('طور المزاد', { back: '#/home' }), view);
  await getPlayers();

  async function load() {
    const my = ++seq;
    const [a, sq] = await Promise.all([
      q(sb.from('auction_sessions').select('*').eq('id', id).single()),
      q(sb.from('auction_squads').select('*').eq('session_id', id).order('round')),
    ]);
    if (my !== seq) return;
    s = a; squads = sq;
    const ids = [a.player1_id, a.player2_id].filter(Boolean).filter(x => !names[x]);
    if (ids.length) (await q(sb.from('profiles').select('id,username').in('id', ids))).forEach(p => { names[p.id] = p.username; });
    paint();
  }

  const myBudget = () => (s.player1_id === uid ? s.budget1 : s.budget2);
  const oppId = () => (s.player1_id === uid ? s.player2_id : s.player1_id);
  const score = (user) => squads.filter(x => x.user_id === user).reduce((t, x) => t + (playerById(x.player_id)?.rating || 0), 0);

  function squadList(user, title) {
    const mine = squads.filter(x => x.user_id === user);
    return h('div', { class: 'card stack' }, h('div', { class: 'row between' }, h('b', null, title), h('b', { class: 'gold' }, score(user))),
      mine.length ? mine.map(x => { const p = playerById(x.player_id); return h('div', { class: 'row between small' },
        h('span', { class: 'row' }, playerAvatar(p, 'xs'), p?.name_ar, h('small', { class: 'muted' }, ' ' + (lineLabel[p?.line] || ''))),
        h('span', null, h('b', null, p?.rating), x.is_compensation ? h('small', { class: 'muted' }, ' هدية') : h('small', { class: 'gold' }, ` ${x.price}M`))); })
        : h('div', { class: 'muted small' }, 'لا لاعبين بعد'));
  }

  function paint() {
    if (!s) return;
    const parts = [];
    if (s.status === 'waiting_for_player') {
      parts.push(h('div', { class: 'card center stack' }, h('div', { class: 'muted' }, 'شارك هذا الكود مع صديقك'), h('div', { class: 'bigcode' }, s.room_code),
        h('div', { class: 'muted small' }, 'بانتظار انضمام اللاعب الآخر…'),
        s.player1_id === uid ? h('button', { class: 'link danger', onClick: (e) => run(async () => { await rpc('cancel_auction', { p_session: id }); location.hash = '#/home'; }, e.currentTarget) }, 'إلغاء') : null));
    } else if (s.status === 'in_progress') {
      const myTurn = s.turn_user_id === uid;
      const block = playerById(s.current_player_id);
      const bidder = s.current_bidder_id ? (s.current_bidder_id === uid ? 'أنت' : names[s.current_bidder_id]) : null;
      parts.push(h('div', { class: 'card row between' }, h('span', null, `الجولة ${s.round} / 5`), h('span', { class: 'gold' }, `ميزانيتك ${myBudget()}M`), h('span', { class: 'muted' }, `الخصم ${s.player1_id === uid ? s.budget2 : s.budget1}M`)));
      if (s.last_result && s.last_result.round === s.round - 1) {
        const lr = s.last_result; const p = playerById(lr.block_player_id);
        parts.push(h('div', { class: 'card small muted' }, `الجولة السابقة: ${p?.name_ar} ذهب إلى ${lr.winner_id === uid ? 'أنت' : names[lr.winner_id]} بـ ${lr.price}M`));
      }
      parts.push(h('div', { class: 'card center stack' }, playerCard(block),
        h('div', null, 'العرض الحالي: ', h('b', { class: 'gold' }, `${s.current_bid}M`), bidder ? ` (${bidder})` : '')));
      if (myTurn) {
        const min = s.current_bid + 1;
        const input = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min, max: myBudget(), placeholder: `أقل عرض ${min}`, value: amount, onInput: (e) => { amount = e.target.value; } });
        const quick = (n) => h('button', { class: 'btn ghost sm', onClick: () => { amount = String(Math.min(myBudget(), s.current_bid + n)); input.value = amount; } }, `+${n}`);
        parts.push(h('div', { class: 'card stack' }, h('div', { class: 'row' }, quick(5), quick(10), quick(20)),
          h('div', { class: 'row' }, input, h('button', { class: 'btn primary', onClick: (e) => run(async () => { await rpc('place_bid', { p_session: id, p_amount: parseInt(amount, 10) }); amount = ''; }, e.currentTarget) }, 'زايد')),
          h('button', { class: 'btn ghost block', onClick: (e) => run(async () => { if (s.current_bid === 0 && !confirm('إذا انسحبت الآن يأخذه الخصم مجانا. متأكد؟')) return; await rpc('pass_bid', { p_session: id }); }, e.currentTarget) },
            s.current_bidder_id ? 'انسحب (الخصم يأخذه)' : 'انسحب')));
      } else parts.push(h('div', { class: 'card center muted' }, `بانتظار ${names[s.turn_user_id] || 'الخصم'}…`));
      parts.push(squadList(uid, 'تشكيلتي'), squadList(oppId(), names[oppId()] || 'الخصم'));
      parts.push(h('button', { class: 'link danger', onClick: (e) => run(async () => { if (confirm('متأكد من الانسحاب؟')) await rpc('forfeit_auction', { p_session: id }); }, e.currentTarget) }, 'انسحاب'));
    } else {
      const won = s.winner_id === uid;
      parts.push(h('div', { class: 'card center stack' },
        h('h2', { class: s.winner_id ? (won ? 'win' : 'lose') : 'muted' }, s.status === 'abandoned' ? 'أُلغي المزاد' : !s.winner_id ? 'تعادل' : won ? 'فزت! +30 عملة' : 'خسرت هذه المرة'),
        h('div', { class: 'row between' }, h('span', null, 'مجموع تشكيلتك'), h('b', { class: 'gold' }, score(uid))),
        h('div', { class: 'row between' }, h('span', null, 'مجموع الخصم'), h('b', null, score(oppId()))),
        h('a', { class: 'btn primary', href: '#/home' }, 'الرئيسية')),
        squadList(uid, 'تشكيلتي'), squadList(oppId(), names[oppId()] || 'الخصم'));
    }
    view.replaceChildren(...parts);
  }

  const unsub = subscribe('auction-' + id, [{ table: 'auction_sessions', filter: `id=eq.${id}` }, { table: 'auction_squads', filter: `session_id=eq.${id}` }], () => load().catch(() => {}));
  await run(load);
  return unsub;
}
