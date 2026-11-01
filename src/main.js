import { sb, subscribe } from './api/client.js';
import { store, refreshMe } from './store.js';
import { h, toast } from './ui.js';
import { authPage } from './pages/auth.js';
import { homePage } from './pages/home.js';
import { friendsPage } from './pages/friends.js';
import { shopPage } from './pages/shop.js';
import { profilePage } from './pages/profile.js';
import { morePage } from './pages/more.js';
import { duelPage } from './pages/duel.js';
import { auctionPage } from './pages/auction.js';
import { initNative, notifyNative } from './native.js';

const root = document.getElementById('app');
const routes = {
  home: homePage, friends: friendsPage, shop: shopPage, profile: profilePage, more: morePage,
  duel: duelPage, auction: auctionPage,
};
let cleanup = null, notesUnsub = null, token = 0;

async function render() {
  const my = ++token;
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  const [name, id] = (location.hash.replace(/^#\//, '') || 'home').split('/');
  try {
    if (!store.me && !(await refreshMe())) {
      if (notesUnsub) { notesUnsub(); notesUnsub = null; }
      if (my === token) authPage(root);
      return;
    }
    if (name === 'auth') { location.hash = '#/home'; return; }
    startNotifications();
    const page = routes[name] || homePage;
    const result = await page(root, { id });
    if (my !== token) { if (typeof result === 'function') result(); return; }
    if (typeof result === 'function') cleanup = result;
  } catch (e) {
    root.replaceChildren(h('main', { class: 'page center stack' }, h('h3', null, 'تعذّر تحميل الصفحة'), h('p', { class: 'muted' }, e.message),
      h('button', { class: 'btn primary', onClick: () => render() }, 'إعادة المحاولة')));
  }
}

function startNotifications() {
  if (notesUnsub || !store.me) return;
  notesUnsub = subscribe('notes-' + store.me.id, [{ table: 'notifications', filter: `user_id=eq.${store.me.id}` }], (payload) => {
    if (payload.eventType !== 'INSERT') return;
    const n = payload.new;
    toast(n.title + (n.body ? ' — ' + n.body : ''), 'ok');
    notifyNative(n.title, n.body);
  });
}

sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { store.me = null; if (notesUnsub) { notesUnsub(); notesUnsub = null; } } });
window.addEventListener('hashchange', render);
initNative();
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.Capacitor?.isNativePlatform?.()) navigator.serviceWorker.register('./sw.js').catch(() => {});
