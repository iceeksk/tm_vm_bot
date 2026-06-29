require("dotenv").config();

const express = require("express");
const TelegramBot = require("node-telegram-bot-api").default;
const config = require("./config.json");

const token = process.env.BOT_TOKEN;
const adminId = Number(process.env.ADMIN_ID);
const port = process.env.PORT || 3000;

if (!token) {
    throw new Error("BOT_TOKEN is missing in .env");
}

const bot = new TelegramBot(token, { polling: true });

const app = express();

app.get("/", (req, res) => {
    res.send("Bot is running");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const userQuestionMode = new Set();
const adminReplyMode = new Map();

const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ["💰 Вартість навчання", "📍 Адреса"],
            ["📞 Телефон", "✉️ Email"],
            ["🌐 Сайт", "📅 Графік роботи"],
            ["❓ Поставити запитання"]
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    await bot.sendMessage(
        chatId,
        "Вітаємо! 👋\n\nОберіть потрібний пункт меню або поставте своє запитання адміністратору.",
        mainKeyboard
    );

    console.log("User chat id:", chatId);
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/start")) return;

    if (chatId === adminId && adminReplyMode.has(chatId)) {
        const targetUserId = adminReplyMode.get(chatId);

        await bot.sendMessage(
            targetUserId,
            `✅ Відповідь адміністратора:\n\n${text}`
        );

        await bot.sendMessage(adminId, "✅ Відповідь надіслано користувачу.");
        adminReplyMode.delete(chatId);
        return;
    }

    if (text === "💰 Вартість навчання") {
        return bot.sendMessage(chatId, config.price, mainKeyboard);
    }

    if (text === "📍 Адреса") {
        return bot.sendMessage(chatId, config.address, mainKeyboard);
    }

    if (text === "📞 Телефон") {
        return bot.sendMessage(chatId, config.phone, mainKeyboard);
    }

    if (text === "✉️ Email") {
        return bot.sendMessage(chatId, config.email, mainKeyboard);
    }

    if (text === "🌐 Сайт") {
        return bot.sendMessage(chatId, config.site, mainKeyboard);
    }

    if (text === "📅 Графік роботи") {
        return bot.sendMessage(chatId, config.schedule, mainKeyboard);
    }

    if (text === "❓ Поставити запитання") {
        userQuestionMode.add(chatId);

        return bot.sendMessage(
            chatId,
            "Напишіть ваше питання. Адміністратор отримає його і відповість вам у цьому боті."
        );
    }

    if (userQuestionMode.has(chatId)) {
        userQuestionMode.delete(chatId);

        const username = msg.from.username ? `@${msg.from.username}` : "немає username";
        const name = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim();

        await bot.sendMessage(
            adminId,
            `🔔 Нове питання\n\n👤 Користувач: ${name || "Без імені"}\nUsername: ${username}\nUser ID: ${chatId}\n\n❓ Питання:\n${text}`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "✉️ Відповісти",
                                callback_data: `reply_${chatId}`
                            }
                        ]
                    ]
                }
            }
        );

        return bot.sendMessage(
            chatId,
            "✅ Ваше питання передано адміністратору. Відповідь прийде сюди, у цей бот.",
            mainKeyboard
        );
    }

    await bot.sendMessage(
        chatId,
        "Будь ласка, оберіть пункт меню або натисніть «❓ Поставити запитання».",
        mainKeyboard
    );
});

bot.on("callback_query", async (query) => {
    const adminChatId = query.message.chat.id;
    const data = query.data;

    if (adminChatId !== adminId) {
        return bot.answerCallbackQuery(query.id, {
            text: "Ця дія доступна тільки адміністратору."
        });
    }

    if (data.startsWith("reply_")) {
        const targetUserId = Number(data.replace("reply_", ""));

        adminReplyMode.set(adminChatId, targetUserId);

        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(
            adminChatId,
            "Напишіть відповідь користувачу наступним повідомленням."
        );
    }
});