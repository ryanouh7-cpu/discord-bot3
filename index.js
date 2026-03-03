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

/* ================== Data ================== */

if (!fs.existsSync("./tickets.json")) {
  fs.writeFileSync("./tickets.json", JSON.stringify({}));
}

let database = JSON.parse(fs.readFileSync("./tickets.json"));
let counter = database.counter || 1;
let openTickets = database.open || {};

function save() {
  fs.writeFileSync(
    "./tickets.json",
    JSON.stringify({ counter, open: openTickets }, null, 2)
  );
}

/* ================== Ready ================== */

client.once("ready", () => {
  console.log("✅ Uun System Online");
});

/* ================== Commands ================== */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!setup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("install")
        .setLabel("✅ Install System")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("delete")
        .setLabel("🗑 Delete System")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("send_panel")
        .setLabel("🎫 Send Ticket Panel")
        .setStyle(ButtonStyle.Primary)
    );

    return message.reply({
      content: "🔧 Uun Control Panel:",
      components: [row]
    });
  }
});

/* ================== Buttons ================== */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const guild = interaction.guild;
  const member = interaction.member;

/* ===== Install System ===== */

  if (interaction.customId === "install") {

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    let logs = guild.channels.cache.find(c => c.name === "Uun Logs");
    if (!logs)
      logs = await guild.channels.create({
        name: "Uun Logs",
        type: ChannelType.GuildCategory
      });

    const logChannels = [
      "member-join-log",
      "member-leave-log",
      "voice-join-log",
      "voice-leave-log",
      "voice-move-log",
      "ticket-open-log",
      "ticket-close-log",
      "ticket-claim-log"
    ];

    for (const name of logChannels) {
      if (!guild.channels.cache.find(c => c.name === name)) {
        await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: logs.id
        });
      }
    }

    if (!guild.channels.cache.find(c => c.name === "Uun Tickets")) {
      await guild.channels.create({
        name: "Uun Tickets",
        type: ChannelType.GuildCategory
      });
    }

    interaction.reply({ content: "✅ System Installed", ephemeral: true });
  }

/* ===== Delete System ===== */

  if (interaction.customId === "delete") {
    guild.channels.cache.forEach(c => {
      if (c.name.includes("Uun") || c.name.includes("log"))
        c.delete().catch(() => {});
    });

    interaction.reply({ content: "🗑 System Deleted", ephemeral: true });
  }

/* ===== Send Ticket Panel ===== */

  if (interaction.customId === "send_panel") {

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 Open Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({
      content: "🎟 Click below to open a support ticket.",
      components: [row]
    });

    interaction.reply({ content: "✅ Ticket panel sent.", ephemeral: true });
  }

/* ===== Open Ticket ===== */

  if (interaction.customId === "open_ticket") {

    if (openTickets[member.id])
      return interaction.reply({
        content: "❌ You already have an open ticket.",
        ephemeral: true
      });

    const category = guild.channels.cache.find(c => c.name === "Uun Tickets");
    if (!category)
      return interaction.reply({
        content: "❌ Ticket system not installed.",
        ephemeral: true
      });

    const channel = await guild.channels.create({
      name: `ticket-${counter++}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    openTickets[member.id] = channel.id;
    save();

    guild.channels.cache.find(c => c.name === "ticket-open-log")
      ?.send(`🎫 ${member} opened ${channel}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim")
        .setLabel("🛠 Claim")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("close")
        .setLabel("🔒 Close")
        .setStyle(ButtonStyle.Danger)
    );

    channel.send({
      content: `${member}`,
      components: [row]
    });

    interaction.reply({ content: "✅ Ticket Created", ephemeral: true });
  }

/* ===== Claim ===== */

  if (interaction.customId === "claim") {

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    guild.channels.cache.find(c => c.name === "ticket-claim-log")
      ?.send(`🛠 ${member} claimed ${interaction.channel}`);

    interaction.reply("✅ Ticket claimed");
  }

/* ===== Close ===== */

  if (interaction.customId === "close") {

    guild.channels.cache.find(c => c.name === "ticket-close-log")
      ?.send(`🔒 ${interaction.channel.name} closed`);

    delete openTickets[
      Object.keys(openTickets).find(
        k => openTickets[k] === interaction.channel.id
      )
    ];

    save();

    interaction.channel.send("⭐ Thank you for contacting support");

    setTimeout(() => interaction.channel.delete(), 5000);
  }

});

/* ================== Logs ================== */

const get = (g, n) => g.channels.cache.find(c => c.name === n);

client.on("guildMemberAdd", m => {
  get(m.guild, "member-join-log")
    ?.send(`${m} joined the server`);
});

client.on("guildMemberRemove", m => {
  get(m.guild, "member-leave-log")
    ?.send(`${m.user.tag} left the server`);
});

client.on("voiceStateUpdate", (o, n) => {
  const g = n.guild;
  const m = n.member;

  if (!o.channelId && n.channelId)
    get(g, "voice-join-log")
      ?.send(`${m} joined ${n.channel.name}`);

  if (o.channelId && !n.channelId)
    get(g, "voice-leave-log")
      ?.send(`${m} left ${o.channel.name}`);

  if (o.channelId && n.channelId && o.channelId !== n.channelId)
    get(g, "voice-move-log")
      ?.send(`${m} moved voice channels`);
});

/* ================== Login ================== */

client.login(process.env.TOKEN);
