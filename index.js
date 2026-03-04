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

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* ================= Ready ================= */

client.once("ready", () => {
  console.log("🔥 Uun System Online");
});

/* ================= Commands ================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return;

  /* ===== Ticket System Command ===== */

  if (message.content === "!ticket-system") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("install_ticket")
        .setLabel("✅ Install Ticket System")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("delete_ticket")
        .setLabel("🗑 Delete Ticket System")
        .setStyle(ButtonStyle.Danger)
    );

    return message.reply({
      content: "🎫 Uun Ticket System Control",
      components: [row]
    });
  }

  /* ===== Server System Command ===== */

  if (message.content === "!server-system") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("install_server")
        .setLabel("✅ Install Server System")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("delete_server")
        .setLabel("🗑 Delete Server System")
        .setStyle(ButtonStyle.Danger)
    );

    return message.reply({
      content: "🛠 Uun Server System Control",
      components: [row]
    });
  }
});

/* ================= Buttons ================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const guild = interaction.guild;

/* ===== Install Ticket System ===== */

  if (interaction.customId === "install_ticket") {

    if (!guild.channels.cache.find(c => c.name === "Uun Tickets")) {
      await guild.channels.create({
        name: "Uun Tickets",
        type: ChannelType.GuildCategory
      });
    }

    interaction.reply({ content: "✅ Ticket System Installed", ephemeral: true });
  }

/* ===== Delete Ticket System ===== */

  if (interaction.customId === "delete_ticket") {

    guild.channels.cache.forEach(c => {
      if (c.name === "Uun Tickets" || c.name.startsWith("ticket-"))
        c.delete().catch(()=>{});
    });

    interaction.reply({ content: "🗑 Ticket System Deleted", ephemeral: true });
  }

/* ===== Install Server System ===== */

  if (interaction.customId === "install_server") {

    if (!guild.channels.cache.find(c => c.name === "uun-logs")) {
      await guild.channels.create({
        name: "uun-logs",
        type: ChannelType.GuildText
      });
    }

    if (!guild.channels.cache.find(c => c.name === "uun-feedback")) {
      await guild.channels.create({
        name: "uun-feedback",
        type: ChannelType.GuildText
      });
    }

    interaction.reply({ content: "✅ Server System Installed", ephemeral: true });
  }

/* ===== Delete Server System ===== */

  if (interaction.customId === "delete_server") {

    guild.channels.cache.forEach(c => {
      if (c.name === "uun-logs" || c.name === "uun-feedback")
        c.delete().catch(()=>{});
    });

    interaction.reply({ content: "🗑 Server System Deleted", ephemeral: true });
  }

});

/* ================= Voice Logs ================= */

client.on("voiceStateUpdate", (oldState, newState) => {

  const logChannel = newState.guild.channels.cache.find(c => c.name === "uun-logs");
  if (!logChannel) return;

  if (!oldState.channel && newState.channel)
    logChannel.send(`${newState.member} joined ${newState.channel.name}`);

  if (oldState.channel && !newState.channel)
    logChannel.send(`${newState.member} left ${oldState.channel.name}`);

});

/* ================= Member Logs ================= */

client.on("guildMemberAdd", member => {
  const logChannel = member.guild.channels.cache.find(c => c.name === "uun-logs");
  if (logChannel)
    logChannel.send(`${member} joined the server`);
});

client.on("guildMemberRemove", member => {
  const logChannel = member.guild.channels.cache.find(c => c.name === "uun-logs");
  if (logChannel)
    logChannel.send(`${member.user.tag} left the server`);
});

/* ================= Login ================= */

client.login(process.env.TOKEN);
