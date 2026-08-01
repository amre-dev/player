import { getSession, signOut } from '../api/auth.api.js';
import { createRoom, joinRoom } from '../api/rooms.api.js';
import { supabase } from '../config/supabaseClient.js';

const usernameEl = document.getElementById('username-display');
const coinsEl = document.getElementById('coins-display');
const createBtn = document.getElementById('create-room-btn');
const joinForm = document.getElementById('join-form');
const joinError = document.getElementById('join-error');
const logoutBtn = document.getElementById('logout-btn');

// حارس الصفحة: بدون جلسة صالحة، رجوع فوري لشاشة الدخول
async function guardAndLoad() {
  const { data } = await getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, coins_balance')
    .eq('id', data.session.user.id)
    .single();

  if (profile) {
    usernameEl.textContent = profile.username;
    coinsEl.textContent = profile.coins_balance;
  }
}
guardAndLoad();

createBtn.addEventListener('click', async () => {
  createBtn.disabled = true;
  try {
    const room = await createRoom();
    window.location.href = `room.html?id=${room.id}`;
  } catch (err) {
    createBtn.disabled = false;
    alert('تعذر إنشاء الغرفة، حاول مرة أخرى');
  }
});

joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  joinError.hidden = true;
  const formData = new FormData(joinForm);
  const code = formData.get('room_code').trim().toUpperCase();

  try {
    const room = await joinRoom(code);
    window.location.href = `room.html?id=${room.id}`;
  } catch (err) {
    joinError.textContent = 'الكود غير صحيح أو الغرفة ممتلئة';
    joinError.hidden = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await signOut();
  window.location.href = 'index.html';
});
