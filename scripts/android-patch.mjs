// تعديلات بسيطة على مشروع أندرويد المولَّد: أيقونة الإشعار و دعم RTL
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const res = 'android/app/src/main/res';
mkdirSync(`${res}/drawable`, { recursive: true });
writeFileSync(`${res}/drawable/ic_stat_icon.xml`, `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFFFF" android:pathData="M12,2a10,10 0 1,0 0,20a10,10 0 1,0 0,-20zM9,8h2v8h-2zM13,8h2.5a2,2 0 0,1 2,2v4a2,2 0 0,1 -2,2h-2.5z"/></vector>`);
const mf = 'android/app/src/main/AndroidManifest.xml';
if (existsSync(mf)) {
  let x = readFileSync(mf, 'utf8');
  if (!x.includes('android:supportsRtl')) x = x.replace('<application', '<application android:supportsRtl="true"');
  writeFileSync(mf, x);
}
console.log('android patched');
