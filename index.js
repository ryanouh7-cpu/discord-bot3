const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
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

/* ================= Database ================= */

if (!fs.existsSync("./tickets.json")) {
  fs.writeFileSync("./tickets.json", JSON.stringify({}));
}

let db = JSON.parse(fs.readFileSync("./tickets.json"));

let counter = db.counter || 1;
let openTickets = db.open || {};
let claimedTickets = db.claimed || {};
let ticketData = db.data || {};

function save() {
  fs.writeFileSync(
    "./tickets.json",
    JSON.stringify({
      counter,
      open: openTickets,
      claimed: claimedTickets,
      data: ticketData
    }, null, 2)
  );
}

/* ================= Ready ================= */

client.once("ready", () => {
  console.log("🔥 Uun System V5 Hybrid Online");
});

/* ================= Setup ================= */

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

    message.reply({
      content: "🔧 Uun Control Panel",
      components: [row]
    });
  }
});

/* ================= Interactions ================= */

client.on("interactionCreate", async (interaction) => {

  const guild = interaction.guild;
  const member = interaction.member;

  /* ================= Install ================= */

  if (interaction.isButton() && interaction.customId === "install") {

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
      "ticket-claim-log",
      "ticket-close-log",
      "uun-feedback"
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

    return interaction.reply({ content: "✅ System Installed", ephemeral: true });
  }

  /* ================= Delete ================= */

  if (interaction.isButton() && interaction.customId === "delete") {
    guild.channels.cache.forEach(c => {
      if (c.name.includes("Uun") || c.name.includes("log"))
        c.delete().catch(()=>{});
    });

    return interaction.reply({ content: "🗑 System Deleted", ephemeral: true });
  }

  /* ================= Send Panel ================= */

  if (interaction.isButton() && interaction.customId === "send_panel") {

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("Uun System")
      .setDescription("Click the button below to open a support ticket.")
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 Open Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: "✅ Panel Sent", ephemeral: true });
  }

  /* ================= Open Ticket ================= */

  if (interaction.isButton() && interaction.customId === "open_ticket") {

    if (openTickets[member.id])
      return interaction.reply({
        content: "❌ You already have an open ticket.",
        ephemeral: true
      });

    const category = guild.channels.cache.find(c => c.name === "Uun Tickets");
    if (!category)
      return interaction.reply({
        content: "❌ System not installed.",
        ephemeral: true
      });

    const ticketID = String(counter++).padStart(4, "0");

    const channel = await guild.channels.create({
      name: `ticket-${ticketID}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    openTickets[member.id] = channel.id;

    ticketData[channel.id] = {
      owner: member.id,
      openedAt: Date.now(),
      claimedBy: null
    };

    save();

    guild.channels.cache.find(c => c.name === "ticket-open-log")
      ?.send(`🎫 Ticket #${ticketID} opened by ${member}`);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("Uun System")
      .addFields(
        { name: "👤 Owner", value: `${member}`, inline: true },
        { name: "🆔 Ticket ID", value: ticketID, inline: true },
        { name: "🕒 Opened", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("🛠 Claim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("🔒 Close").setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: `${member}`, embeds: [embed], components: [row] });

    interaction.reply({ content: "✅ Ticket Created", ephemeral: true });

    /* Auto close after 6 hours */
    setTimeout(async () => {
      if (guild.channels.cache.get(channel.id)) {
        channel.send("⏰ Ticket closed automatically due to inactivity.");
        channel.delete().catch(()=>{});
      }
    }, 6 * 60 * 60 * 1000);
  }

  /* ================= Claim ================= */

  if (interaction.isButton() && interaction.customId === "claim") {

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    if (ticketData[interaction.channel.id].claimedBy)
      return interaction.reply({ content: "❌ Already claimed.", ephemeral: true });

    ticketData[interaction.channel.id].claimedBy = member.id;
    save();

    guild.channels.cache.find(c => c.name === "ticket-claim-log")
      ?.send(`🛠 ${member} claimed ${interaction.channel}`);

    interaction.reply("✅ Ticket claimed");
  }

  /* ================= Close ================= */

  if (interaction.isButton() && interaction.customId === "close") {

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId("close_reason")
      .setTitle("Uun System - Close Ticket");

    const input = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Reason for closing")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "close_reason") {

    const reason = interaction.fields.getTextInputValue("reason");

    const data = ticketData[interaction.channel.id];
    const duration = Math.floor((Date.now() - data.openedAt) / 60000);

    guild.channels.cache.find(c => c.name === "ticket-close-log")
      ?.send(`🔒 Ticket closed\nOwner: <@${data.owner}>\nClosed By: ${interaction.user}\nDuration: ${duration}m\nReason: ${reason}`);

    delete openTickets[data.owner];
    delete ticketData[interaction.channel.id];
    save();

    interaction.reply("🔒 Ticket closing...");

    setTimeout(() => {
      interaction.channel.delete().catch(()=>{});
    }, 4000);
  }
});

/* ================= Logs ================= */

const get = (g, n) => g.channels.cache.find(c => c.name === n);

client.on("guildMemberAdd", m => {
  get(m.guild, "member-join-log")?.send(`${m} joined`);
});

client.on("guildMemberRemove", m => {
  get(m.guild, "member-leave-log")?.send(`${m.user.tag} left`);
});

client.on("voiceStateUpdate", (o, n) => {
  const g = n.guild;
  const m = n.member;

  if (!o.channelId && n.channelId)
    get(g, "voice-join-log")?.send(`${m} joined ${n.channel.name}`);

  if (o.channelId && !n.channelId)
    get(g, "voice-leave-log")?.send(`${m} left ${o.channel.name}`);

  if (o.channelId && n.channelId && o.channelId !== n.channelId)
    get(g, "voice-move-log")?.send(`${m} moved voice channels`);
});

/* ================= Login ================= */

client.login(process.env.TOKEN);
