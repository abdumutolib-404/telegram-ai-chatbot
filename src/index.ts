import { Telegraf, Context, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { database } from "./config/database.js";
import { openRouterService } from "./services/openrouter.js";
import { userService } from "./services/user.js";
import { adminService } from "./services/admin.js";
import { statsService } from "./services/stats.js";
import { modelService } from "./services/model.js";
import { broadcastService } from "./services/broadcast.js";
import { promocodeService } from "./services/promocode.js";
import { ADMIN_IDS, BOT_TOKEN } from "./config/constants.js";
import { BotContext } from "./types/bot.js";
import { logger } from "./utils/logger.js";

const bot = new Telegraf<BotContext>(BOT_TOKEN);

// Chat mode tracking
const chatModeUsers = new Set<number>();

// Middleware - foydalanuvchini ro'yxatdan o'tkazish
bot.use(async (ctx, next) => {
  if (ctx.from) {
    await userService.ensureUser(ctx.from);
    logger.user(`User activity: ${ctx.from.first_name}`, {
      user_id: ctx.from.id,
      username: ctx.from.username,
      message_type: ctx.message?.text
        ? "text"
        : ctx.callbackQuery
        ? "callback"
        : "other",
      chat_type: ctx.chat?.type,
    });
  }
  return next();
});

// /start buyrug'i
bot.start(async (ctx) => {
  logger.info(`Start command`, {
    user_id: ctx.from!.id,
    name: ctx.from!.first_name,
  });

  const user = await userService.getUser(ctx.from!.id);

  // Ro'yxatdan o'tish tekshiruvi
  if (!user?.registration_completed) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📝 Ro'yxatdan o'tish", "start_registration")],
      [Markup.button.callback("⏭️ O'tkazib yuborish", "skip_registration")],
    ]);

    return ctx.reply(
      `🎉 Assalomu alaykum, ${ctx.from!.first_name}!\n\n` +
        `🤖 Men AI chatbot man. Sizga turli AI modellari bilan suhbatlashishda yordam beraman.\n\n` +
        `📝 Yaxshiroq xizmat ko'rsatish uchun qisqacha ma'lumot bering yoki o'tkazib yuboring.`,
      keyboard
    );
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("💬 Suhbat boshlash", "start_chat")],
    [Markup.button.callback("🤖 Model tanlash", "select_model")],
    [
      Markup.button.callback("📊 Statistika", "stats"),
      Markup.button.callback("💰 Balans", "balance"),
    ],
    [Markup.button.callback("🎫 Promokod", "use_promocode")],
    ...(ADMIN_IDS.includes(ctx.from!.id)
      ? [[Markup.button.callback("⚙️ Admin Panel", "admin_panel")]]
      : []),
  ]);

  await ctx.reply(
    `🎉 Assalomu alaykum, ${ctx.from!.first_name}!\n\n` +
      `🤖 Men AI chatbot man. Sizga turli AI modellari bilan suhbatlashishda yordam beraman.\n\n` +
      `📝 Guruhda: Reply yoki @mention qiling\n` +
      `💬 Shaxsiy chatda: "Suhbat boshlash" tugmasini bosing\n\n` +
      `🆔 Sizning ID: ${ctx.from!.id}`,
    keyboard
  );
});

