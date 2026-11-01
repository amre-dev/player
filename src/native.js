// تكامل أندرويد (Capacitor) اختياري؛ على الويب لا يفعل شيئا
const cap = () => window.Capacitor;
const isNative = () => !!cap()?.isNativePlatform?.();
const plugin = (n) => cap()?.Plugins?.[n];

export async function initNative() {
  if (!isNative()) return;
  try { await plugin('LocalNotifications')?.requestPermissions(); } catch {}
  try { await plugin('StatusBar')?.setBackgroundColor({ color: '#0A1628' }); } catch {}
}

export async function notifyNative(title, body) {
  if (!isNative()) return;
  try {
    await plugin('LocalNotifications')?.schedule({ notifications: [{ id: Math.floor(Math.random() * 2147483647), title, body: body || '', smallIcon: 'ic_stat_icon' }] });
  } catch {}
}
