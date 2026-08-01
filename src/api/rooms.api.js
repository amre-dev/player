import { supabase } from '../config/supabaseClient.js';

export async function createRoom() {
  const { data, error } = await supabase.rpc('create_room');
  if (error) throw error;
  return data;
}

export async function joinRoom(roomCode) {
  const { data, error } = await supabase.rpc('join_room', { p_room_code: roomCode });
  if (error) throw error;
  return data;
}

export async function selectSecretPlayer(roomId, playerId) {
  const { error } = await supabase.rpc('select_secret_player', {
    p_room_id: roomId,
    p_player_id: playerId,
  });
  if (error) throw error;
}

export async function askQuestion(roomId, content) {
  const { error } = await supabase.rpc('ask_question', {
    p_room_id: roomId,
    p_content: content,
  });
  if (error) throw error;
}

export async function submitAnswer(roomId, answer) {
  const { error } = await supabase.rpc('submit_answer', {
    p_room_id: roomId,
    p_answer: answer,
  });
  if (error) throw error;
}

/** يرجّع true/false. أي رسالة خطأ (مثلاً "ليس دورك الآن") بترمي exception. */
export async function checkGuess(roomId, guessedPlayerId) {
  const { data, error } = await supabase.rpc('check_guess', {
    p_room_id: roomId,
    p_guessed_player_id: guessedPlayerId,
  });
  if (error) throw error;
  return data;
}
