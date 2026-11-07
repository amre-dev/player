// تكامل أندرويد (Capacitor). على الويب هذه الدوال لا تفعل شيئا
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

const isNative = () => Capacitor.isNativePlatform();

export async function initNative() {
  if (!isNative()) return;
  try { await LocalNotifications.requestPermissions(); } catch {}
  try { await StatusBar.setStyle({ style: Style.Dark }); await StatusBar.setBackgroundColor({ color: '#0A1628' }); } catch {}
}

export async function notifyNative(title, body) {
  if (!isNative()) return;
  try { await LocalNotifications.schedule({ notifications: [{ id: Math.floor(Math.random() * 2147483647), title, body: body || '', smallIcon: 'ic_stat_icon' }] }); } catch {}
}

// الروابط العميقة: تأكيد الإيميل / استعادة كلمة المرور تفتح التطبيق
export function onAppUrl(cb) {
  if (!isNative()) return;
  try { App.addListener('appUrlOpen', (e) => cb(e.url)); } catch {}
}
