# 🤖 Telegram AI Chatbot

[![Node.js](https://img.shields.io/badge/Node.js-20.19.3-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![Telegraf](https://img.shields.io/badge/Telegraf-4.15.6-blue.svg)](https://telegraf.js.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Professional Telegram AI Chatbot with OpenRouter integration, comprehensive user management, and advanced admin features.**

## 🌟 Features

### 🤖 **AI Integration**

- **52+ AI Models**: Access to latest models from OpenAI, Anthropic, Google, Meta, and more
- **OpenRouter Integration**: Seamless API integration with multiple providers
- **Smart Context**: Personalized responses based on user profile
- **Rate Limiting**: 10 requests per minute to prevent abuse

### 👥 **User Management**

- **Registration System**: Optional user onboarding with profile collection
- **Token System**: Daily and total token limits per user
- **Statistics Tracking**: Comprehensive usage analytics
- **Profile Management**: Age, interests, and preferences storage

### 🔧 **Admin Features**

- **Admin Panel**: Complete administrative interface
- **Token Management**: Add/remove tokens for users
- **System Statistics**: Real-time bot usage analytics
- **Broadcast System**: Send messages to all users or specific groups
- **Promocode System**: Create and manage promotional codes

### 💬 **Chat Features**

- **Private Chat**: Direct AI conversations
- **Group Support**: Responds to mentions and replies
- **Model Selection**: Choose from 52+ available AI models
- **Chat Modes**: Toggle between normal and AI chat mode
- **Rich Formatting**: HTML formatting with fallback to plain text

### 🛡️ **Security & Reliability**

- **SQLite Database**: Local data storage with WAL mode
- **Error Handling**: Comprehensive error management
- **Rate Limiting**: Request throttling per user
- **Admin Authorization**: Secure admin-only features
- **Data Validation**: Input sanitization and validation

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.19.3 or higher
- **npm** or **yarn**
- **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather))
- **OpenRouter API Key** (from [OpenRouter](https://openrouter.ai/))

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/Abdumutolib-404/telegram-ai-chatbot.git
cd telegram-ai-chatbot
```

2. **Install dependencies:**

```bash
npm install
```

3. **Configure environment:**

```bash
cp .env.example .env
```

4. **Edit `.env` file:**

```env
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here

# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Admin Configuration (Your Telegram ID)
ADMIN_IDS=123456789,987654321

# Token Limits
DEFAULT_DAILY_TOKENS=1000
DEFAULT_TOTAL_TOKENS=10000

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=10
```

5. **Start the bot:**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📋 Available Commands

### 👤 **User Commands**

| Command      | Description                      | Example                |
| ------------ | -------------------------------- | ---------------------- |
| `/start`     | Start the bot and show main menu | `/start`               |
| `/model`     | Select AI model                  | `/model`               |
| `/stats`     | View your usage statistics       | `/stats`               |
| `/balance`   | Check token balance              | `/balance`             |
| `/help`      | Show help information            | `/help`                |
| `/promocode` | Use a promotional code           | `/promocode BONUS2025` |

### 👑 **Admin Commands**

| Command          | Description             | Example                             |
| ---------------- | ----------------------- | ----------------------------------- |
| `/admin`         | Open admin panel        | `/admin`                            |
| `/add_tokens`    | Add tokens to user      | `/add_tokens 123456789 1000 5000`   |
| `/remove_tokens` | Remove tokens from user | `/remove_tokens 123456789 500 1000` |

## 🤖 Available AI Models

The bot includes **52 cutting-edge AI models**:

### 🔥 **Popular Models**

- **DeepSeek Chat V3** - Latest reasoning model
- **GPT-4 Turbo** - OpenAI's flagship model
- **Claude 3 Sonnet** - Anthropic's balanced model
- **Gemini 2.0 Flash** - Google's latest model
- **Llama 3.3 70B** - Meta's open-source model

### 🆓 **Free Models**

All models are available through OpenRouter's free tier, including:

- DeepSeek R1 series
- Qwen 3 series
- Mistral models
- Google Gemma series
- And many more!

## 🏗️ Architecture

### 📁 **Project Structure**

```
src/
├── config/          # Configuration files
│   ├── constants.ts  # Environment variables
│   ├── database.ts   # Database setup
│   └── models.txt    # Available AI models
├── services/         # Business logic
│   ├── admin.ts      # Admin operations
│   ├── broadcast.ts  # Message broadcasting
│   ├── model.ts      # AI model management
│   ├── openrouter.ts # OpenRouter API integration
│   ├── promocode.ts  # Promocode system
│   ├── rateLimit.ts  # Rate limiting
│   ├── stats.ts      # Statistics tracking
│   └── user.ts       # User management
├── types/            # TypeScript definitions
│   └── bot.ts        # Type definitions
├── utils/            # Utility functions
│   ├── formatter.ts  # Message formatting
│   ├── keyboard.ts   # Inline keyboards
│   └── logger.ts     # Logging system
└── index.ts          # Main bot file
```

### 🗄️ **Database Schema**

- **users**: User profiles and token balances
- **models**: Available AI models
- **user_stats**: Usage statistics
- **promocodes**: Promotional codes
- **promocode_usage**: Promocode usage tracking
- **rate_limits**: Rate limiting data

## 🎯 Usage Examples

### 💬 **Private Chat**

1. Start the bot with `/start`
2. Complete registration (optional)
3. Select an AI model with `/model`
4. Click "💬 Suhbat boshlash" to enter chat mode
5. Send any message to get AI responses

### 👥 **Group Chat**

1. Add the bot to your group
2. Mention the bot: `@your_bot_name your question`
3. Or reply to the bot's messages
4. The bot will respond with AI-generated answers

### 🎫 **Using Promocodes**

```bash
/promocode BONUS2025
```

### 👑 **Admin Operations**

```bash
# Add tokens to user
/add_tokens 123456789 1000 5000

# Remove tokens from user
/remove_tokens 123456789 500 1000

# Access admin panel
/admin
```

## ⚙️ Configuration

### 🔧 **Environment Variables**

| Variable                         | Description               | Default  |
| -------------------------------- | ------------------------- | -------- |
| `BOT_TOKEN`                      | Telegram bot token        | Required |
| `OPENROUTER_API_KEY`             | OpenRouter API key        | Required |
| `ADMIN_IDS`                      | Comma-separated admin IDs | Required |
| `DEFAULT_DAILY_TOKENS`           | Daily token limit         | 1000     |
| `DEFAULT_TOTAL_TOKENS`           | Total token limit         | 10000    |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Rate limit                | 10       |

### 🎛️ **Customization**

You can customize:

- **Token limits** per user
- **Available models** in `src/config/models.txt`
- **Admin permissions** via `ADMIN_IDS`
- **Rate limiting** settings
- **Default messages** in formatter

## 🔧 Development

### 📦 **Scripts**

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run clean    # Clean build directory
```

### 🧪 **Adding New Features**

1. **New Commands**: Add handlers in `src/index.ts`
2. **New Services**: Create files in `src/services/`
3. **Database Changes**: Update `src/config/database.ts`
4. **New Models**: Add to `src/config/models.txt`

## 🚀 Deployment

### 🐳 **Docker Deployment**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### ☁️ **VPS Deployment**

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name telegram-bot

# Save PM2 configuration
pm2 save
pm2 startup
```

## 📊 Monitoring

### 📈 **Built-in Analytics**

- User registration tracking
- Token usage statistics
- Model usage analytics
- Error rate monitoring
- Daily/total request counts

### 🔍 **Logging**

The bot includes comprehensive logging:

- User activities
- AI requests/responses
- Admin operations
- Error tracking
- System events

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** for providing access to multiple AI models
- **Telegraf** for the excellent Telegram bot framework
- **TypeScript** for type safety and developer experience
- **SQLite** for reliable local data storage

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Abdumutolib-404/telegram-ai-chatbot/issues)
- **Telegram**: Contact the bot admin for support
- **Documentation**: Check this README for detailed information

## 🌟 Star History

If this project helped you, please consider giving it a ⭐ on GitHub!

---

<div align="center">

**Made with ❤️ by [Abdumutolib](https://github.com/Abdumutolib-404)**

_Bringing AI to Telegram, one conversation at a time._

</div>
