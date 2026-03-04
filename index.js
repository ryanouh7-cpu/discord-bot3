const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
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
    GatewayIntentBits.MessageContent
  ]
});

/* ================= Database ================= */

if (!fs.existsSync("./tickets.json"))
  fs.writeFileSync("./tickets.json", JSON.stringify({}));

let db = JSON.parse(fs.readFileSync("./tickets.json"));

let counter = db.counter || 1;
let openTickets = db.open || {};      // userId -> channelId
let ticketData = db.data || {};      // channelId -> { ownerId, type, createdAt, claimedBy, warned }
let ratings = db.ratings || {};      // channelId -> rating

function save() {
  fs.writeFileSync(
    "./tickets.json",
    JSON.stringify({ counter, open: openTickets, data: ticketData, ratings }, null, 2)
  );
}

/* ================= Ready ================= */

client.once("ready", () => {
  console.log("🔥 Uun System V4 ELITE Online");
});

/* ================= Setup ================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!setup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    // Ensure category
    if (!message.guild.channels.cache.find(c => c.name === "Uun Tickets")) {
      await message.guild.channels.create({
        name: "Uun Tickets",
        type: ChannelType.GuildCategory
      });
    }

    // Ensure logs & feedback
    if (!message.guild.channels.cache.find(c => c.name === "uun-logs")) {
      await message.guild.channels.create({
        name: "uun-logs",
        type: ChannelType.GuildText
      });
    }

    if (!message.guild.channels.cache.find(c => c.name === "uun-feedback")) {
      await message.guild.channels.create({
        name: "uun-feedback",
        type: ChannelType.GuildText
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("send_panel").setLabel("🎫 Send Ticket Panel").setStyle(ButtonStyle.Primary)
    );

    message.reply({ content: "Uun System Control", components: [row] });
  }
});

/* ================= Auto Close Checker ================= */

setInterval(async () => {
  const now = Date.now();

  for (const channelId in ticketData) {
    const data = ticketData[channelId];
    const channel = client.channels.cache.get(channelId);
    if (!channel) continue;

    const inactiveTime = now - data.lastActivity;

    // 5 hours warning (1 hour before close)
    if (!data.warned && inactiveTime >= 5 * 60 * 60 * 1000) {
      channel.send(`<@${data.ownerId}> 🔔 This ticket will close in 1 hour due to inactivity.`);
      data.warned = true;
      save();
    }

    // 6 hours close
    if (inactiveTime >= 6 * 60 * 60 * 1000) {
      await closeTicket(channel, "Auto closed due to inactivity");
    }
  }

}, 60 * 1000);

/* ================= Interactions ================= */

client.on("interactionCreate", async (interaction) => {

/* ===== Send Panel ===== */

  if (interaction.isButton() && interaction.customId === "send_panel") {

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("Uun System")
      .setDescription("Select ticket type below")
      .setFooter({ text: "Professional Support System" })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_type")
      .setPlaceholder("Choose ticket type")
      .addOptions(
        { label: "استفسار", value: "استفسار" },
        { label: "شكوى", value: "شكوى" }
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: "Panel Sent", ephemeral: true });
  }

/* ===== Choose Type ===== */

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_type") {

    if (openTickets[interaction.user.id])
      return interaction.reply({ content: "You already have an open ticket.", ephemeral: true });

    const category = interaction.guild.channels.cache.find(c => c.name === "Uun Tickets");
    if (!category)
      return interaction.reply({ content: "Ticket category missing.", ephemeral: true });

    const ticketNumber = String(counter++).padStart(4, "0");
    const type = interaction.values[0];

    const channel = await interaction.guild.channels.create({
      name: `ticket-${ticketNumber}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    openTickets[interaction.user.id] = channel.id;
    ticketData[channel.id] = {
      ownerId: interaction.user.id,
      type,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      claimedBy: null,
      warned: false
    };

    save();

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("Uun System")
      .addFields(
        { name: "Owner", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Type", value: type, inline: true },
        { name: "Created", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
      )
      .setFooter({ text: `Ticket #${ticketNumber}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("🛠 Claim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("🔒 Close").setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });

    interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  }

/* ===== Claim ===== */

  if (interaction.isButton() && interaction.customId === "claim") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    ticketData[interaction.channel.id].claimedBy = interaction.user.id;
    save();

    interaction.reply("Ticket claimed.");
  }

/* ===== Close Button ===== */

  if (interaction.isButton() && interaction.customId === "close") {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId("close_modal")
      .setTitle("Close Ticket");

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Reason")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "close_modal") {
    const reason = interaction.fields.getTextInputValue("reason");
    await closeTicket(interaction.channel, reason);
    interaction.reply("Ticket closed.");
  }

/* ===== Rating ===== */

  if (interaction.isButton() && interaction.customId.startsWith("rate_")) {

    const rating = interaction.customId.split("_")[1];
    const channelId = interaction.message.embeds[0].footer.text;

    ratings[channelId] = rating;
    save();

    const feedbackChannel = interaction.guild.channels.cache.find(c => c.name === "uun-feedback");

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle("Uun System - Rating")
      .setDescription(`⭐ Rating: ${rating}/5`)
      .setTimestamp();

    feedbackChannel.send({ embeds: [embed] });

    interaction.reply({ content: "Thanks for your feedback!", ephemeral: true });
  }

});

/* ================= Close Function ================= */

async function closeTicket(channel, reason) {

  const data = ticketData[channel.id];
  if (!data) return;

  const duration = Math.floor((Date.now() - data.createdAt) / 60000);

  const logs = channel.guild.channels.cache.find(c => c.name === "uun-logs");

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("Uun System - Ticket Closed")
    .addFields(
      { name: "Owner", value: `<@${data.ownerId}>`, inline: true },
      { name: "Type", value: data.type, inline: true },
      { name: "Claimed By", value: data.claimedBy ? `<@${data.claimedBy}>` : "None", inline: true },
      { name: "Duration", value: `${duration} minutes` },
      { name: "Reason", value: reason }
    )
    .setTimestamp();

  logs.send({ embeds: [embed] });

  try {
    const user = await client.users.fetch(data.ownerId);

    const row = new ActionRowBuilder().addComponents(
      ...[1,2,3,4,5].map(num =>
        new ButtonBuilder()
          .setCustomId(`rate_${num}`)
          .setLabel(`${num}⭐`)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    user.send({
      content: "Please rate your support experience:",
      embeds: [embed.setColor("Blue").setTitle("Uun System - Rate Support")],
      components: [row]
    });

  } catch {}

  delete openTickets[data.ownerId];
  delete ticketData[channel.id];
  save();

  setTimeout(() => channel.delete().catch(()=>{}), 4000);
}

/* ================= Activity Tracking ================= */

client.on("messageCreate", (msg) => {
  if (msg.channel.id in ticketData) {
    ticketData[msg.channel.id].lastActivity = Date.now();
    save();
  }
});

/* ================= Login ================= */

client.login(process.env.TOKEN);
