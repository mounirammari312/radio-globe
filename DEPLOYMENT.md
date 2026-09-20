# Radio Globe — نشر التطبيق على Vercel

تم بناء تطبيق "Radio Globe" بنجاح! هذا دليل النشر على Vercel.

## ما تم إنجازه

تطبيق ويب تفاعلي مستوحى من Radio Garden يحتوي على:

- **كرة أرضية ثلاثية الأبعاد** مع آلاف المحطات المرئية كنقاط خضراء
- **مشغل صوتي مباشر** لآلاف محطات الراديو العالمية
- **بحث فوري** عن أي محطة بالاسم أو الوسوم (pop, rock, jazz, news, …)
- **المفضلة** والسجل الأخير للمحطات المستمعة
- **شريط تشغيل سفلي** مع تحكم بالصوت، تشغيل/إيقاف، وفتح موقع المحطة
- تصميم داكن أنيق متجاوب مع جميع الأجهزة

## التقنيات المستخدمة

- Next.js 16 + TypeScript + Tailwind CSS 4
- react-globe.gl + Three.js لكرة الأرض ثلاثية الأبعاد
- Radio Browser API (مجاني ومفتوح) لبيانات المحطات
- Zustand لإدارة الحالة
- shadcn/ui للمكوّنات

## خطوات النشر على Vercel

### الطريقة 1: النشر عبر GitHub (موصى بها)

1. **أنشئ مستودع على GitHub:**
   ```bash
   # من مجلد المشروع
   git init
   git add .
   git commit -m "Radio Globe - Radio Garden clone"
   git branch -M main
   git remote add origin https://github.com/USERNAME/radio-globe.git
   git push -u origin main
   ```

2. **استيراد المشروع في Vercel:**
   - اذهب إلى https://vercel.com/new
   - اختر مستودع `radio-globe` من GitHub
   - Vercel سيتعرّف تلقائياً على إعدادات Next.js
   - اضغط **Deploy** — خلال 2-3 دقائق سيكون التطبيق حياً!

### الطريقة 2: النشر عبر Vercel CLI

1. **تثبيت Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **تسجيل الدخول:**
   ```bash
   vercel login
   ```

3. **النشر من مجلد المشروع:**
   ```bash
   cd /home/z/my-project
   vercel --prod
   ```
   - اتبع التعليمات (اضغط Enter لكل خيار لاستخدام الإعدادات الافتراضية)
   - ستحصل على رابط مباشر للتطبيق خلال دقائق

## إعدادات Vercel المطلوبة

ملف `vercel.json` موجود بالفعل ويتضمن:
- إعداد Next.js framework تلقائياً
- مهلة زمنية 30 ثانية لـ API للوصول للمحطات
- تخزين مؤقت لاستجابات API (ساعة واحدة)

**متغيرات البيئة:** غير مطلوبة! التطبيق يستخدم Radio Browser API المجاني بدون مفتاح API.

## اختبار التطبيق محلياً

```bash
cd /home/z/my-project
bun install
bun run dev
```
ثم افتح http://localhost:3000 في المتصفح.

## ملاحظات

- قد يستغرق تحميل المحطات أول مرة 5-12 ثانية بسبب حجم البيانات (آلاف المحطات)
- بعض محطات البث قد لا تعمل بسبب جودة رابط البث أو قيود الشبكة
- التطبيق يعمل بشكل أفضل على المتصفحات الحديثة (Chrome, Firefox, Safari)