// Chat mode handlers
bot.action("start_chat", async (ctx) => {
  const user = await userService.getUser(ctx.from!.id);
  if (!user?.selected_model) {
    return ctx.editMessageText(
      "❌ Avval AI modelni tanlang!",
      Markup.inlineKeyboard([
        [Markup.button.callback("🤖 Model tanlash", "select_model")],
        [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
      ])
    );
  }

  chatModeUsers.add(ctx.from!.id);
  logger.info(`Chat mode started`, { user_id: ctx.from!.id });

  // 1. Edit the message with an inline keyboard (required by Telegram)
  await ctx.editMessageText(
    `💬 Suhbat rejimi yoqildi!\n\n` +
      `🤖 Tanlangan model: ${user.selected_model}\n\n` +
      `📝 Endi har qanday xabar yozsangiz, AI javob beradi.\n` +
      `🔚 Suhbatni tugatish uchun "Suhbatni tugatish" tugmasini bosing.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );

  // 2. Send a new message with a reply keyboard for chat mode
  await ctx.reply("🔚 Suhbatni tugatish uchun quyidagi tugmani bosing.", {
    reply_markup: {
      keyboard: [[{ text: "🔚 Suhbatni tugatish" }]],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });
});

// Chat mode end handler
bot.hears("🔚 Suhbatni tugatish", async (ctx) => {
  if (chatModeUsers.has(ctx.from!.id)) {
    chatModeUsers.delete(ctx.from!.id);
    logger.info(`Chat mode ended`, { user_id: ctx.from!.id });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("💬 Suhbat boshlash", "start_chat")],
      [Markup.button.callback("🤖 Model tanlash", "select_model")],
      [
        Markup.button.callback("📊 Statistika", "stats"),
        Markup.button.callback("💰 Balans", "balance"),
      ],
      [Markup.button.callback("🎫 Promokod", "use_promocode")],
      ...(ADMIN_IDS.includes(ctx.from!.id)
        ? [[Markup.button.callback("⚙️ Admin Panel", "admin_panel")]]
        : []),
    ]);

    await ctx.reply(
      `✅ Suhbat rejimi tugatildi!\n\n` + `🏠 Asosiy menyuga qaytdingiz.`,
      { ...keyboard, reply_markup: { remove_keyboard: true } }
    );
  }
});

// Ro'yxatdan o'tish jarayoni
bot.action("start_registration", async (ctx) => {
  logger.info(`Registration started`, { user_id: ctx.from!.id });
  ctx.session = { step: "name" };
  await ctx.editMessageText(
    "👤 Ismingizni kiriting:\n\n" +
      "💡 Bu ma'lumot sizga shaxsiylashtirilgan javoblar berish uchun kerak.",
    Markup.inlineKeyboard([
      [Markup.button.callback("⏭️ O'tkazib yuborish", "skip_name")],
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

bot.action("skip_name", async (ctx) => {
  ctx.session = { step: "age" };
  await ctx.editMessageText(
    "👤 Yoshingizni kiriting (masalan: 25):\n\n" +
      "💡 Bu ma'lumot sizga mos javoblar berish uchun kerak.",
    Markup.inlineKeyboard([
      [Markup.button.callback("⏭️ O'tkazib yuborish", "skip_age")],
      [Markup.button.callback("⬅️ Orqaga", "start_registration")],
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

bot.action("skip_age", async (ctx) => {
  ctx.session = { step: "interests" };
  await ctx.editMessageText(
    "🎯 Qiziqishlaringizni kiriting (masalan: dasturlash, sport, musiqa):\n\n" +
      "💡 Bu sizga tegishli javoblar berish uchun kerak.",
    Markup.inlineKeyboard([
      [Markup.button.callback("⏭️ O'tkazib yuborish", "complete_registration")],
      [Markup.button.callback("⬅️ Orqaga", "skip_name")],
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

bot.action("skip_registration", async (ctx) => {
  logger.success(`Registration skipped`, { user_id: ctx.from!.id });
  await userService.completeRegistration(ctx.from!.id);
  ctx.session = undefined;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("💬 Suhbat boshlash", "start_chat")],
    [Markup.button.callback("🤖 Model tanlash", "select_model")],
    [
      Markup.button.callback("📊 Statistika", "stats"),
      Markup.button.callback("💰 Balans", "balance"),
    ],
    [Markup.button.callback("🎫 Promokod", "use_promocode")],
  ]);

  await ctx.editMessageText(
    `✅ Xush kelibsiz!\n\n` +
      `🤖 Endi AI modellari bilan suhbatlashishingiz mumkin.\n\n` +
      `🆔 Sizning ID: ${ctx.from!.id}`,
    keyboard
  );
});

bot.action("complete_registration", async (ctx) => {
  logger.success(`Registration completed`, { user_id: ctx.from!.id });
  await userService.completeRegistration(ctx.from!.id);
  ctx.session = undefined;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("💬 Suhbat boshlash", "start_chat")],
    [Markup.button.callback("🤖 Model tanlash", "select_model")],
    [
      Markup.button.callback("📊 Statistika", "stats"),
      Markup.button.callback("💰 Balans", "balance"),
    ],
    [Markup.button.callback("🎫 Promokod", "use_promocode")],
  ]);

  await ctx.editMessageText(
    `✅ Ro'yxatdan o'tish yakunlandi!\n\n` +
      `🤖 Endi AI modellari bilan suhbatlashishingiz mumkin.\n\n` +
      `🆔 Sizning ID: ${ctx.from!.id}`,
    keyboard
  );
});

bot.action("back_to_main", async (ctx) => {
  ctx.session = undefined;
  chatModeUsers.delete(ctx.from!.id);

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("💬 Suhbat boshlash", "start_chat")],
    [Markup.button.callback("🤖 Model tanlash", "select_model")],
    [
      Markup.button.callback("📊 Statistika", "stats"),
      Markup.button.callback("💰 Balans", "balance"),
    ],
    [Markup.button.callback("🎫 Promokod", "use_promocode")],
    ...(ADMIN_IDS.includes(ctx.from!.id)
      ? [[Markup.button.callback("⚙️ Admin Panel", "admin_panel")]]
      : []),
  ]);

  await ctx.editMessageText(
    `🎉 Assalomu alaykum, ${ctx.from!.first_name}!\n\n` +
      `🤖 Men AI chatbot man. Sizga turli AI modellari bilan suhbatlashishda yordam beraman.\n\n` +
      `📝 Guruhda: Reply yoki @mention qiling\n` +
      `💬 Shaxsiy chatda: "Suhbat boshlash" tugmasini bosing\n\n` +
      `🆔 Sizning ID: ${ctx.from!.id}`,
    {
      ...keyboard,
      reply_markup: keyboard.reply_markup,
    }
  );
});

// Promokod tugmasi
bot.action("use_promocode", async (ctx) => {
  ctx.session = { step: "enter_promocode" };
  await ctx.editMessageText(
    "🎫 Promokod kiriting:\n\n" +
      "Promokod kodini yozing (masalan: BONUS2025)\n\n" +
      "💡 Promokod orqali qo'shimcha tokenlar olishingiz mumkin.",
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

// Ro'yxatdan o'tish xabarlari
bot.on(message("text"), async (ctx, next) => {
  if (ctx.session?.step) {
    const text = ctx.message.text;
    logger.info(`Session step: ${ctx.session.step}`, {
      user_id: ctx.from.id,
      text_length: text.length,
    });

    if (ctx.session.step === "name") {
      if (text.length > 2 && text.length < 50) {
        await userService.updateUserInfo(ctx.from.id, { name: text });
        ctx.session.step = "age";

        return ctx.reply(
          "👤 Yoshingizni kiriting (masalan: 25):\n\n" +
            "💡 Bu ma'lumot sizga mos javoblar berish uchun kerak.",
          Markup.inlineKeyboard([
            [Markup.button.callback("⏭️ O'tkazib yuborish", "skip_age")],
            [Markup.button.callback("⬅️ Orqaga", "start_registration")],
            [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
          ])
        );
      } else {
        return ctx.reply(
          "❌ Iltimos, to'g'ri ism kiriting (2-50 belgi oralig'ida)"
        );
      }
    }

    if (ctx.session.step === "age") {
      const age = parseInt(text);
      if (age && age > 0 && age < 120) {
        await userService.updateUserInfo(ctx.from.id, { age });
        ctx.session.step = "interests";

        return ctx.reply(
          "🎯 Qiziqishlaringizni kiriting (masalan: dasturlash, sport, musiqa):\n\n" +
            "💡 Bu sizga tegishli javoblar berish uchun kerak.",
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "⏭️ O'tkazib yuborish",
                "complete_registration"
              ),
            ],
            [Markup.button.callback("⬅️ Orqaga", "skip_name")],
            [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
          ])
        );
      } else {
        return ctx.reply(
          "❌ Iltimos, to'g'ri yosh kiriting (1-120 oralig'ida)"
        );
      }
    }

    if (ctx.session.step === "interests") {
      if (text.length > 2 && text.length < 200) {
        await userService.updateUserInfo(ctx.from.id, { interests: text });
        await userService.completeRegistration(ctx.from.id);
        ctx.session = undefined;

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("💬 Suhbat boshlash", "start_chat")],
          [Markup.button.callback("🤖 Model tanlash", "select_model")],
          [
            Markup.button.callback("📊 Statistika", "stats"),
            Markup.button.callback("💰 Balans", "balance"),
          ],
          [Markup.button.callback("🎫 Promokod", "use_promocode")],
        ]);

        return ctx.reply(
          `✅ Ro'yxatdan o'tish yakunlandi!\n\n` +
            `🤖 Endi AI modellari bilan suhbatlashishingiz mumkin.\n\n` +
            `🆔 Sizning ID: ${ctx.from.id}`,
          keyboard
        );
      } else {
        return ctx.reply(
          "❌ Iltimos, qiziqishlaringizni to'liqroq yozing (2-200 belgi)"
        );
      }
    }

    // Promokod kiritish
    if (ctx.session.step === "enter_promocode") {
      const code = text.toUpperCase().trim();

      try {
        const result = await promocodeService.usePromocode(code, ctx.from.id);
        ctx.session = undefined;

        if (result.success) {
          return ctx.reply(
            `✅ ${result.message}\n\n` +
              `🎁 Qo'shildi:\n` +
              `🔥 Kunlik: +${result.tokens!.daily} token\n` +
              `💎 Umumiy: +${result.tokens!.total} token`
          );
        } else {
          return ctx.reply(`❌ ${result.message}`);
        }
      } catch (error) {
        logger.error(`Promocode error`, {
          error: error.message,
          user_id: ctx.from.id,
          code,
        });
        ctx.session = undefined;
        return ctx.reply("❌ Promokod ishlatishda xatolik yuz berdi");
      }
    }

    // Broadcast xabar yuborish (faqat adminlar uchun)
    if (
      ctx.session.step === "broadcast_message" &&
      ADMIN_IDS.includes(ctx.from.id)
    ) {
      const message = text;
      const type = ctx.session.data?.type;
      const count = ctx.session.data?.count;

      logger.broadcast(`Broadcasting message`, {
        type,
        count,
        admin_id: ctx.from.id,
        message_length: message.length,
      });

      try {
        let successCount = 0;

        if (type === "all") {
          successCount = await broadcastService.broadcastToAll(bot, message);
        } else if (type === "active") {
          successCount = await broadcastService.broadcastToActive(bot, message);
        } else if (type === "count" && count) {
          successCount = await broadcastService.broadcastToCount(
            bot,
            message,
            count
          );
        } else if (type === "groups") {
          successCount = await broadcastService.broadcastToGroups(bot, message);
        }

        ctx.session = undefined;
        logger.success(`Broadcast completed`, { successCount, type, count });
        return ctx.reply(
          `✅ Broadcast yuborildi!\n\n📊 Muvaffaqiyatli: ${successCount} ta`
        );
      } catch (error) {
        logger.error(`Broadcast error`, { error: error.message });
        ctx.session = undefined;
        return ctx.reply(`❌ Broadcast yuborishda xatolik: ${error}`);
      }
    }

    // Broadcast soni kiritish (faqat adminlar uchun)
    if (
      ctx.session.step === "broadcast_count" &&
      ADMIN_IDS.includes(ctx.from.id)
    ) {
      const count = parseInt(text);
      const totalUsers = await adminService.getTotalUsers();

      if (!count || count <= 0) {
        return ctx.reply("❌ Iltimos, to'g'ri son kiriting (0 dan katta)");
      }

      if (count > totalUsers) {
        return ctx.reply(
          `❌ Kiritilgan son (${count}) jami foydalanuvchilar sonidan (${totalUsers}) katta!\n\nIltimos, ${totalUsers} dan kichik son kiriting.`
        );
      }

      ctx.session = {
        step: "broadcast_message",
        data: { type: "count", count },
      };

      return ctx.reply(
        `📝 ${count} ta foydalanuvchiga yuborish uchun xabaringizni kiriting:`
      );
    }

    // Promokod yaratish (faqat adminlar uchun)
    if (
      ctx.session.step === "create_promo_code" &&
      ADMIN_IDS.includes(ctx.from.id)
    ) {
      const code = text.toUpperCase().trim();

      if (code.length < 3 || code.length > 20) {
        return ctx.reply("❌ Promokod 3-20 belgi oralig'ida bo'lishi kerak");
      }

      if (!/^[A-Z0-9]+$/.test(code)) {
        return ctx.reply(
          "❌ Promokod faqat harflar va raqamlardan iborat bo'lishi kerak"
        );
      }

      ctx.session = {
        step: "create_promo_tokens",
        data: { code },
      };

      return ctx.reply(
        `📝 "${code}" promokodi uchun token miqdorini kiriting:\n\nFormat: <kunlik_token> <umumiy_token> <ishlatish_soni>\nMisol: 1000 5000 50`
      );
    }

    // Promokod token ma'lumotlari (faqat adminlar uchun)
    if (
      ctx.session.step === "create_promo_tokens" &&
      ADMIN_IDS.includes(ctx.from.id)
    ) {
      const args = text.split(" ");

      if (args.length !== 3) {
        return ctx.reply(
          "❌ Format: <kunlik_token> <umumiy_token> <ishlatish_soni>\nMisol: 1000 5000 50"
        );
      }

      const [dailyTokens, totalTokens, maxUsage] = args.map((arg) =>
        parseInt(arg)
      );

      if (
        isNaN(dailyTokens) ||
        isNaN(totalTokens) ||
        isNaN(maxUsage) ||
        dailyTokens < 0 ||
        totalTokens < 0 ||
        maxUsage <= 0
      ) {
        return ctx.reply(
          "❌ Kunlik va umumiy tokenlar 0 yoki musbat, ishlatish soni musbat bo'lishi kerak"
        );
      }

      const code = ctx.session.data?.code;

      try {
        await promocodeService.createPromocode(
          code,
          dailyTokens,
          totalTokens,
          maxUsage,
          ctx.from.id
        );
        ctx.session = undefined;

        return ctx.reply(
          `✅ Promokod yaratildi!\n\n` +
            `🎫 Kod: ${code}\n` +
            `🔥 Kunlik tokenlar: ${dailyTokens}\n` +
            `💎 Umumiy tokenlar: ${totalTokens}\n` +
            `👥 Maksimal ishlatish: ${maxUsage}`
        );
      } catch (error) {
        ctx.session = undefined;
        return ctx.reply(`❌ Xatolik: ${error.message}`);
      }
    }
  }

  return next();
});

