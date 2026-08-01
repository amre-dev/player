import { getSession } from '../api/auth.api.js';
import { supabase } from '../config/supabaseClient.js';
import { selectSecretPlayer, askQuestion, submitAnswer, checkGuess } from '../api/rooms.api.js';
import { subscribeToRoom } from '../realtime/roomChannel.js';
import { mountPlayerSearch } from '../components/PlayerSearch.js';

const app = document.getElementById('room-app');
const roomId = new URLSearchParams(window.location.search).get('id');

let currentUserId = null;
let room = null;
let events = [];
let hasSelectedSecret = false;

async function init() {
  const { data } = await getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return;
  }
  currentUserId = data.session.user.id;

  if (!roomId) {
    window.location.href = 'home.html';
    return;
  }

  const loaded = await loadRoom();
  if (!loaded) return;

  await loadEvents();

  subscribeToRoom(roomId, {
    onRoomUpdate: (updatedRoom) => {
      room = updatedRoom;
      render();
    },
    onNewEvent: (newEvent) => {
      events.push(newEvent);
      render();
    },
  });

  render();
}

async function loadRoom() {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  if (error || !data) {
    window.location.href = 'home.html';
    return false;
  }
  room = data;
  return true;
}

async function loadEvents() {
  const { data } = await supabase
    .from('room_events')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  events = data || [];
}

function render() {
  if (room.status === 'waiting_for_player') return renderWaiting();
  if (room.status === 'selecting_players') return renderSelecting();
  if (room.status === 'in_progress') return renderPlaying();
  if (room.status === 'finished') return renderFinished();
}

// ==================== waiting_for_player ====================
function renderWaiting() {
  app.innerHTML = `
    <div class="room-state-screen">
      <p class="room-state-label">بانتظار انضمام صديقك...</p>
      <div class="room-code-box">${room.room_code}</div>
      <p class="room-state-hint">شارك الكود ده مع صديقك عشان ينضم</p>
    </div>
  `;
}

// ==================== selecting_players ====================
function renderSelecting() {
  if (hasSelectedSecret) {
    app.innerHTML = `
      <div class="room-state-screen">
        <p class="room-state-label">تم اختيارك ✓</p>
        <p class="room-state-hint">بانتظار اختيار خصمك...</p>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="room-state-screen">
      <p class="room-state-label">اختر لاعبك السري</p>
      <div id="secret-search" class="player-search"></div>
    </div>
  `;

  mountPlayerSearch(document.getElementById('secret-search'), async (player) => {
    await selectSecretPlayer(roomId, player.id);
    hasSelectedSecret = true;
    renderSelecting();
  });
}

// ==================== in_progress ====================
function renderPlaying() {
  const isAsker = room.turn_user_id === currentUserId;
  const mustAnswer = !!room.pending_question_id && !isAsker;
  const canAct = !room.pending_question_id && isAsker;
  const pendingQuestion = room.pending_question_id
    ? events.find((e) => e.id === room.pending_question_id)
    : null;

  app.innerHTML = `
    <div class="game-screen">
      <div class="scoreboard">
        <span class="scoreboard-turn">${isAsker || mustAnswer ? (isAsker ? '🔥 دورك الآن' : 'دور خصمك') : ''}</span>
      </div>
      <div class="chat-log" id="chat-log">${renderEventsHtml()}</div>
      <div class="action-bar" id="action-bar"></div>
    </div>
  `;

  const chatLog = document.getElementById('chat-log');
  chatLog.scrollTop = chatLog.scrollHeight;

  const actionBar = document.getElementById('action-bar');

  if (mustAnswer) {
    actionBar.innerHTML = `
      <p class="pending-question">${pendingQuestion ? pendingQuestion.content : ''}</p>
      <div class="answer-buttons">
        <button type="button" class="btn-secondary" data-answer="yes">نعم</button>
        <button type="button" class="btn-secondary" data-answer="no">لا</button>
        <button type="button" class="btn-secondary" data-answer="not_sure">مش متأكد</button>
      </div>
    `;
    actionBar.querySelectorAll('[data-answer]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        actionBar.querySelectorAll('button').forEach((b) => (b.disabled = true));
        await submitAnswer(roomId, btn.dataset.answer);
      });
    });
  } else if (canAct) {
    actionBar.innerHTML = `
      <form id="question-form" class="question-form">
        <input type="text" name="question" placeholder="اكتب سؤالك..." required maxlength="120">
        <button type="submit" class="btn-primary">إرسال</button>
      </form>
      <button type="button" class="btn-secondary guess-btn" id="guess-btn">🎯 خمّن الاسم</button>
      <div id="guess-search" class="player-search" hidden></div>
    `;

    document.getElementById('question-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const submitBtn = event.target.querySelector('button');
      submitBtn.disabled = true;
      await askQuestion(roomId, formData.get('question'));
    });

    document.getElementById('guess-btn').addEventListener('click', () => {
      const container = document.getElementById('guess-search');
      container.hidden = false;
      mountPlayerSearch(container, async (player) => {
        const correct = await checkGuess(roomId, player.id);
        if (!correct) {
          alert('تخمين خاطئ! انتقل الدور لخصمك');
        }
      });
    });
  } else {
    actionBar.innerHTML = `<p class="waiting-note">بانتظار دورك...</p>`;
  }
}

function renderEventsHtml() {
  const answerLabels = { yes: 'نعم', no: 'لا', not_sure: 'مش متأكد' };
  return events
    .map((e) => {
      const mine = e.user_id === currentUserId;
      let text = e.content;
      if (e.type === 'answer') text = answerLabels[e.content] || e.content;
      if (e.type === 'guess') text = 'حاول تخمين لاعب';
      return `<div class="chat-bubble ${mine ? 'is-mine' : ''} type-${e.type}"><p>${text}</p></div>`;
    })
    .join('');
}

// ==================== finished ====================
function renderFinished() {
  const won = room.winner_id === currentUserId;
  app.innerHTML = `
    <div class="room-state-screen">
      <p class="result-title ${won ? 'is-win' : 'is-lose'}">${won ? '🏆 فزت!' : 'خسرت هذه الجولة'}</p>
      ${won ? '<p class="result-coins">+20 🪙</p>' : ''}
      <a href="home.html" class="btn-primary">رجوع للرئيسية</a>
    </div>
  `;
}

init();
