import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { database } from './config/database.js';
import { openRouterService } from './services/openrouter.js';
import { userService } from './services/user.js';
import { adminService } from './services/admin.js';
import { statsService } from './services/stats.js';
import { modelService } from './services/model.js';
import { broadcastService } from './services/broadcast.js';
import { promocodeService } from './services/promocode.js';
import { rateLimitService } from './services/rateLimit.js';

import { ADMIN_IDS, BOT_TOKEN, TELEGRAM_API_TIMEOUT } from './config/constants.js';
import { BotContext } from './types/bot.js';
import { KeyboardBuilder, validateKeyboard } from './utils/keyboard.js';
import { logger } from './utils/logger.js';
import { TelegramFormatter } from './utils/formatter.js';

// Validate bot token before creating instance
if (!BOT_TOKEN) {
  logger.error('BOT_TOKEN is missing from environment variables');
  process.exit(1);
}

const bot = new Telegraf<BotContext>(BOT_TOKEN, {
  telegram: {
    apiRoot: 'https://api.telegram.org',
    agent: undefined,
    webhookReply: false
  }
});

// Chat mode tracking
const chatModeUsers = new Set<number>();

// Session storage for registration
const userSessions = new Map<number, any>();

// Helper function to get message type safely
function getMessageType(ctx: Context): string {
  if (!ctx.message) return 'other';
  
  if ('text' in ctx.message) return 'text';
  if ('photo' in ctx.message) return 'photo';
  if ('video' in ctx.message) return 'video';
  if ('document' in ctx.message) return 'document';
  if ('animation' in ctx.message) return 'animation';
  if (ctx.callbackQuery) return 'callback';
  
  return 'other';
}

// Helper function to get media type safely
function getMediaType(message: any): string {
  if ('photo' in message) return 'photo';
  if ('video' in message) return 'video';
  if ('animation' in message) return 'animation';
  if ('document' in message) return 'document';
  return 'other';
}