// /stats buyrug'i
bot.command("stats", async (ctx) => {
  logger.info(`Stats command`, { user_id: ctx.from!.id });
  const stats = await statsService.getUserStats(ctx.from!.id);
  await ctx.reply(
    `📊 Sizning statistikangiz:\n\n` +
      `🆔 User ID: ${ctx.from!.id}\n` +
      `📅 Bugungi so'rovlar: ${stats.daily_requests}\n` +
      `🔥 Bugungi tokenlar: ${stats.daily_tokens}\n` +
      `📈 Jami so'rovlar: ${stats.total_requests}\n` +
      `💎 Jami tokenlar: ${stats.total_tokens}\n` +
      `📆 Ro'yxatdan o'tgan: ${new Date(stats.created_at).toLocaleDateString(
        "uz-UZ"
      )}`
  );
});

// /balance buyrug'i
bot.command("balance", async (ctx) => {
  logger.info(`Balance command`, { user_id: ctx.from!.id });
  const user = await userService.getUser(ctx.from!.id);
  if (!user) return;

  const remainingDaily = user.daily_tokens - user.daily_used;
  const remainingTotal = user.total_tokens - user.total_used;

  await ctx.reply(
    `💰 Sizning balansingiz:\n\n` +
      `🆔 User ID: ${ctx.from!.id}\n` +
      `🔥 Qolgan kunlik: ${remainingDaily} token\n` +
      `💎 Qolgan umumiy: ${remainingTotal} token`
  );
});

