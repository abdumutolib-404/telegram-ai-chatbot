# Telegram AI Chatbot

Professional Telegram AI chatbot with OpenRouter integration, admin panel, and comprehensive user management.

## Xususiyatlari

- 🤖 **AI Chat**: OpenRouter orqali turli AI modellari bilan suhbat
- 👥 **Guruh qo'llab-quvvatlash**: Reply va mention orqali javob berish
- 💰 **Token boshqaruvi**: Kunlik va umumiy limitlar
- 📊 **Statistika**: Foydalanuvchi va tizim statistikasi
- ⚙️ **Admin Panel**: To'liq boshqaruv paneli
- 📢 **Broadcast**: Xabar yuborish tizimi
- 🔒 **Xavfsizlik**: ELS va autentifikatsiya

## O'rnatish

1. **Repository clone qiling:**
```bash
git clone https://github.com/Abdumutolib-404/telegram-ai-chatbot.git
cd telegram-ai-chatbot
```

2. **Dependencies o'rnating:**
```bash
npm install
```

3. **Environment variables sozlang:**
```bash
cp .env.example .env
```

`.env` faylini to'ldiring:

4. **Botni ishga tushiring:**
```bash
npm run dev
```

## Buyruqlar

### Foydalanuvchi buyruqlari:
- `/start` - Botni boshlash
- `/stats` - Statistika ko'rish
- `/balance` - Balans tekshirish
- `/model` - Model tanlash

### Admin buyruqlari:
- `/admin` - Admin panel
- `/add_tokens <user_id> <daily> <total>` - Token qo'shish

## Tugmalar

Barcha asosiy funksiyalar inline tugmalar orqali ishlaydi:
- Model tanlash
- Statistika ko'rish
- Admin panel
- Broadcast yuborish

## AI Modellari

Botda quyidagi modellar mavjud (o'zingiz qo'shishingiz mumkin):
models.txt faylida mavjud.

## Xavfsizlik

- Enterpise Level Security (ELS) yoqilgan
- Faqat admin foydalanuvchilar boshqaruv funksiyalariga kirish huquqiga ega
- Token limitlari avtomatik tekshiriladi

## Qo'llab-quvvatlash

Savollar uchun admin bilan bog'laning.