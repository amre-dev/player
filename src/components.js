import { h, icon, modal, lineLabel } from './ui.js';
import { getPlayers } from './store.js';

export function playerAvatar(p, cls = '') {
  const initials = (p?.name_ar || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('');
  return p?.photo_url
    ? h('img', { class: 'pavatar ' + cls, src: p.photo_url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' })
    : h('div', { class: 'pavatar ph ' + cls }, initials);
}

export function playerCard(p, { showRating = true, price } = {}) {
  return h('div', { class: 'pcard' },
    playerAvatar(p, 'lg'),
    h('div', { class: 'pcard-name' }, p?.name_ar || '—'),
    h('div', { class: 'muted small' }, [p?.club, lineLabel[p?.line]].filter(Boolean).join(' · ')),
    showRating && p ? h('div', { class: 'rating' }, p.rating) : null,
    price != null ? h('div', { class: 'gold small' }, `${price}M`) : null);
}

// اختيار لاعب (للسري أو للتخمين)
export async function pickPlayer({ title, confirmText = 'تأكيد', onPick }) {
  const players = await getPlayers();
  let selected = null, query = '';
  const list = h('div', { class: 'plist' });
  const confirm = h('button', { class: 'btn primary block', disabled: true, onClick: async () => {
    confirm.disabled = true;
    try { await onPick(selected); close(); } catch (e) { confirm.disabled = false; throw e; }
  } }, confirmText);
  const search = h('input', { class: 'input', type: 'search', placeholder: 'ابحث باسم اللاعب…', autocomplete: 'off',
    onInput: (e) => { query = e.target.value.trim(); paint(); } });
  function paint() {
    list.replaceChildren();
    const shown = players.filter(p => !query || p.name_ar.includes(query) || (p.name_en || '').toLowerCase().includes(query.toLowerCase())).slice(0, 80);
    if (!shown.length) list.append(h('div', { class: 'empty' }, players.length ? 'لا نتائج' : 'لا يوجد لاعبون في اللعبة بعد'));
    for (const p of shown) {
      list.append(h('button', { class: 'prow' + (selected?.id === p.id ? ' on' : ''), onClick: () => { selected = p; confirm.disabled = false; paint(); } },
        playerAvatar(p), h('span', { class: 'grow' }, p.name_ar, h('small', { class: 'muted' }, ' ' + (p.club || ''))), selected?.id === p.id ? icon('check', 18) : null));
    }
  }
  paint();
  const close = modal(h('div', { class: 'stack' }, h('h3', null, title), search, list, confirm));
}

export function navBar(active) {
  const items = [['home', 'الرئيسية', '#/home'], ['users', 'الأصدقاء', '#/friends'], ['shop', 'المتجر', '#/shop'], ['user', 'حسابي', '#/profile'], ['more', 'المزيد', '#/more']];
  return h('nav', { class: 'tabbar' }, items.map(([ic, label, href]) =>
    h('a', { href, class: active === href ? 'on' : '' }, icon(ic, 22), h('span', null, label))));
}

export function header(title, { back } = {}) {
  return h('header', { class: 'topbar' },
    back ? h('a', { class: 'iconbtn', href: back, 'aria-label': 'رجوع' }, icon('back')) : h('span'),
    h('h1', null, title), h('span'));
}
