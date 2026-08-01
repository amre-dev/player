import { supabase } from '../config/supabaseClient.js';

export async function searchPlayers(query) {
  const { data, error } = await supabase
    .from('players')
    .select('id, name_ar, name_en, photo_url, club, nationality, position')
    .or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%`)
    .limit(10);
  if (error) throw error;
  return data;
}
