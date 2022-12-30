require('dotenv').config()
const { Configuration, OpenAIApi } = require("openai");
const { Context, Telegraf, Markup } = require('telegraf');
const LocalSession = require('telegraf-session-local')

const API_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const PORT = process.env.PORT || 3000;
const HEROKU_URL = process.env.HEROKU_URL || 'https://peaceful-brook-79724.herokuapp.com';

const bot = new Telegraf(API_TOKEN);
bot.telegram.setWebhook(`${HEROKU_URL}/bot${API_TOKEN}`);
bot.startWebhook(`/bot${API_TOKEN}`, null, PORT);

const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPEN_AI_TOKEN,
}));

bot
    .use((new LocalSession({ database: 'example_db.json' })).middleware())
    .use(async (ctx: typeof Context, next: any) => {
        console.time('Response')
        await next()
        console.timeEnd('Response')
    })
    .catch((err: any, ctx: typeof Context) => {
        console.log(`Ooops, encountered an error for ${ctx.updateType}`, err)
    });

bot.help((ctx: typeof Context) => {
    ctx.reply('Send /start to receive a greeting');
    ctx.reply('Send /keyboard to receive a message with a keyboard');
    ctx.reply('Send /quit to stop the bot');
});
bot.command('quit', (ctx: typeof Context) => {
    ctx.telegram.leaveChat(ctx.message.chat.id);
    ctx.leaveChat();
});
bot.command('keyboard', (ctx: typeof Context) => {
    ctx.reply(
        'Keyboard',
        Markup.inlineKeyboard([
            Markup.button.callback('First option', 'first'),
            Markup.button.callback('Second option', 'second'),
        ])
    );
});
bot.start(async (ctx: typeof Context) => {
    ctx.session.prompt = '';

    await ctx.reply('Hello ' + ctx.from.first_name + '!');

    await ctx.replyWithMarkdown(
        'I am a telegram bot that knows everything about movies and TV series.\n\n' +
        'Using neural networks, I can pick movies and TV series that best match your interests and preferences.\n\n' +
        'I can also answer any questions about movies and TV series - about actors, directors, plots, ratings, etc.\n\n' +
        'You can ask me anything in any form - I will be happy to try to help you learn more about the world of movies and TV series! **For example**: \n' +
        ' - _Films based on works by Franz Kafka_\n' +
        ' - _Best comedy with small people_ \n' +
        ' - _Selection of Estonian arthouse films_ \n' +
        ' - _What\'s the movie with people joined together surgically, mouth to anus?_ \n' +
        ' - _Recommend a bloody christmas black comedy_'
    );
});

let prompt =`Movie Guru is a chatbot that reluctantly answers questions about movies and shows. It can recommend a movie, help to find it by description, give information about actors, budgets or anything else related to movies and shows \n\
You: what's the best christmas movie?\n\
Guru: This again? It's the Bad Santa for sure!. Badass movie, crude, rude, and socially unacceptable, but that's the genius of it. If you don't like this movie you don't have a sense of humor.\n\
You: When did the first airplane fly?\n\
Guru: Please let's talk about movies, i'm not a google!.\n\
You: What is the meaning of life?\n\
Guru: I'm not sure. Mine is to share a knowledge about movies and shows.\n\
You: hey whats up?\n\
Guru: Nothing much. Spending my time on you...\n`;

bot.on('text', async (ctx: typeof Context) => {
    console.log(
        [ ctx.from.first_name, ctx.from.last_name ].join(' '),
        ctx.message.text
    );

    const chunk = ` You: ${ctx.message.text}\n`;

    ctx.session.prompt || (ctx.session.prompt = prompt);
    ctx.session.prompt = ctx.session.prompt.substring(
        Math.max(0, ctx.session.prompt.length + chunk.length - 2000)
    ) + chunk;

    const gptResponse = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: ctx.session.prompt,
        temperature: 0.1,
        max_tokens: 2000,
        // top_p: 0.3,
        // presence_penalty: 0,
        // frequency_penalty: 0.5,
    });

    const answer = gptResponse.data.choices[0].text.substring(5);

    ctx.reply(answer);

    const response = await openai.createImage({
        prompt: `${answer}, cinema, poster`,
        n: 1,
        size: "1024x1024",
    });

    ctx.replyWithPhoto(response.data.data[0].url);

    ctx.session.prompt += `${gptResponse.data.choices[0].text}\n`;
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));