// /model buyrug'i
bot.command("model", async (ctx) => {
  logger.info(`Model command`, { user_id: ctx.from!.id });
  const models = await modelService.getActiveModels();
  const user = await userService.getUser(ctx.from!.id);

  // Modellarni 10 tadan ko'rsatish
  const keyboard = Markup.inlineKeyboard([
    ...models
      .slice(0, 10)
      .map((model, index) => [
        Markup.button.callback(
          `${model.id === user?.selected_model ? "✅" : "🤖"} ${model.name}`,
          `model_${index}`
        ),
      ]),
    ...(models.length > 10
      ? [[Markup.button.callback("➡️ Keyingi", "models_next_0")]]
      : []),
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.reply("🤖 AI modelni tanlang:", keyboard);
});

// /admin buyrug'i (faqat adminlar uchun)
bot.command("admin", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) {
    logger.warning(`Unauthorized admin access attempt`, {
      user_id: ctx.from!.id,
    });
    return ctx.reply("❌ Sizda admin huquqi yo'q!");
  }

  logger.admin(`Admin panel accessed`, { admin_id: ctx.from!.id });
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("📊 Statistika", "admin_stats")],
    [Markup.button.callback("💰 Token qo'shish", "admin_add_tokens")],
    [Markup.button.callback("💸 Token ayirish", "admin_remove_tokens")],
    [Markup.button.callback("🎫 Promokodlar", "admin_promocodes")],
    [Markup.button.callback("📢 Broadcast", "admin_broadcast")],
    [Markup.button.callback("🤖 Modellar", "admin_models")],
    [Markup.button.callback("📋 Buyruqlar", "admin_commands")],
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.reply("⚙️ Admin Panel:", keyboard);
});

// /help buyrug'i
bot.command("help", async (ctx) => {
  logger.info(`Help command`, { user_id: ctx.from!.id });
  const user = await userService.getUser(ctx.from!.id);

  let helpText =
    `🤖 AI Chatbot Yordam\n\n` +
    `Asosiy buyruqlar:\n` +
    `/start - Botni qayta ishga tushirish\n` +
    `/model - AI model tanlash\n` +
    `/stats - Statistikangizni ko'rish\n` +
    `/balance - Qolgan tokenlarni tekshirish\n` +
    `/promocode <kod> - Promokod ishlatish\n` +
    `/help - Bu yordam xabari\n\n`;

  if (ADMIN_IDS.includes(ctx.from!.id)) {
    helpText +=
      `Admin buyruqlari:\n` +
      `/admin - Admin panel\n` +
      `/add_tokens <user_id> <daily> <total> - Token qo'shish\n` +
      `/remove_tokens <user_id> <daily> <total> - Token ayirish\n` +
      `/add_promo <code> <daily> <total> <usage> - Promokod yaratish\n` +
      `/broadcast <xabar> - Xabar yuborish\n\n`;
  }

  helpText +=
    `Qanday foydalanish:\n` +
    `• Shaxsiy chatda: "Suhbat boshlash" tugmasini bosing\n` +
    `• Guruhda: Botga reply qiling yoki @mention qiling\n\n` +
    `Sizning ma'lumotlaringiz:\n` +
    `🆔 ID: ${ctx.from!.id}\n` +
    `🔥 Kunlik limit: ${user?.daily_tokens || 0} token\n` +
    `💎 Umumiy limit: ${user?.total_tokens || 0} token\n\n` +
    `Token tugasa:\n` +
    `Admin bilan bog'laning: @abdulahadov_abdumutolib`;

  await ctx.reply(helpText);
});

// /promocode buyrug'i
bot.command("promocode", async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length !== 2) {
    return ctx.reply(
      "❌ Format: /promocode <kod>\n\n" + "Misol: /promocode BONUS2025"
    );
  }

  const code = args[1].toUpperCase().trim();

  try {
    const result = await promocodeService.usePromocode(code, ctx.from!.id);

    if (result.success) {
      return ctx.reply(
        `✅ ${result.message}\n\n` +
          `🎁 Qo'shildi:\n` +
          `🔥 Kunlik: +${result.tokens!.daily} token\n` +
          `💎 Umumiy: +${result.tokens!.total} token`
      );
    } else {
      return ctx.reply(`❌ ${result.message}`);
    }
  } catch (error) {
    logger.error(`Promocode error`, {
      error: error.message,
      user_id: ctx.from!.id,
      code,
    });
    return ctx.reply("❌ Promokod ishlatishda xatolik yuz berdi");
  }
});

// /broadcast buyrug'i (faqat adminlar uchun)
bot.command("broadcast", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) {
    logger.warning(`Unauthorized broadcast attempt`, { user_id: ctx.from!.id });
    return ctx.reply("❌ Sizda admin huquqi yo'q!");
  }

  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format: /broadcast <xabar>\n\n" +
        "Misol: /broadcast Salom hammaga!\n\n" +
        "Rasm/video bilan: rasm yuborib caption sifatida /broadcast <xabar> yozing"
    );
  }

  const message = args.slice(1).join(" ");

  try {
    logger.broadcast(`Broadcasting via command`, {
      admin_id: ctx.from!.id,
      message_length: message.length,
    });
    const successCount = await broadcastService.broadcastToAll(bot, message);
    logger.success(`Broadcast completed via command`, { successCount });
    await ctx.reply(
      `✅ Broadcast yuborildi!\n\n📊 Muvaffaqiyatli: ${successCount} ta foydalanuvchi`
    );
  } catch (error) {
    logger.error(`Broadcast command error`, { error: error.message });
    await ctx.reply(`❌ Broadcast yuborishda xatolik: ${error}`);
  }
});

// /add_promo buyrug'i (faqat adminlar uchun)
bot.command("add_promo", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) {
    return ctx.reply("❌ Sizda admin huquqi yo'q!");
  }

  const args = ctx.message.text.split(" ");
  if (args.length !== 5) {
    return ctx.reply(
      "❌ Format: /add_promo <code> <daily_tokens> <total_tokens> <max_usage>\n\n" +
        "Misol: /add_promo BONUS2025 1000 5000 50\n" +
        "Misol: /add_promo GIFT100 0 10000 100 (faqat umumiy token)"
    );
  }

  const [, code, dailyTokens, totalTokens, maxUsage] = args;
  const daily = parseInt(dailyTokens);
  const total = parseInt(totalTokens);
  const usage = parseInt(maxUsage);

  if (
    isNaN(daily) ||
    isNaN(total) ||
    isNaN(usage) ||
    daily < 0 ||
    total < 0 ||
    usage <= 0
  ) {
    return ctx.reply(
      "❌ Kunlik va umumiy tokenlar 0 yoki musbat, ishlatish soni musbat bo'lishi kerak"
    );
  }

  try {
    await promocodeService.createPromocode(
      code.toUpperCase(),
      daily,
      total,
      usage,
      ctx.from!.id
    );

    return ctx.reply(
      `✅ Promokod yaratildi!\n\n` +
        `🎫 Kod: ${code.toUpperCase()}\n` +
        `🔥 Kunlik tokenlar: ${daily}\n` +
        `💎 Umumiy tokenlar: ${total}\n` +
        `👥 Maksimal ishlatish: ${usage}`
    );
  } catch (error) {
    return ctx.reply(`❌ Xatolik: ${error.message}`);
  }
});

