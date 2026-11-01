import { h, icon, run, toast, lineLabel } from '../ui.js';
import { rpc, sb, q, subscribe } from '../api/client.js';
import { store, getPlayers } from '../store.js';
import { pickPlayer, playerAvatar, playerCard, header } from '../components.js';

const ANSWERS = { yes: 'نعم', no: 'لا', not_sure: 'لست متأكدا' };

export async function duelPage(root, { id }) {
  const uid = store.me.id;
  let room = null, events = [], names = {}, seq = 0, ticker = null, draft = '', revealed = null, selected = false;
  const view = h('main', { class: 'page room' });
  root.replaceChildren(header('مبارزة التخمين', { back: '#/home' }), view);
  await getPlayers();

  async function load() {
    const my = ++seq;
    const [r, ev] = await Promise.all([
      q(sb.from('rooms').select('*').eq('id', id).single()),
      q(sb.from('room_events').select('*').eq('room_id', id).order('created_at')),
    ]);
    if (my !== seq) return;
    room = r; events = ev;
    const ids = [r.player1_id, r.player2_id].filter(Boolean).filter(x => !names[x]);
    if (ids.length) (await q(sb.from('profiles').select('id,username').in('id', ids))).forEach(p => { names[p.id] = p.username; });
    if (['finished', 'abandoned'].includes(r.status) && !revealed) revealed = await rpc('get_revealed_opponent_player', { p_room: id }).catch(() => null);
    if (r.status === 'selecting_players') {
      const mine = await q(sb.from('room_secret_players').select('player_id').eq('room_id', id));
      selected = mine.length > 0;
    }
    paint();
  }

  const opp = () => (room.player1_id === uid ? room.player2_id : room.player1_id);

  function paint() {
    if (!room) return;
    const s = room.status;
    const parts = [];
    if (s === 'waiting_for_player') {
      parts.push(h('div', { class: 'card center stack' }, h('div', { class: 'muted' }, 'شارك هذا الكود مع صديقك'),
        h('div', { class: 'bigcode' }, room.room_code),
        h('button', { class: 'btn ghost', onClick: async () => { try { await navigator.clipboard.writeText(room.room_code); toast('تم النسخ', 'ok'); } catch { toast(room.room_code); } } }, icon('copy', 18), ' نسخ الكود'),
        h('div', { class: 'muted small' }, 'بانتظار انضمام اللاعب الآخر…'),
        room.player1_id === uid ? h('button', { class: 'link danger', onClick: (e) => run(async () => { await rpc('cancel_room', { p_room: id }); location.hash = '#/home'; }, e.currentTarget) }, 'إلغاء الغرفة') : null));
    } else if (s === 'selecting_players') {
      parts.push(h('div', { class: 'card center stack' }, h('h3', null, `خصمك: ${names[opp()] || '—'}`),
        selected ? h('div', { class: 'muted' }, 'اخترت لاعبك، بانتظار الخصم…')
          : h('button', { class: 'btn primary', onClick: () => pickPlayer({ title: 'اختر لاعبك السري', confirmText: 'هذا لاعبي', onPick: async (p) => { await rpc('select_secret_player', { p_room: id, p_player: p.id }); selected = true; paint(); } }) }, 'اختر لاعبك السري'),
        h('button', { class: 'link danger', onClick: (e) => run(() => forfeit(), e.currentTarget) }, 'انسحاب')));
    } else if (s === 'in_progress') {
      const myTurn = room.turn_user_id === uid;
      const pending = room.pending_question_id && events.find(e => e.id === room.pending_question_id);
      const left = Math.max(0, Math.floor((new Date(room.expires_at) - Date.now()) / 1000));
      parts.push(h('div', { class: 'card row between' },
        h('span', null, myTurn ? (pending ? 'بانتظار إجابة خصمك…' : 'دورك') : (pending ? 'أجب على السؤال' : `دور ${names[room.turn_user_id] || 'الخصم'}`)),
        h('b', { id: 'clock', class: left < 60 ? 'lose' : 'gold' }, `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`)));
      parts.push(h('div', { class: 'log' }, events.map(e => logRow(e))));
      if (pending && !myTurn) {
        parts.push(h('div', { class: 'card stack' }, h('b', null, pending.content), h('div', { class: 'answers' },
          h('button', { class: 'ans yes', onClick: (e) => run(() => rpc('submit_answer', { p_room: id, p_answer: 'yes' }), e.currentTarget) }, icon('check', 28), 'نعم'),
          h('button', { class: 'ans no', onClick: (e) => run(() => rpc('submit_answer', { p_room: id, p_answer: 'no' }), e.currentTarget) }, icon('x', 28), 'لا'),
          h('button', { class: 'ans unsure', onClick: (e) => run(() => rpc('submit_answer', { p_room: id, p_answer: 'not_sure' }), e.currentTarget) }, icon('help', 28), 'لست متأكدا'))));
      } else if (myTurn && !pending) {
        const input = h('input', { class: 'input', placeholder: 'اسأل سؤال نعم/لا…', maxlength: 200, value: draft, onInput: (e) => { draft = e.target.value; } });
        const send = h('button', { class: 'btn primary', onClick: (e) => run(async () => { const t = draft; await rpc('ask_question', { p_room: id, p_text: t }); draft = ''; }, e.currentTarget) }, 'اسأل');
        parts.push(h('div', { class: 'card stack' }, h('div', { class: 'row' }, input, send),
          h('button', { class: 'btn gold block', onClick: () => pickPlayer({ title: 'خمّن لاعب خصمك', confirmText: 'هذا هو!', onPick: async (p) => {
            const ok = await rpc('check_guess', { p_room: id, p_player: p.id });
            toast(ok ? 'تخمين صحيح!' : 'تخمين خاطئ، انتقل الدور للخصم', ok ? 'ok' : 'error');
          } }) }, 'أعرف اللاعب! خمّن الآن')));
      }
      parts.push(h('button', { class: 'link danger', onClick: (e) => run(() => forfeit(), e.currentTarget) }, 'انسحاب'));
    } else {
      const won = room.winner_id === uid;
      parts.push(h('div', { class: 'card center stack' },
        h('h2', { class: room.winner_id ? (won ? 'win' : 'lose') : 'muted' }, s === 'abandoned' ? 'انتهى الوقت أو أُلغيت الغرفة' : won ? 'فزت! +20 عملة' : 'خسرت هذه المرة'),
        revealed ? [h('div', { class: 'muted small' }, 'لاعب خصمك كان:'), playerCard(revealed)] : null,
        h('a', { class: 'btn primary', href: '#/home' }, 'الرئيسية')));
      if (events.length) parts.push(h('div', { class: 'log' }, events.map(e => logRow(e))));
    }
    view.replaceChildren(...parts);
    const log = view.querySelector('.log'); if (log) log.scrollTop = log.scrollHeight;
  }

  function logRow(e) {
    const mine = e.user_id === uid;
    const who = mine ? 'أنت' : (names[e.user_id] || 'الخصم');
    if (e.type === 'question') return h('div', { class: 'msg q' + (mine ? ' mine' : '') }, h('small', null, who), e.content);
    if (e.type === 'answer') return h('div', { class: 'msg a ' + e.content }, h('small', null, who), ANSWERS[e.content] || e.content);
    if (e.type === 'guess') return h('div', { class: 'msg g ' + (e.payload?.correct ? 'ok' : 'bad') }, h('small', null, who + ' خمّن'), `${e.content} — ${e.payload?.correct ? 'صحيح' : 'خطأ'}`);
    return h('div', { class: 'msg' }, e.content);
  }

  async function forfeit() { if (confirm('متأكد من الانسحاب؟ ستخسر المباراة.')) await rpc('forfeit_room', { p_room: id }); }

  const unsub = subscribe('room-' + id, [{ table: 'rooms', filter: `id=eq.${id}` }, { table: 'room_events', filter: `room_id=eq.${id}` }], () => load().catch(() => {}));
  ticker = setInterval(() => {
    if (room?.status !== 'in_progress') return;
    const left = Math.floor((new Date(room.expires_at) - Date.now()) / 1000);
    const c = document.getElementById('clock');
    if (c) c.textContent = `${String(Math.max(0, Math.floor(left / 60))).padStart(2, '0')}:${String(Math.max(0, left % 60)).padStart(2, '0')}`;
    if (left <= 0) rpc('claim_timeout', { p_room: id }).catch(() => {});
  }, 1000);
  await run(load);
  return () => { unsub(); clearInterval(ticker); };
}
