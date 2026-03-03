const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const config = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once("ready", () => {
  console.log(`✅ ${config.botName} is online`);
});

/* ================= أمر setup ================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!setup") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ هذا الأمر للأدمن فقط.");
    }

    await setupServer(message.guild);
    message.reply("✅ تم إنشاء نظام Uun بالكامل.");
  }
});

/* ================= دالة الإنشاء ================= */

async function setupServer(guild) {

  // ===== Logs Category =====
  let logsCategory = guild.channels.cache.find(
    c => c.name === "Uun Logs" && c.type === ChannelType.GuildCategory
  );

  if (!logsCategory) {
    logsCategory = await guild.channels.create({
      name: "Uun Logs",
      type: ChannelType.GuildCategory
    });
  }

  const logChannels = [
    "member-join-log",
    "member-leave-log",
    "username-change-log",
    "voice-join-log",
    "voice-leave-log",
    "voice-move-log",
    "voice-mute-log",
    "voice-deafen-log",
    "role-add-log",
    "role-remove-log",
    "message-delete-log",
    "message-edit-log",
    "ticket-open-log",
    "ticket-close-log",
    "ticket-claim-log"
  ];

  for (const name of logChannels) {
    const exists = guild.channels.cache.find(
      c => c.name === name && c.parentId === logsCategory.id
    );

    if (!exists) {
      await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: logsCategory.id
      });
    }
  }

  // ===== Tickets Category =====
  let ticketCategory = guild.channels.cache.find(
    c => c.name === "Uun Tickets" && c.type === ChannelType.GuildCategory
  );

  if (!ticketCategory) {
    await guild.channels.create({
      name: "Uun Tickets",
      type: ChannelType.GuildCategory
    });
  }

  // ===== Welcome Channel =====
  let welcomeChannel = guild.channels.cache.find(
    c => c.name === "uun-welcome"
  );

  if (!welcomeChannel) {
    await guild.channels.create({
      name: "uun-welcome",
      type: ChannelType.GuildText
    });
  }
}

client.login(process.env.TOKEN);