// Callback query handlers
bot.action("select_model", async (ctx) => {
  const models = await modelService.getActiveModels();
  const user = await userService.getUser(ctx.from!.id);

  // Modellarni 10 tadan ko'rsatish
  const keyboard = Markup.inlineKeyboard([
    ...models
      .slice(0, 10)
      .map((model, index) => [
        Markup.button.callback(
          `${model.id === user?.selected_model ? "✅" : "🤖"} ${model.name}`,
          `model_${index}`
        ),
      ]),
    ...(models.length > 10
      ? [[Markup.button.callback("➡️ Keyingi", "models_next_0")]]
      : []),
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText("🤖 AI modelni tanlang:", keyboard);
});

// Model tanlash (index bo'yicha)
bot.action(/model_(\d+)/, async (ctx) => {
  const modelIndex = parseInt(ctx.match[1]);
  const models = await modelService.getActiveModels();
  const model = models[modelIndex];

  if (!model) {
    return ctx.editMessageText("❌ Model topilmadi!");
  }

  await userService.updateSelectedModel(ctx.from!.id, model.id);
  logger.success(`Model selected`, {
    user_id: ctx.from!.id,
    model: model.name,
  });

  await ctx.editMessageText(
    `✅ Model tanlandi: ${model.name}\n\n` +
      `⚠️ Eslatma: Barcha AI modellari O'zbek tilini bir xil darajada bilmaydi. ` +
      `Agar javob ingliz tilida kelsa, "O'zbek tilida javob ber" deb so'rang.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

// Modellar sahifalash
bot.action(/models_next_(\d+)/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  const models = await modelService.getActiveModels();
  const user = await userService.getUser(ctx.from!.id);

  const startIndex = (page + 1) * 10;
  const endIndex = Math.min(startIndex + 10, models.length);
  const pageModels = models.slice(startIndex, endIndex);

  const keyboard = Markup.inlineKeyboard([
    ...(page >= 0
      ? [[Markup.button.callback("⬅️ Oldingi", `models_prev_${page + 1}`)]]
      : []),
    ...pageModels.map((model, index) => [
      Markup.button.callback(
        `${model.id === user?.selected_model ? "✅" : "🤖"} ${model.name}`,
        `model_${startIndex + index}`
      ),
    ]),
    ...(endIndex < models.length
      ? [[Markup.button.callback("➡️ Keyingi", `models_next_${page + 1}`)]]
      : []),
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText("🤖 AI modelni tanlang:", keyboard);
});

bot.action(/models_prev_(\d+)/, async (ctx) => {
  const page = parseInt(ctx.match[1]) - 1;
  const models = await modelService.getActiveModels();
  const user = await userService.getUser(ctx.from!.id);

  const startIndex = page * 10;
  const endIndex = Math.min(startIndex + 10, models.length);
  const pageModels = models.slice(startIndex, endIndex);

  const keyboard = Markup.inlineKeyboard([
    ...(page > 0
      ? [[Markup.button.callback("⬅️ Oldingi", `models_prev_${page}`)]]
      : []),
    ...pageModels.map((model, index) => [
      Markup.button.callback(
        `${model.id === user?.selected_model ? "✅" : "🤖"} ${model.name}`,
        `model_${startIndex + index}`
      ),
    ]),
    ...(endIndex < models.length
      ? [[Markup.button.callback("➡️ Keyingi", `models_next_${page + 1}`)]]
      : []),
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText("🤖 AI modelni tanlang:", keyboard);
});

bot.action("stats", async (ctx) => {
  const stats = await statsService.getUserStats(ctx.from!.id);
  await ctx.editMessageText(
    `📊 Sizning statistikangiz:\n\n` +
      `🆔 User ID: ${ctx.from!.id}\n` +
      `📅 Bugungi so'rovlar: ${stats.daily_requests}\n` +
      `🔥 Bugungi tokenlar: ${stats.daily_tokens}\n` +
      `📈 Jami so'rovlar: ${stats.total_requests}\n` +
      `💎 Jami tokenlar: ${stats.total_tokens}\n` +
      `📆 Ro'yxatdan o'tgan: ${new Date(stats.created_at).toLocaleDateString(
        "uz-UZ"
      )}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

bot.action("balance", async (ctx) => {
  const user = await userService.getUser(ctx.from!.id);
  if (!user) return;

  const remainingDaily = user.daily_tokens - user.daily_used;
  const remainingTotal = user.total_tokens - user.total_used;

  await ctx.editMessageText(
    `💰 Sizning balansingiz:\n\n` +
      `🆔 User ID: ${ctx.from!.id}\n` +
      `🔥 Qolgan kunlik: ${remainingDaily} token\n` +
      `💎 Qolgan umumiy: ${remainingTotal} token`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

// Admin callback handlers (faqat adminlar uchun)
bot.action("admin_panel", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("📊 Statistika", "admin_stats")],
    [Markup.button.callback("💰 Token qo'shish", "admin_add_tokens")],
    [Markup.button.callback("💸 Token ayirish", "admin_remove_tokens")],
    [Markup.button.callback("🎫 Promokodlar", "admin_promocodes")],
    [Markup.button.callback("📢 Broadcast", "admin_broadcast")],
    [Markup.button.callback("🤖 Modellar", "admin_models")],
    [Markup.button.callback("📋 Buyruqlar", "admin_commands")],
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText("⚙️ Admin Panel:", keyboard);
});

bot.action("admin_stats", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  logger.admin(`Admin stats viewed`, { admin_id: ctx.from!.id });
  const stats = await adminService.getSystemStats();
  await ctx.editMessageText(
    `📊 Tizim statistikasi:\n\n` +
      `👥 Jami foydalanuvchilar: ${stats.total_users}\n` +
      `📅 Bugungi faol: ${stats.daily_active}\n` +
      `💬 Bugungi so'rovlar: ${stats.daily_requests}\n` +
      `🔥 Bugungi tokenlar: ${stats.daily_tokens}\n` +
      `📈 Jami so'rovlar: ${stats.total_requests}\n` +
      `💎 Jami tokenlar: ${stats.total_tokens}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

bot.action("admin_add_tokens", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  await ctx.editMessageText(
    "💰 Token qo'shish:\n\n" +
      "Format: /add_tokens <user_id> <daily_tokens> <total_tokens>\n\n" +
      "Misol: /add_tokens 123456789 1000 5000\n\n" +
      "💡 Foydalanuvchi o'z ID sini /balance buyrug'i orqali ko'rishi mumkin.",
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

bot.action("admin_remove_tokens", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  await ctx.editMessageText(
    "💸 Token ayirish:\n\n" +
      "Format: /remove_tokens <user_id> <daily_tokens> <total_tokens>\n\n" +
      "Misol: /remove_tokens 123456789 500 2000\n\n" +
      "⚠️ Agar foydalanuvchida yetarli token bo'lmasa, xatolik ko'rsatiladi.",
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

bot.action("admin_promocodes", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("➕ Promokod yaratish", "create_promocode")],
    [Markup.button.callback("📋 Promokodlar ro'yxati", "list_promocodes")],
    [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText(
    "🎫 Promokodlar boshqaruvi:\n\n" +
      "Yoki buyruq orqali: /add_promo <code> <daily> <total> <usage>",
    keyboard
  );
});

bot.action("create_promocode", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  ctx.session = { step: "create_promo_code" };

  await ctx.editMessageText(
    "🎫 Yangi promokod yaratish:\n\n" +
      "Promokod nomini kiriting (3-20 belgi, faqat harflar va raqamlar):\n\n" +
      "Misol: BONUS2025, NEWUSER, GIFT100"
  );
});

bot.action("list_promocodes", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const promocodes = await promocodeService.getAllPromocodes();

  if (promocodes.length === 0) {
    return ctx.editMessageText(
      "📋 Promokodlar ro'yxati bo'sh",
      Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Orqaga", "admin_promocodes")],
        [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
      ])
    );
  }

  let text = "📋 Promokodlar ro'yxati:\n\n";

  promocodes.slice(0, 10).forEach((promo, index) => {
    const status = promo.is_active ? "✅" : "❌";
    const usage = `${promo.current_usage}/${promo.max_usage}`;
    text += `${index + 1}. ${status} ${promo.code}\n`;
    text += `   🔥 ${promo.daily_tokens} | 💎 ${promo.total_tokens} | 👥 ${usage}\n\n`;
  });

  if (promocodes.length > 10) {
    text += `... va yana ${promocodes.length - 10} ta`;
  }

  await ctx.editMessageText(
    text,
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅️ Orqaga", "admin_promocodes")],
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ])
  );
});

bot.action("admin_broadcast", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("📢 Hammaga", "broadcast_all")],
    [Markup.button.callback("👥 Faollarga", "broadcast_active")],
    [Markup.button.callback("🔢 Songa ko'ra", "broadcast_count")],
    [Markup.button.callback("👥 Guruhlarga", "broadcast_groups")],
    [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText(
    "📢 Broadcast turi:\n\n" +
      "Yoki buyruq orqali: /broadcast <xabar>\n" +
      "Rasm/video bilan: rasm yuborib caption sifatida /broadcast <xabar> yozing",
    keyboard
  );
});

bot.action("broadcast_all", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const totalUsers = await adminService.getTotalUsers();
  ctx.session = { step: "broadcast_message", data: { type: "all" } };

  await ctx.editMessageText(
    `📝 Barcha foydalanuvchilarga (${totalUsers} ta) yuborish uchun xabaringizni kiriting:`
  );
});

bot.action("broadcast_active", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const activeUsers = await adminService.getActiveUsers();
  ctx.session = { step: "broadcast_message", data: { type: "active" } };

  await ctx.editMessageText(
    `📝 Faol foydalanuvchilarga (${activeUsers} ta) yuborish uchun xabaringizni kiriting:`
  );
});

bot.action("broadcast_count", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const totalUsers = await adminService.getTotalUsers();
  ctx.session = { step: "broadcast_count" };

  await ctx.editMessageText(
    `🔢 Nechta foydalanuvchiga yubormoqchisiz?\n\nJami foydalanuvchilar: ${totalUsers}\n\nSonni kiriting:`
  );
});

bot.action("broadcast_groups", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  ctx.session = { step: "broadcast_message", data: { type: "groups" } };

  await ctx.editMessageText(
    `📝 Guruhlarga yuborish uchun xabaringizni kiriting:\n\n⚠️ Guruhlar ro'yxati hozircha bo'sh`
  );
});

bot.action("admin_models", async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  logger.admin(`Admin models viewed`, { admin_id: ctx.from!.id });
  const models = await modelService.getAllModels();
  const keyboard = Markup.inlineKeyboard([
    ...models
      .slice(0, 15)
      .map((model, index) => [
        Markup.button.callback(
          `${model.is_active ? "✅" : "❌"} ${model.name.substring(0, 30)}`,
          `admin_model_${index}`
        ),
      ]),
    ...(models.length > 15
      ? [[Markup.button.callback("➡️ Ko'proq", "admin_models_next_0")]]
      : []),
    [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText("🤖 Modellar boshqaruvi:", keyboard);
});

// Admin models pagination (next page)
bot.action(/admin_models_next_(\d+)/, async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const page = parseInt(ctx.match[1]) + 1;
  const models = await modelService.getAllModels();
  const startIndex = page * 15;
  const endIndex = Math.min(startIndex + 15, models.length);
  const pageModels = models.slice(startIndex, endIndex);

  const keyboard = Markup.inlineKeyboard([
    ...(page > 0
      ? [
          [
            Markup.button.callback(
              "⬅️ Oldingi",
              `admin_models_prev_${page - 1}`
            ),
          ],
        ]
      : []),
    ...pageModels.map((model, index) => [
      Markup.button.callback(
        `${model.is_active ? "✅" : "❌"} ${model.name.substring(0, 30)}`,
        `admin_model_${startIndex + index}`
      ),
    ]),
    ...(endIndex < models.length
      ? [[Markup.button.callback("➡️ Ko'proq", `admin_models_next_${page}`)]]
      : []),
    [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText("🤖 Modellar boshqaruvi:", keyboard);
});

// Admin models pagination (previous page)
bot.action(/admin_models_prev_(\d+)/, async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const page = parseInt(ctx.match[1]);
  const models = await modelService.getAllModels();
  const startIndex = page * 15;
  const endIndex = Math.min(startIndex + 15, models.length);
  const pageModels = models.slice(startIndex, endIndex);

  const keyboard = Markup.inlineKeyboard([
    ...(page > 0
      ? [
          [
            Markup.button.callback(
              "⬅️ Oldingi",
              `admin_models_prev_${page - 1}`
            ),
          ],
        ]
      : []),
    ...pageModels.map((model, index) => [
      Markup.button.callback(
        `${model.is_active ? "✅" : "❌"} ${model.name.substring(0, 30)}`,
        `admin_model_${startIndex + index}`
      ),
    ]),
    ...(endIndex < models.length
      ? [[Markup.button.callback("➡️ Ko'proq", `admin_models_next_${page}`)]]
      : []),
    [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
    [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
  ]);

  await ctx.editMessageText("🤖 Modellar boshqaruvi:", keyboard);
});

// Admin model toggle
bot.action(/admin_model_(\d+)/, async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  const modelIndex = parseInt(ctx.match[1]);
  const models = await modelService.getAllModels();
  const model = models[modelIndex];

  if (!model) {
    return ctx.answerCbQuery("❌ Model topilmadi!");
  }

  try {
    await modelService.updateModel(model.id, { is_active: !model.is_active });
    logger.admin(`Model toggled`, {
      admin_id: ctx.from!.id,
      model: model.name,
      new_status: !model.is_active,
    });

    await ctx.answerCbQuery(
      `✅ ${model.name} ${!model.is_active ? "yoqildi" : "o'chirildi"}`
    );

    // Refresh the models list
    const updatedModels = await modelService.getAllModels();
    const keyboard = Markup.inlineKeyboard([
      ...updatedModels
        .slice(0, 15)
        .map((m, index) => [
          Markup.button.callback(
            `${m.is_active ? "✅" : "❌"} ${m.name.substring(0, 30)}`,
            `admin_model_${index}`
          ),
        ]),
      ...(updatedModels.length > 15
        ? [[Markup.button.callback("➡️ Ko'proq", "admin_models_next_0")]]
        : []),
      [Markup.button.callback("⬅️ Orqaga", "admin_panel")],
      [Markup.button.callback("🏠 Bosh sahifa", "back_to_main")],
    ]);

    await ctx.editMessageText("🤖 Modellar boshqaruvi:", keyboard);
  } catch (error) {
    logger.error(`Model toggle error`, { error: error.message });
    await ctx.answerCbQuery("❌ Xatolik yuz berdi");
  }
});

// AI chat handler
bot.on(message("text"), async (ctx) => {
  const text = ctx.message.text;
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";

  // Admin buyruqlarini tekshirish (faqat adminlar uchun)
  if (text.startsWith("/add_tokens") && ADMIN_IDS.includes(ctx.from.id)) {
    const args = text.split(" ");
    if (args.length !== 4) {
      return ctx.reply(
        "❌ Format: /add_tokens <user_id> <daily_tokens> <total_tokens>\n\n" +
          "Misol: /add_tokens 123456789 1000 5000"
      );
    }

    const [, userId, dailyTokens, totalTokens] = args;

    try {
      await adminService.addTokens(
        parseInt(userId),
        parseInt(dailyTokens),
        parseInt(totalTokens)
      );
      logger.admin(`Tokens added`, {
        admin_id: ctx.from.id,
        user_id: userId,
        daily: dailyTokens,
        total: totalTokens,
      });
      return ctx.reply(
        `✅ Foydalanuvchi ${userId} ga tokenlar qo'shildi!\n\n📊 Qo'shildi:\n🔥 Kunlik: +${dailyTokens}\n💎 Umumiy: +${totalTokens}`
      );
    } catch (error) {
      logger.error(`Token add error`, { error: error.message });
      return ctx.reply(`❌ Xatolik: ${error}`);
    }
  }

  // Remove tokens buyrug'i (faqat adminlar uchun)
  if (text.startsWith("/remove_tokens") && ADMIN_IDS.includes(ctx.from.id)) {
    const args = text.split(" ");
    if (args.length !== 4) {
      return ctx.reply(
        "❌ Format: /remove_tokens <user_id> <daily_tokens> <total_tokens>\n\n" +
          "Misol: /remove_tokens 123456789 500 2000"
      );
    }

    const [, userId, dailyTokens, totalTokens] = args;

    try {
      const result = await adminService.removeTokens(
        parseInt(userId),
        parseInt(dailyTokens),
        parseInt(totalTokens)
      );

      if (result.success) {
        logger.admin(`Tokens removed`, {
          admin_id: ctx.from.id,
          user_id: userId,
          daily: dailyTokens,
          total: totalTokens,
        });
        return ctx.reply(
          `✅ Foydalanuvchi ${userId} dan tokenlar ayirildi!\n\n📊 Ayirildi:\n🔥 Kunlik: -${dailyTokens}\n💎 Umumiy: -${totalTokens}`
        );
      } else {
        logger.warning(`Token remove failed`, {
          admin_id: ctx.from.id,
          user_id: userId,
          error: result.message,
        });
        let errorMsg = `❌ ${result.message}`;
        if (result.currentTokens) {
          errorMsg += `\n\n📊 Joriy tokenlar:\n🔥 Kunlik: ${result.currentTokens.daily}\n💎 Umumiy: ${result.currentTokens.total}`;
        }
        return ctx.reply(errorMsg);
      }
    } catch (error) {
      logger.error(`Token remove error`, { error: error.message });
      return ctx.reply(`❌ Xatolik: ${error}`);
    }
  }

  // Broadcast buyruqini tekshirish (faqat adminlar uchun)
  if (text.startsWith("/broadcast") && ADMIN_IDS.includes(ctx.from.id)) {
    const args = text.split(" ");
    if (args.length < 2) {
      return ctx.reply(
        "❌ Format: /broadcast <xabar>\n\n" + "Misol: /broadcast Salom hammaga!"
      );
    }

    const message = args.slice(1).join(" ");

    try {
      logger.broadcast(`Broadcasting via command`, {
        admin_id: ctx.from.id,
        message_length: message.length,
      });
      const successCount = await broadcastService.broadcastToAll(bot, message);
      logger.success(`Broadcast completed via command`, { successCount });
      return ctx.reply(
        `✅ Broadcast yuborildi!\n\n📊 Muvaffaqiyatli: ${successCount} ta foydalanuvchi`
      );
    } catch (error) {
      logger.error(`Broadcast command error`, { error: error.message });
      return ctx.reply(`❌ Broadcast yuborishda xatolik: ${error}`);
    }
  }

  // Chat mode check
  const isInChatMode = chatModeUsers.has(ctx.from.id);

  // Guruhda faqat reply yoki mention bo'lsa javob berish
  if (isGroup && !isInChatMode) {
    const isReply = ctx.message.reply_to_message?.from?.id === ctx.botInfo.id;
    const isMention = text.includes(`@${ctx.botInfo.username}`);

    if (!isReply && !isMention) return;
  }

  // Shaxsiy chatda chat mode bo'lmasa AI ga yubormaslik
  if (!isGroup && !isInChatMode) {
    return;
  }

  // Foydalanuvchi tekshiruvi
  const user = await userService.getUser(ctx.from.id);
  if (!user) return;

  // Ro'yxatdan o'tish tekshiruvi
  if (!user.registration_completed) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📝 Ro'yxatdan o'tish", "start_registration")],
      [Markup.button.callback("⏭️ O'tkazib yuborish", "skip_registration")],
    ]);

    return ctx.reply(
      `📝 Avval ro'yxatdan o'ting yoki o'tkazib yuboring:`,
      keyboard
    );
  }

  // Guruhda token guruh egasidan yechiladi
  let tokenUser = user;
  if (isGroup) {
    try {
      const chatMember = await ctx.getChatMember(ctx.from.id);
      if (
        chatMember.status === "creator" ||
        chatMember.status === "administrator"
      ) {
        // Admin yoki creator bo'lsa o'z tokenidan
        tokenUser = user;
      } else {
        // Oddiy a'zo bo'lsa, guruh yaratuvchisining tokenidan
        const chatInfo = await ctx.getChat();
        if (chatInfo.type === "group" || chatInfo.type === "supergroup") {
          const admins = await ctx.getChatAdministrators();
          const creator = admins.find((admin) => admin.status === "creator");
          if (creator) {
            const creatorUser = await userService.getUser(creator.user.id);
            if (creatorUser) {
              tokenUser = creatorUser;
            }
          }
        }
      }
    } catch (error) {
      logger.warning(`Group token check error`, { error: error.message });
    }
  }

  // Token tekshiruvi
  if (
    tokenUser.daily_used >= tokenUser.daily_tokens ||
    tokenUser.total_used >= tokenUser.total_tokens
  ) {
    logger.warning(`Token limit exceeded`, {
      user_id: tokenUser.telegram_id,
      daily_used: tokenUser.daily_used,
      total_used: tokenUser.total_used,
    });
    return ctx.reply(
      "❌ Token limitingiz tugagan!\n\n" +
        "💡 Admin bilan bog'laning yoki ertaga qayta urinib ko'ring.\n" +
        `🆔 Sizning ID: ${ctx.from.id}\n` +
        "👨‍💼 Admin: @abdulahadov_abdumutolib"
    );
  }

  // Model tekshiruvi
  if (!user.selected_model) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🤖 Model tanlash", "select_model")],
    ]);
    return ctx.reply("❌ Avval AI modelni tanlang!", keyboard);
  }

  try {
    // Typing indicator
    await ctx.sendChatAction("typing");

    logger.ai(`AI request in chat mode`, {
      user_id: ctx.from.id,
      model: user.selected_model,
      text_length: text.length,
      chat_type: ctx.chat.type,
    });

    // AI javob olish
    const response = await openRouterService.generateResponse(
      text,
      user.selected_model,
      ctx.from.id,
      user
    );

    // Javob yuborish
    await ctx.reply(response.text);

    // Statistika yangilash (token guruh egasidan yechiladi)
    await statsService.updateStats(tokenUser.telegram_id, response.tokens);

    logger.success(`AI response sent in chat mode`, {
      user_id: ctx.from.id,
      token_user: tokenUser.telegram_id,
      tokens: response.tokens,
    });
  } catch (error) {
    logger.error(`AI Error`, { user_id: ctx.from.id, error: error.message });
    await ctx.reply("❌ Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  }
});

