import { supabase } from '../config/supabaseClient.js';

/**
 * اشتراك Realtime واحد لكل غرفة. أي صفحة محتاجة تحديثات الغرفة
 * تعدي من هنا بدل ما تفتح قناة خاصة بيها، لمنع تعدد الاتصالات.
 * يرجّع دالة unsubscribe لاستخدامها عند مغادرة الصفحة.
 */
export function subscribeToRoom(roomId, { onRoomUpdate, onNewEvent }) {
  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => onRoomUpdate(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'room_events', filter: `room_id=eq.${roomId}` },
      (payload) => onNewEvent(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