// Helper function to send formatted message with proper edit/reply logic
async function sendFormattedMessage(ctx: any, text: string, keyboard?: any, forceReply = false): Promise<any> {
  try {
    const options: any = {};
    
    // Add keyboard if provided and valid
    if (keyboard && validateKeyboard(keyboard)) {
      options.reply_markup = keyboard.reply_markup;
    }

    // Determine whether to edit or reply
    const shouldEdit = !forceReply && ctx.callbackQuery && ctx.callbackQuery.message;
    
    // Try HTML first (more reliable than Markdown V2)
    try {
      const htmlText = TelegramFormatter.toHTML(text);
      options.parse_mode = 'HTML';
      
      if (shouldEdit) {
        return await ctx.editMessageText(htmlText, options);
      } else {
        return await ctx.reply(htmlText, options);
      }
    } catch (htmlError) {
      // Fallback to plain text
      logger.warning('HTML formatting failed, using plain text', { 
        error: htmlError instanceof Error ? htmlError.message : 'Unknown error' 
      });
      
      const plainText = TelegramFormatter.toPlainText(text);
      delete options.parse_mode;
      
      if (shouldEdit) {
        return await ctx.editMessageText(plainText, options);
      } else {
        return await ctx.reply(plainText, options);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send message', { error: errorMessage });
    
    // Last resort - try simple reply without any formatting
    try {
      const plainText = TelegramFormatter.toPlainText(text);
      return await ctx.reply(plainText);
    } catch (finalError) {
      logger.error('Failed to send even simple message', { 
        error: finalError instanceof Error ? finalError.message : 'Unknown error' 
      });
      throw finalError;
    }
  }
}

// Middleware - foydalanuvchini ro'yxatdan o'tkazish
bot.use(async (ctx, next) => {
  if (ctx.from) {
    try {
      await userService.ensureUser(ctx.from);
      logger.user(`User activity: ${ctx.from.first_name}`, {
        user_id: ctx.from.id,
        username: ctx.from.username,
        message_type: getMessageType(ctx),
        chat_type: ctx.chat?.type
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Middleware error', { error: errorMessage, user_id: ctx.from.id });
    }
  }
  return next();
});

// /start buyrug'i
bot.start(async (ctx) => {
  try {
    logger.info(`Start command`, { user_id: ctx.from!.id, name: ctx.from!.first_name });
    
    const user = await userService.getUser(ctx.from!.id);
    
    // Ro'yxatdan o'tish tekshiruvi
    if (!user?.registration_completed) {
      const keyboard = KeyboardBuilder.createRegistrationMenu();
      const welcomeText = TelegramFormatter.formatWelcomeNew(ctx.from!.first_name);

      return await sendFormattedMessage(ctx, welcomeText, keyboard, true);
    }

    const keyboard = KeyboardBuilder.createMainMenu(ADMIN_IDS.includes(ctx.from!.id));
    const welcomeText = TelegramFormatter.formatWelcome(ctx.from!.first_name, ctx.from!.id);

    await sendFormattedMessage(ctx, welcomeText, keyboard, true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Start command error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'), undefined, true);
  }
});

// Registration handlers
bot.action('start_registration', async (ctx) => {
  try {
    logger.info(`Registration started`, { user_id: ctx.from!.id });
    userSessions.set(ctx.from!.id, { step: 'name' });
    
    const keyboard = new KeyboardBuilder()
      .addButton('⏭️ O\'tkazib yuborish', 'skip_name')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = TelegramFormatter.formatRegistrationStep('name');
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Registration start error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

bot.action('skip_name', async (ctx) => {
  try {
    userSessions.set(ctx.from!.id, { step: 'age' });
    
    const keyboard = new KeyboardBuilder()
      .addButton('⏭️ O\'tkazib yuborish', 'skip_age')
      .addButton('⬅️ Orqaga', 'start_registration')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = TelegramFormatter.formatRegistrationStep('age');
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Skip name error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

bot.action('skip_age', async (ctx) => {
  try {
    userSessions.set(ctx.from!.id, { step: 'interests' });
    
    const keyboard = new KeyboardBuilder()
      .addButton('⏭️ O\'tkazib yuborish', 'complete_registration')
      .addButton('⬅️ Orqaga', 'skip_name')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = TelegramFormatter.formatRegistrationStep('interests');
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Skip age error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

bot.action('complete_registration', async (ctx) => {
  try {
    logger.success(`Registration completed`, { user_id: ctx.from!.id });
    await userService.completeRegistration(ctx.from!.id);
    userSessions.delete(ctx.from!.id);
    
    const keyboard = KeyboardBuilder.createMainMenu(ADMIN_IDS.includes(ctx.from!.id));
    const text = TelegramFormatter.formatRegistrationComplete(ctx.from!.id);

    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Complete registration error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

bot.action('skip_registration', async (ctx) => {
  try {
    logger.success(`Registration skipped`, { user_id: ctx.from!.id });
    await userService.completeRegistration(ctx.from!.id);
    userSessions.delete(ctx.from!.id);
    
    const keyboard = KeyboardBuilder.createMainMenu(ADMIN_IDS.includes(ctx.from!.id));
    const text = TelegramFormatter.formatRegistrationSkipped(ctx.from!.id);

    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Skip registration error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

bot.action('back_to_main', async (ctx) => {
  try {
    userSessions.delete(ctx.from!.id);
    chatModeUsers.delete(ctx.from!.id);
    
    const keyboard = KeyboardBuilder.createMainMenu(ADMIN_IDS.includes(ctx.from!.id));
    const welcomeText = TelegramFormatter.formatWelcome(ctx.from!.first_name, ctx.from!.id);

    await sendFormattedMessage(ctx, welcomeText, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Back to main error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

// Chat mode handlers
bot.action('start_chat', async (ctx) => {
  try {
    const user = await userService.getUser(ctx.from!.id);
    if (!user?.selected_model) {
      const keyboard = new KeyboardBuilder()
        .addButton('🤖 Model tanlash', 'select_model')
        .addButton('🏠 Bosh sahifa', 'back_to_main')
        .build();

      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Avval AI modelni tanlang!'), keyboard);
    }

    chatModeUsers.add(ctx.from!.id);
    logger.info(`Chat mode started`, { user_id: ctx.from!.id });

    const chatModeText = TelegramFormatter.formatChatModeStart(user.selected_model);
    await sendFormattedMessage(ctx, chatModeText);

    // Send keyboard separately to avoid inline keyboard error
    await ctx.reply(
      '🔚 Suhbatni tugatish uchun tugmani bosing:',
      {
        reply_markup: {
          keyboard: [
            [{ text: '🔚 Suhbatni tugatish' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Start chat error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Suhbat rejimini yoqishda xatolik yuz berdi.'), undefined, true);
  }
});

// Model selection handlers
bot.action('select_model', async (ctx) => {
  try {
    const models = await modelService.getActiveModels();
    const user = await userService.getUser(ctx.from!.id);
    
    if (models.length === 0) {
      const keyboard = KeyboardBuilder.createBackButton();
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Hozirda faol modellar mavjud emas.'), keyboard);
    }
    
    // Modellarni 10 tadan ko'rsatish
    const keyboard = new KeyboardBuilder();
    
    models.slice(0, 10).forEach((model, index) => {
      keyboard.addButton(
        `${model.id === user?.selected_model ? '✅' : '🤖'} ${model.name}`,
        `model_${index}`
      );
    });

    if (models.length > 10) {
      keyboard.addButton('➡️ Keyingi', 'models_next_0');
    }
    
    keyboard.addButton('🏠 Bosh sahifa', 'back_to_main');

    await sendFormattedMessage(ctx, '🤖 AI modelni tanlang:', keyboard.build());
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Select model error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Modellarni yuklashda xatolik yuz berdi.'), undefined, true);
  }
});

// Model tanlash (index bo'yicha)
bot.action(/model_(\d+)/, async (ctx) => {
  try {
    const modelIndex = parseInt(ctx.match[1]);
    const models = await modelService.getActiveModels();
    const model = models[modelIndex];
    
    if (!model) {
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Model topilmadi!'));
    }

    await userService.updateSelectedModel(ctx.from!.id, model.id);
    logger.success(`Model selected`, { user_id: ctx.from!.id, model: model.name });
    
    const keyboard = KeyboardBuilder.createBackButton();
    const text = TelegramFormatter.formatModelSelected(model.name);

    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Model selection error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Model tanlashda xatolik yuz berdi.'), undefined, true);
  }
});

// Modellar sahifalash
bot.action(/models_next_(\d+)/, async (ctx) => {
  try {
    const page = parseInt(ctx.match[1]);
    const models = await modelService.getActiveModels();
    const user = await userService.getUser(ctx.from!.id);
    
    const startIndex = (page + 1) * 10;
    const endIndex = Math.min(startIndex + 10, models.length);
    const pageModels = models.slice(startIndex, endIndex);
    
    const keyboard = new KeyboardBuilder();

    if (page >= 0) {
      keyboard.addButton('⬅️ Oldingi', `models_prev_${page + 1}`);
    }

    pageModels.forEach((model, index) => {
      keyboard.addButton(
        `${model.id === user?.selected_model ? '✅' : '🤖'} ${model.name}`,
        `model_${startIndex + index}`
      );
    });

    if (endIndex < models.length) {
      keyboard.addButton('➡️ Keyingi', `models_next_${page + 1}`);
    }

    keyboard.addButton('🏠 Bosh sahifa', 'back_to_main');

    await sendFormattedMessage(ctx, '🤖 AI modelni tanlang:', keyboard.build());
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Models pagination error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

bot.action(/models_prev_(\d+)/, async (ctx) => {
  try {
    const page = parseInt(ctx.match[1]) - 1;
    const models = await modelService.getActiveModels();
    const user = await userService.getUser(ctx.from!.id);
    
    const startIndex = page * 10;
    const endIndex = Math.min(startIndex + 10, models.length);
    const pageModels = models.slice(startIndex, endIndex);
    
    const keyboard = new KeyboardBuilder();

    if (page > 0) {
      keyboard.addButton('⬅️ Oldingi', `models_prev_${page}`);
    }

    pageModels.forEach((model, index) => {
      keyboard.addButton(
        `${model.id === user?.selected_model ? '✅' : '🤖'} ${model.name}`,
        `model_${startIndex + index}`
      );
    });

    if (endIndex < models.length) {
      keyboard.addButton('➡️ Keyingi', `models_next_${page + 1}`);
    }

    keyboard.addButton('🏠 Bosh sahifa', 'back_to_main');

    await sendFormattedMessage(ctx, '🤖 AI modelni tanlang:', keyboard.build());
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Models pagination error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

// Chat mode end handler
bot.hears('🔚 Suhbatni tugatish', async (ctx) => {
  try {
    if (chatModeUsers.has(ctx.from!.id)) {
      chatModeUsers.delete(ctx.from!.id);
      logger.info(`Chat mode ended`, { user_id: ctx.from!.id });

      const keyboard = KeyboardBuilder.createMainMenu(ADMIN_IDS.includes(ctx.from!.id));
      const endChatText = TelegramFormatter.formatChatModeEnd();

      await ctx.reply(endChatText, {
        ...keyboard,
        reply_markup: {
          ...keyboard.reply_markup,
          remove_keyboard: true
        },
        parse_mode: 'HTML'
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('End chat error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

// Promokod tugmasi
bot.action('use_promocode', async (ctx) => {
  try {
    userSessions.set(ctx.from!.id, { step: 'enter_promocode' });
    
    const keyboard = KeyboardBuilder.createBackButton();
    const text = TelegramFormatter.formatPromocodeInput();

    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Use promocode error', { error: errorMessage, user_id: ctx.from?.id });
  }
});

// Ro'yxatdan o'tish xabarlari
bot.on(message('text'), async (ctx, next) => {
  const session = userSessions.get(ctx.from.id);
  
  if (session?.step) {
    const text = ctx.message.text;
    logger.info(`Session step: ${session.step}`, { user_id: ctx.from.id, text_length: text.length });
    
    if (session.step === 'name') {
      if (text.length > 2 && text.length < 50) {
        await userService.updateUserInfo(ctx.from.id, { name: text });
        userSessions.set(ctx.from.id, { step: 'age' });
        
        const keyboard = new KeyboardBuilder()
          .addButton('⏭️ O\'tkazib yuborish', 'skip_age')
          .addButton('⬅️ Orqaga', 'start_registration')
          .addButton('🏠 Bosh sahifa', 'back_to_main')
          .build();

        const ageText = TelegramFormatter.formatRegistrationStep('age');
        return await sendFormattedMessage(ctx, ageText, keyboard, true);
      } else {
        return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Iltimos, to\'g\'ri ism kiriting (2-50 belgi oralig\'ida)'), undefined, true);
      }
    }
    
    if (session.step === 'age') {
      const age = parseInt(text);
      if (age && age > 0 && age < 120) {
        await userService.updateUserInfo(ctx.from.id, { age });
        userSessions.set(ctx.from.id, { step: 'interests' });
        
        const keyboard = new KeyboardBuilder()
          .addButton('⏭️ O\'tkazib yuborish', 'complete_registration')
          .addButton('⬅️ Orqaga', 'skip_name')
          .addButton('🏠 Bosh sahifa', 'back_to_main')
          .build();

        const interestsText = TelegramFormatter.formatRegistrationStep('interests');
        return await sendFormattedMessage(ctx, interestsText, keyboard, true);
      } else {
        return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Iltimos, to\'g\'ri yosh kiriting (1-120 oralig\'ida)'), undefined, true);
      }
    }
    
    if (session.step === 'interests') {
      if (text.length > 2 && text.length < 200) {
        await userService.updateUserInfo(ctx.from.id, { interests: text });
        await userService.completeRegistration(ctx.from.id);
        userSessions.delete(ctx.from.id);
        
        const keyboard = KeyboardBuilder.createMainMenu(ADMIN_IDS.includes(ctx.from.id));
        const completionText = TelegramFormatter.formatRegistrationComplete(ctx.from.id);

        return await sendFormattedMessage(ctx, completionText, keyboard, true);
      } else {
        return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Iltimos, qiziqishlaringizni to\'liqroq yozing (2-200 belgi)'), undefined, true);
      }
    }

    // Promokod kiritish
    if (session.step === 'enter_promocode') {
      const code = text.toUpperCase().trim();
      
      try {
        const result = await promocodeService.usePromocode(code, ctx.from.id);
        userSessions.delete(ctx.from.id);
        
        if (result.success) {
          const successText = TelegramFormatter.formatPromocodeSuccess(
            result.message, 
            result.tokens!.daily, 
            result.tokens!.total
          );
          return await sendFormattedMessage(ctx, successText, undefined, true);
        } else {
          return await sendFormattedMessage(ctx, TelegramFormatter.formatError(result.message), undefined, true);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Promocode error`, { 
          error: errorMessage, 
          user_id: ctx.from.id, 
          code 
        });
        userSessions.delete(ctx.from.id);
        return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Promokod ishlatishda xatolik yuz berdi'), undefined, true);
      }
    }
  }
  
  return next();
});

// Commands
bot.command('stats', async (ctx) => {
  try {
    logger.info(`Stats command`, { user_id: ctx.from!.id });
    const stats = await statsService.getUserStats(ctx.from!.id);
    const statsText = TelegramFormatter.formatStats({
      user_id: ctx.from!.id,
      daily_requests: stats.daily_requests,
      daily_tokens: stats.daily_tokens,
      total_requests: stats.total_requests,
      total_tokens: stats.total_tokens,
      created_at: stats.created_at
    });
    
    await sendFormattedMessage(ctx, statsText, undefined, true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Stats command error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Statistikani olishda xatolik yuz berdi.'), undefined, true);
  }
});

bot.command('balance', async (ctx) => {
  try {
    logger.info(`Balance command`, { user_id: ctx.from!.id });
    const user = await userService.getUser(ctx.from!.id);
    if (!user) {
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Foydalanuvchi ma\'lumotlari topilmadi.'), undefined, true);
    }

    const balanceText = TelegramFormatter.formatBalance(user);
    await sendFormattedMessage(ctx, balanceText, undefined, true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Balance command error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Balansni olishda xatolik yuz berdi.'), undefined, true);
  }
});

// /model buyrug'i
bot.command('model', async (ctx) => {
  try {
    logger.info(`Model command`, { user_id: ctx.from!.id });
    const models = await modelService.getActiveModels();
    const user = await userService.getUser(ctx.from!.id);
    
    if (models.length === 0) {
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Hozirda faol modellar mavjud emas.'), undefined, true);
    }
    
    // Modellarni 10 tadan ko'rsatish
    const keyboard = new KeyboardBuilder();
    
    models.slice(0, 10).forEach((model, index) => {
      keyboard.addButton(
        `${model.id === user?.selected_model ? '✅' : '🤖'} ${model.name}`,
        `model_${index}`
      );
    });

    if (models.length > 10) {
      keyboard.addButton('➡️ Keyingi', 'models_next_0');
    }
    
    keyboard.addButton('🏠 Bosh sahifa', 'back_to_main');

    await sendFormattedMessage(ctx, '🤖 AI modelni tanlang:', keyboard.build(), true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Model command error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Modellarni yuklashda xatolik yuz berdi.'), undefined, true);
  }
});

bot.command('help', async (ctx) => {
  try {
    logger.info(`Help command`, { user_id: ctx.from!.id });
    const user = await userService.getUser(ctx.from!.id);
    const isAdmin = ADMIN_IDS.includes(ctx.from!.id);
    
    const helpText = TelegramFormatter.formatHelp(user, isAdmin);
    await sendFormattedMessage(ctx, helpText, undefined, true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Help command error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Yordam ma\'lumotlarini olishda xatolik yuz berdi.'), undefined, true);
  }
});

// FIXED: Promocode command handler
bot.command('promocode', async (ctx) => {
  try {
    const args = ctx.message.text.split(' ');
    if (args.length !== 2) {
      const formatText = TelegramFormatter.formatPromocodeUsage();
      return await sendFormattedMessage(ctx, formatText, undefined, true);
    }

    const code = args[1].toUpperCase().trim();
    const result = await promocodeService.usePromocode(code, ctx.from!.id);
    
    if (result.success) {
      logger.success(`Promocode used successfully`, { user_id: ctx.from!.id, code });
      const successText = TelegramFormatter.formatPromocodeSuccess(
        result.message, 
        result.tokens!.daily, 
        result.tokens!.total
      );
      return await sendFormattedMessage(ctx, successText, undefined, true);
    } else {
      logger.warning(`Promocode usage failed`, { user_id: ctx.from!.id, code, reason: result.message });
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError(result.message), undefined, true);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Promocode command error`, { 
      error: errorMessage, 
      user_id: ctx.from!.id
    });
    return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Promokod ishlatishda xatolik yuz berdi'), undefined, true);
  }
});

// Admin commands
bot.command('admin', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) {
    logger.warning(`Unauthorized admin access attempt`, { user_id: ctx.from!.id });
    return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Sizda admin huquqi yo\'q!'), undefined, true);
  }

  try {
    logger.admin(`Admin panel accessed`, { admin_id: ctx.from!.id });
    const keyboard = KeyboardBuilder.createAdminPanel();
    await sendFormattedMessage(ctx, '⚙️ <b>Admin Panel:</b>', keyboard, true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin command error', { error: errorMessage, admin_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Admin panelni ochishda xatolik yuz berdi.'), undefined, true);
  }
});

// AI chat handler - FIXED GROUP FUNCTIONALITY
bot.on(message('text'), async (ctx) => {
  const text = ctx.message.text;
  const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
  
  // Admin buyruqlarini tekshirish - FIXED ALL COMMAND VARIATIONS
  if ((text.startsWith('/add_tokens') || text.startsWith('/addtokens') || text.startsWith('/add_token')) && ADMIN_IDS.includes(ctx.from.id)) {
    const args = text.split(' ');
    if (args.length !== 4) {
      const formatText = TelegramFormatter.formatAdminTokenUsage('add');
      return await sendFormattedMessage(ctx, formatText, undefined, true);
    }

    const [, userId, dailyTokens, totalTokens] = args;
    
    try {
      await adminService.addTokens(parseInt(userId), parseInt(dailyTokens), parseInt(totalTokens));
      logger.admin(`Tokens added`, { admin_id: ctx.from.id, user_id: userId, daily: dailyTokens, total: totalTokens });
      
      const successText = TelegramFormatter.formatTokenOperation(userId, parseInt(dailyTokens), parseInt(totalTokens), 'added');
      return await sendFormattedMessage(ctx, successText, undefined, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Token add error`, { error: errorMessage });
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError(`Xatolik: ${errorMessage}`), undefined, true);
    }
  }

  // Remove tokens command - FIXED ALL COMMAND VARIATIONS
  if ((text.startsWith('/remove_tokens') || text.startsWith('/removetokens') || text.startsWith('/remove_token')) && ADMIN_IDS.includes(ctx.from.id)) {
    const args = text.split(' ');
    if (args.length !== 4) {
      const formatText = TelegramFormatter.formatAdminTokenUsage('remove');
      return await sendFormattedMessage(ctx, formatText, undefined, true);
    }

    const [, userId, dailyTokens, totalTokens] = args;
    
    try {
      const result = await adminService.removeTokens(parseInt(userId), parseInt(dailyTokens), parseInt(totalTokens));
      
      if (result.success) {
        logger.admin(`Tokens removed`, { admin_id: ctx.from.id, user_id: userId, daily: dailyTokens, total: totalTokens });
        const successText = TelegramFormatter.formatTokenOperation(userId, parseInt(dailyTokens), parseInt(totalTokens), 'removed');
        return await sendFormattedMessage(ctx, successText, undefined, true);
      } else {
        logger.warning(`Token remove failed`, { admin_id: ctx.from.id, user_id: userId, error: result.message });
        let errorMsg = TelegramFormatter.formatError(result.message);
        if (result.currentTokens) {
          errorMsg += `\n\n<b>📊 Joriy tokenlar:</b>\n🔥 Kunlik: ${result.currentTokens.daily}\n💎 Umumiy: ${result.currentTokens.total}`;
        }
        return await sendFormattedMessage(ctx, errorMsg, undefined, true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Token remove error`, { error: errorMessage });
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError(`Xatolik: ${errorMessage}`), undefined, true);
    }
  }

  // Add promocode command
  if (text.startsWith('/add_promo') && ADMIN_IDS.includes(ctx.from.id)) {
    const args = text.split(' ');
    if (args.length !== 5) {
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Format: /add_promo <kod> <kunlik> <umumiy> <limit>\n\nMisol:\n/add_promo BONUS2025 1000 5000 100'), undefined, true);
    }

    const [, code, dailyTokens, totalTokens, maxUsage] = args;
    
    try {
      await promocodeService.createPromocode(code.toUpperCase(), parseInt(dailyTokens), parseInt(totalTokens), parseInt(maxUsage), ctx.from.id);
      logger.admin(`Promocode created`, { admin_id: ctx.from.id, code: code.toUpperCase() });
      
      const successText = `✅ Promokod yaratildi!\n\n🎫 Kod: ${code.toUpperCase()}\n🔥 Kunlik: ${dailyTokens}\n💎 Umumiy: ${totalTokens}\n👥 Limit: ${maxUsage}`;
      return await sendFormattedMessage(ctx, successText, undefined, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Promocode creation error`, { error: errorMessage });
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError(`Xatolik: ${errorMessage}`), undefined, true);
    }
  }

  // Broadcast command
  if (text.startsWith('/broadcast') && ADMIN_IDS.includes(ctx.from.id)) {
    const message = text.substring(10).trim();
    if (!message) {
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Format: /broadcast <xabar>\n\nMisol:\n/broadcast Yangi funksiya qo\'shildi!'), undefined, true);
    }

    try {
      const successCount = await broadcastService.broadcastToAll(bot, message);
      logger.admin(`Broadcast sent`, { admin_id: ctx.from.id, success_count: successCount });
      
      const successText = `✅ Broadcast yuborildi!\n\n📊 Muvaffaqiyatli: ${successCount} foydalanuvchi`;
      return await sendFormattedMessage(ctx, successText, undefined, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Broadcast error`, { error: errorMessage });
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError(`Xatolik: ${errorMessage}`), undefined, true);
    }
  }

  // FIXED: Group chat detection and handling
  if (isGroup) {
    // Get bot info to check for mentions
    const botInfo = await ctx.telegram.getMe();
    const botUsername = botInfo.username;
    
    // Check if message is a reply to bot or mentions bot
    const isReplyToBot = ctx.message.reply_to_message?.from?.id === botInfo.id;
    const isMentionBot = text.includes(`@${botUsername}`) || text.includes(`@${botInfo.first_name}`);
    
    // Only respond in groups if it's a reply to bot or mentions bot
    if (!isReplyToBot && !isMentionBot) {
      return; // Don't respond to regular group messages
    }
    
    logger.info(`Group AI request detected`, {
      user_id: ctx.from.id,
      chat_id: ctx.chat.id,
      is_reply: isReplyToBot,
      is_mention: isMentionBot,
      text_preview: text.substring(0, 50)
    });
    
    // Clean the text from mentions for AI processing
    const cleanText = text
      .replace(new RegExp(`@${botUsername}`, 'gi'), '')
      .replace(new RegExp(`@${botInfo.first_name}`, 'gi'), '')
      .trim();
    
    // Process the AI request with cleaned text
    await processAIRequest(ctx, cleanText || text);
    return;
  }

  // Chat mode check for private chats
  const isInChatMode = chatModeUsers.has(ctx.from.id);
  
  // In private chat, only respond if in chat mode
  if (!isInChatMode) {
    return;
  }

  // Process AI request for private chat
  await processAIRequest(ctx, text);
});

// Separate function to handle AI requests
async function processAIRequest(ctx: any, text: string) {
  try {
    // User validation
    const user = await userService.getUser(ctx.from.id);
    if (!user) return;

    // Registration check
    if (!user.registration_completed) {
      const keyboard = KeyboardBuilder.createRegistrationMenu();
      return await sendFormattedMessage(ctx, '📝 Avval ro\'yxatdan o\'ting yoki o\'tkazib yuboring:', keyboard, true);
    }

    // Model check
    if (!user.selected_model) {
      const keyboard = new KeyboardBuilder()
        .addButton('🤖 Model tanlash', 'select_model')
        .build();
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Avval AI modelni tanlang!'), keyboard, true);
    }

    // Token check
    if (user.daily_used >= user.daily_tokens || user.total_used >= user.total_tokens) {
      logger.warning(`Token limit exceeded`, { user_id: user.telegram_id, daily_used: user.daily_used, total_used: user.total_used });
      const limitText = TelegramFormatter.formatTokenLimit(ctx.from.id);
      return await sendFormattedMessage(ctx, limitText, undefined, true);
    }

    // Typing indicator
    await ctx.sendChatAction('typing');

    logger.ai(`AI request`, { user_id: ctx.from.id, model: user.selected_model, text_length: text.length, chat_type: ctx.chat.type });

    // Get AI response
    const response = await openRouterService.generateResponse(
      text,
      user.selected_model,
      ctx.from.id,
      user
    );

    // Send response (AI response should be plain text, no formatting)
    await ctx.reply(response.text);

    // Update statistics
    await statsService.updateStats(user.telegram_id, response.tokens);

    logger.success(`AI response sent`, { user_id: ctx.from.id, tokens: response.tokens });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`AI Error`, { user_id: ctx.from.id, error: errorMessage });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError(errorMessage), undefined, true);
  }
}

// Action handlers
bot.action('stats', async (ctx) => {
  try {
    const stats = await statsService.getUserStats(ctx.from!.id);
    const keyboard = KeyboardBuilder.createBackButton();
    const statsText = TelegramFormatter.formatStats({
      user_id: ctx.from!.id,
      daily_requests: stats.daily_requests,
      daily_tokens: stats.daily_tokens,
      total_requests: stats.total_requests,
      total_tokens: stats.total_tokens,
      created_at: stats.created_at
    });

    await sendFormattedMessage(ctx, statsText, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Stats action error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Statistikani olishda xatolik yuz berdi.'), undefined, true);
  }
});

bot.action('balance', async (ctx) => {
  try {
    const user = await userService.getUser(ctx.from!.id);
    if (!user) {
      return await sendFormattedMessage(ctx, TelegramFormatter.formatError('Foydalanuvchi ma\'lumotlari topilmadi.'), undefined, true);
    }

    const keyboard = KeyboardBuilder.createBackButton();
    const balanceText = TelegramFormatter.formatBalance(user);

    await sendFormattedMessage(ctx, balanceText, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Balance action error', { error: errorMessage, user_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Balansni olishda xatolik yuz berdi.'), undefined, true);
  }
});

// Admin actions - FIXED ALL MISSING HANDLERS
bot.action('admin_panel', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;

  try {
    const keyboard = KeyboardBuilder.createAdminPanel();
    await sendFormattedMessage(ctx, '⚙️ <b>Admin Panel:</b>', keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin panel error', { error: errorMessage, admin_id: ctx.from?.id });
  }
});

bot.action('admin_stats', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;
  
  try {
    logger.admin(`Admin stats viewed`, { admin_id: ctx.from!.id });
    const stats = await adminService.getSystemStats();
    
    const keyboard = new KeyboardBuilder()
      .addButton('⬅️ Orqaga', 'admin_panel')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const statsText = TelegramFormatter.formatAdminStats(stats);
    await sendFormattedMessage(ctx, statsText, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin stats error', { error: errorMessage, admin_id: ctx.from?.id });
    await sendFormattedMessage(ctx, TelegramFormatter.formatError('Admin statistikasini olishda xatolik yuz berdi.'), undefined, true);
  }
});

// Add missing admin action handlers
bot.action('admin_add_tokens', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;
  
  try {
    const keyboard = new KeyboardBuilder()
      .addButton('⬅️ Orqaga', 'admin_panel')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = TelegramFormatter.formatAdminTokenUsage('add');
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin add tokens error', { error: errorMessage, admin_id: ctx.from?.id });
  }
});

bot.action('admin_remove_tokens', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;
  
  try {
    const keyboard = new KeyboardBuilder()
      .addButton('⬅️ Orqaga', 'admin_panel')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = TelegramFormatter.formatAdminTokenUsage('remove');
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin remove tokens error', { error: errorMessage, admin_id: ctx.from?.id });
  }
});

bot.action('admin_promocodes', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;
  
  try {
    const keyboard = new KeyboardBuilder()
      .addButton('⬅️ Orqaga', 'admin_panel')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = '🎫 <b>Promokod boshqaruvi:</b>\n\nPromokod yaratish uchun:\n<code>/add_promo <kod> <kunlik> <umumiy> <limit></code>\n\nMisol:\n<code>/add_promo BONUS2025 1000 5000 100</code>';
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin promocodes error', { error: errorMessage, admin_id: ctx.from?.id });
  }
});

bot.action('admin_broadcast', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;
  
  try {
    const keyboard = new KeyboardBuilder()
      .addButton('⬅️ Orqaga', 'admin_panel')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = '📢 <b>Broadcast boshqaruvi:</b>\n\nXabar yuborish uchun:\n<code>/broadcast <xabar></code>\n\nMisol:\n<code>/broadcast Yangi funksiya qo\'shildi!</code>';
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin broadcast error', { error: errorMessage, admin_id: ctx.from?.id });
  }
});

bot.action('admin_models', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;
  
  try {
    const models = await modelService.getActiveModels();
    const keyboard = new KeyboardBuilder()
      .addButton('⬅️ Orqaga', 'admin_panel')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = `🤖 <b>Model boshqaruvi:</b>\n\nJami faol modellar: ${models.length}\n\nEng mashhur modellar:\n${models.slice(0, 5).map(m => `• ${m.name}`).join('\n')}`;
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin models error', { error: errorMessage, admin_id: ctx.from?.id });
  }
});

bot.action('admin_commands', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from!.id)) return;
  
  try {
    const keyboard = new KeyboardBuilder()
      .addButton('⬅️ Orqaga', 'admin_panel')
      .addButton('🏠 Bosh sahifa', 'back_to_main')
      .build();

    const text = '📋 <b>Admin buyruqlari:</b>\n\n<code>/add_tokens <user_id> <daily> <total></code>\n<code>/remove_tokens <user_id> <daily> <total></code>\n<code>/add_promo <kod> <daily> <total> <limit></code>\n<code>/broadcast <xabar></code>\n<code>/admin</code> - Admin panel';
    await sendFormattedMessage(ctx, text, keyboard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Admin commands error', { error: errorMessage, admin_id: ctx.from?.id });
  }
});

// Error handler
bot.catch((err, ctx) => {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  logger.error("Bot Error", { error: errorMessage, user_id: ctx.from?.id });
  
  try {
    sendFormattedMessage(ctx, TelegramFormatter.formatError('Ichki xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'), undefined, true);
  } catch (replyError) {
    logger.error("Failed to send error message", { error: replyError instanceof Error ? replyError.message : 'Unknown error' });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.system('Bot stopping - SIGINT');
  database.close();
  bot.stop('SIGINT');
});

process.on('SIGTERM', () => {
  logger.system('Bot stopping - SIGTERM');
  database.close();
  bot.stop('SIGTERM');
});

// Bot ishga tushirish with error handling
async function startBot() {
  try {
    // Test bot token first
    const botInfo = await bot.telegram.getMe();
    logger.success('Bot token validated', { bot_username: botInfo.username, bot_id: botInfo.id });
    
    await bot.launch();
    
    logger.banner();
    logger.success('Bot started successfully', {
      bot_username: botInfo.username,
      admin_ids: ADMIN_IDS,
      default_daily_tokens: process.env.DEFAULT_DAILY_TOKENS || '1000',
      default_total_tokens: process.env.DEFAULT_TOTAL_TOKENS || '10000'
    });
    logger.separator();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to start bot', { error: errorMessage });
    
    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('getaddrinfo ENOTFOUND')) {
      logger.error('Network connection error. Please check:');
      logger.error('1. Internet connection');
      logger.error('2. Firewall settings');
      logger.error('3. DNS resolution');
    } else if (errorMessage.includes('401')) {
      logger.error('Invalid bot token. Please check BOT_TOKEN in .env file');
    }
    
    process.exit(1);
  }
}

startBot();