// Media handler (rasm, video, gif) - faqat admin broadcast uchun
bot.on(["photo", "video", "animation", "document"], async (ctx) => {
  // Admin broadcast uchun media + caption tekshirish
  if (
    ADMIN_IDS.includes(ctx.from!.id) &&
    ctx.message.caption?.startsWith("/broadcast")
  ) {
    const args = ctx.message.caption.split(" ");
    if (args.length < 2) {
      return ctx.reply(
        "❌ Format: rasm/video yuborib caption sifatida /broadcast <xabar> yozing\n\n" +
          "Misol: /broadcast Yangi xabar!"
      );
    }

    const message = args.slice(1).join(" ");

    try {
      logger.broadcast(`Broadcasting media via command`, {
        admin_id: ctx.from!.id,
        message_length: message.length,
      });
      const successCount = await broadcastService.broadcastMediaToAll(
        bot,
        ctx.message,
        message
      );
      logger.success(`Media broadcast completed via command`, { successCount });
      return ctx.reply(
        `✅ Media broadcast yuborildi!\n\n📊 Muvaffaqiyatli: ${successCount} ta foydalanuvchi`
      );
    } catch (error) {
      logger.error(`Media broadcast command error`, { error: error.message });
      return ctx.reply(`❌ Media broadcast yuborishda xatolik: ${error}`);
    }
  }

  // Faqat admin broadcast session uchun
  if (
    ctx.session?.step === "broadcast_message" &&
    ADMIN_IDS.includes(ctx.from!.id)
  ) {
    const type = ctx.session.data?.type;
    const count = ctx.session.data?.count;
    const caption = ctx.message.caption || "";

    logger.broadcast(`Broadcasting media`, {
      type,
      count,
      admin_id: ctx.from.id,
      media_type: ctx.message.photo
        ? "photo"
        : ctx.message.video
        ? "video"
        : "other",
    });

    try {
      let successCount = 0;

      if (type === "all") {
        successCount = await broadcastService.broadcastMediaToAll(
          bot,
          ctx.message,
          caption
        );
      } else if (type === "active") {
        successCount = await broadcastService.broadcastMediaToActive(
          bot,
          ctx.message,
          caption
        );
      } else if (type === "count" && count) {
        successCount = await broadcastService.broadcastMediaToCount(
          bot,
          ctx.message,
          caption,
          count
        );
      } else if (type === "groups") {
        successCount = await broadcastService.broadcastMediaToGroups(
          bot,
          ctx.message,
          caption
        );
      }

      ctx.session = undefined;
      logger.success(`Media broadcast completed`, {
        successCount,
        type,
        count,
      });
      return ctx.reply(
        `✅ Media broadcast yuborildi!\n\n📊 Muvaffaqiyatli: ${successCount} ta`
      );
    } catch (error) {
      logger.error(`Media broadcast error`, { error: error.message });
      ctx.session = undefined;
      return ctx.reply(`❌ Media broadcast yuborishda xatolik: ${error}`);
    }
  }

  // Oddiy foydalanuvchilar uchun
  return ctx.reply(
    "📷 Media fayllarni qayta ishlay olmayman. Faqat matn xabarlarini yuboring."
  );
});

