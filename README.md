# Player IQ — نسخة نظيفة (Spider Studio)

ويب PWA + تطبيق أندرويد (Capacitor) على قاعدة Supabase جديدة.

## الهيكل
- `src/api/client.js` الطبقة الوحيدة التي تكلّم Supabase، `src/pages/*` الشاشات، `src/components.js` مكوّنات مشتركة.
- كل الكتابات الحساسة عبر دوال RPC (SECURITY DEFINER) محصورة على `authenticated`. اللاعب السري لا يصل للخصم أبدا.
- Supabase: مشروع `playeriq` (ihfymdwjjkwvkqjmfzjx) — المخطط مطبّق كـ 3 migrations.

## التشغيل
1. ارفع هذا المجلد كمستودع GitHub (الفرع main).
2. **APK**: تبويب Actions → "Build Android APK" → Run workflow → حمّل `PlayerIQ-debug-apk` من Artifacts.
3. **Netlify**: Add new site → Import from Git → المستودع (الإعدادات تُقرأ من `netlify.toml`).

## إعدادات لازمة في لوحة Supabase (مرة واحدة)
- Authentication → Sign In / Providers → Email → **أوقف "Confirm email"** (الحسابات ببريد وهمي).
- Authentication → Password security → فعّل "Leaked password protection".

## بيانات اللعبة
اللاعبون والمتجر فارغان: أضف صفوف في جدول `players` (name_ar, rating, line = goalkeeper/first/second, club, photo_url)
و `shop_items` (type = frame/title, name_ar, price, image_url). المزاد يلزمه 3+ لاعبين على الأقل لكل خط (يفضّل 15+).

## نسخة الويب بدون بناء
مجلد `web/` يشغّل اللعبة مباشرة كملفات HTML/CSS/JS (مكتبة Supabase تُحمَّل من CDN). افتحه عبر أي استضافة ملفات ثابتة،
مثلا GitHub Pages: `https://amre-dev.github.io/player/web/`. لا تفتحه بنقر مزدوج (file://) لأن وحدات JS تحتاج خادما.
## إضافة منتجات للمتجر
أدخل صفا في جدول `shop_items`: type (`frame` أو `title`)، name_ar، price، image_url، sort_order، active=true.
