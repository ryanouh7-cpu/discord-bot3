const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const config = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
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

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("install_system")
        .setLabel("📌 تثبيت النظام")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("delete_system")
        .setLabel("🗑 حذف النظام")
        .setStyle(ButtonStyle.Danger)
    );

    message.reply({
      content: "اختر الإجراء:",
      components: [row]
    });
  }
});

/* ================= الأزرار ================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: "❌ للأدمن فقط.", ephemeral: true });
  }

  if (interaction.customId === "install_system") {
    await installSystem(interaction.guild);
    interaction.reply({ content: "✅ تم تثبيت نظام Uun بنجاح.", ephemeral: true });
  }

  if (interaction.customId === "delete_system") {
    await deleteSystem(interaction.guild);
    interaction.reply({ content: "🗑 تم حذف نظام Uun بالكامل.", ephemeral: true });
  }
});

/* ================= تثبيت ================= */

async function installSystem(guild) {

  // ===== Logs Category (Private) =====
  let logsCategory = guild.channels.cache.find(
    c => c.name === "Uun Logs"
  );

  if (!logsCategory) {
    logsCategory = await guild.channels.create({
      name: "Uun Logs",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
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
    const exists = guild.channels.cache.find(c => c.name === name);

    if (!exists) {
      await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: logsCategory.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });
    }
  }

  // ===== Tickets Category =====
  let ticketCategory = guild.channels.cache.find(
    c => c.name === "Uun Tickets"
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

/* ================= حذف ================= */

async function deleteSystem(guild) {

  const channelsToDelete = guild.channels.cache.filter(c =>
    c.name.startsWith("uun") ||
    c.name.includes("log") ||
    c.name === "Uun Logs" ||
    c.name === "Uun Tickets"
  );

  for (const channel of channelsToDelete.values()) {
    await channel.delete().catch(() => {});
  }
}

client.login(process.env.TOKEN);