// Error handler
bot.catch((err, ctx) => {
  logger.error("Bot Error", { error: err.message, user_id: ctx.from?.id });
  ctx.reply("❌ Ichki xatolik yuz berdi.");
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.system("Bot stopping - SIGINT");
  database.close();
  bot.stop("SIGINT");
});

process.on("SIGTERM", () => {
  logger.system("Bot stopping - SIGTERM");
  database.close();
  bot.stop("SIGTERM");
});

// Bot ishga tushirish
bot.launch();

// Utility to split long messages for Telegram (max 4096 chars)
function splitMessage(text: string, limit = 4096): string[] {
  const result = [];
  let current = text;
  while (current.length > limit) {
    let splitIndex = current.lastIndexOf("\n", limit);
    if (splitIndex === -1) splitIndex = limit;
    result.push(current.slice(0, splitIndex));
    current = current.slice(splitIndex);
  }
  if (current.length) result.push(current);
  return result;
}

// Replace all ctx.reply and ctx.editMessageText with splitMessage usage
// Example for ctx.reply:
// splitMessage(text).forEach(msg => ctx.reply(msg, ...args));
// Example for ctx.editMessageText:
// splitMessage(text).forEach((msg, i) => i === 0 ? ctx.editMessageText(msg, ...args) : ctx.reply(msg));
