import { sb, q } from './api/client.js';

export const store = { me: null, players: null, session: null };

export async function refreshMe() {
  const { data } = await sb.auth.getSession();
  store.session = data.session;
  if (!data.session) { store.me = null; return null; }
  const rows = await q(sb.from('profiles').select('*').eq('id', data.session.user.id).limit(1));
  store.me = rows[0] || null;
  return store.me;
}

export async function getPlayers() {
  if (!store.players) store.players = await q(sb.from('players').select('*').order('rating', { ascending: false }));
  return store.players;
}

export const playerById = (id) => (store.players || []).find(p => p.id === id);
