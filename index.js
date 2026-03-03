const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

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
  console.log("✅ Uun is online");
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

/* ================= تثبيت النظام ================= */

async function installSystem(guild) {

  /* ========= Logs Category (Private) ========= */

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
    "ticket-claim-log",
    "support-alert-log"
  ];

  for (const name of logChannels) {
    const exists = guild.channels.cache.find(
      c => c.name === name && c.parentId === logsCategory.id
    );

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

  /* ========= Tickets Category ========= */

  let ticketCategory = guild.channels.cache.find(
    c => c.name === "Uun Tickets"
  );

  if (!ticketCategory) {
    await guild.channels.create({
      name: "Uun Tickets",
      type: ChannelType.GuildCategory
    });
  }

  /* ========= Welcome Channel ========= */

  let welcomeChannel = guild.channels.cache.find(
    c => c.name === "uun-welcome"
  );

  if (!welcomeChannel) {
    await guild.channels.create({
      name: "uun-welcome",
      type: ChannelType.GuildText
    });
  }

  /* ========= Support Voice Category ========= */

  let supportCategory = guild.channels.cache.find(
    c => c.name === "Uun Support"
  );

  if (!supportCategory) {
    supportCategory = await guild.channels.create({
      name: "Uun Support",
      type: ChannelType.GuildCategory
    });
  }

  const supportRooms = [
    "دعم فني 1",
    "دعم فني 2",
    "دعم فني 3"
  ];

  for (const name of supportRooms) {
    const exists = guild.channels.cache.find(c => c.name === name);

    if (!exists) {
      await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: supportCategory.id,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
            deny: [PermissionsBitField.Flags.Connect]
          }
        ]
      });
    }
  }

  const waitingExists = guild.channels.cache.find(
    c => c.name === "قاعة الانتظار"
  );

  if (!waitingExists) {
    await guild.channels.create({
      name: "قاعة الانتظار",
      type: ChannelType.GuildVoice,
      parent: supportCategory.id,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect
          ]
        }
      ]
    });
  }
}

/* ================= حذف النظام ================= */

async function deleteSystem(guild) {

  const channelsToDelete = guild.channels.cache.filter(c =>
    c.name.startsWith("uun") ||
    c.name.includes("log") ||
    c.name === "Uun Logs" ||
    c.name === "Uun Tickets" ||
    c.name === "Uun Support" ||
    c.name.includes("دعم") ||
    c.name === "قاعة الانتظار"
  );

  for (const channel of channelsToDelete.values()) {
    await channel.delete().catch(() => {});
  }
}

/* ================= تنبيه الانتظار ================= */

client.on("voiceStateUpdate", async (oldState, newState) => {

  if (!newState.channel) return;
  if (newState.channel.name !== "قاعة الانتظار") return;

  const guild = newState.guild;

  const logChannel = guild.channels.cache.find(
    c => c.name === "support-alert-log"
  );

  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0xff9900)
    .setTitle("🔔 New Support Request")
    .setDescription(
      `👤 **User:** ${newState.member}\n🎙️ **Channel:** قاعة الانتظار\n\nAn administrator is needed.`
    )
    .setTimestamp();

  await logChannel.send({
    content: "@here",
    embeds: [embed]
  });

});

client.login(process.env.TOKEN);
