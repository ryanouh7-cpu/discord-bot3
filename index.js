// ================== UUN SYSTEM V5 ULTIMATE STABLE ==================

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
  TextInputStyle,
  AuditLogEvent
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

/* ================= DATABASE ================= */

if (!fs.existsSync("./tickets.json"))
  fs.writeFileSync("./tickets.json", JSON.stringify({}));

let db = JSON.parse(fs.readFileSync("./tickets.json"));
let counter = db.counter || 1;
let tickets = db.tickets || {};

function save() {
  fs.writeFileSync("./tickets.json", JSON.stringify({ counter, tickets }, null, 2));
}

function getLog(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

function sendLog(channel, title, description, color) {
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
  channel.send({ embeds: [embed] });
}

/* ================= READY ================= */

client.once("ready", () => {
  console.log("🔥 Uun System Ultimate Stable Online");
});

/* ================= MESSAGE ================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // تحديث النشاط داخل التذكرة
  if (tickets[message.channel.id]) {
    tickets[message.channel.id].lastActivity = Date.now();
    save();
  }

  if (message.content === "!setup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("install").setLabel("Install").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("panel").setLabel("Send Ticket Panel").setStyle(ButtonStyle.Primary)
    );

    message.reply({ content: "🔧 Uun Control Panel", components: [row] });
  }
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async (interaction) => {

  if (!interaction.guild) return;

  const guild = interaction.guild;
  const member = interaction.member;

  /* ===== INSTALL ===== */

  if (interaction.isButton() && interaction.customId === "install") {

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    const logsCat = await guild.channels.create({
      name: "Uun Logs",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
    });

    const logChannels = [
      "member-join-log",
      "member-leave-log",
      "voice-join-log",
      "voice-leave-log",
      "voice-move-log",
      "member-role-log",
      "ticket-open-log",
      "ticket-close-log",
      "ticket-claim-log"
    ];

    for (const name of logChannels) {
      await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: logsCat.id,
        permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
      });
    }

    await guild.channels.create({
      name: "uun-feedback",
      type: ChannelType.GuildText,
      permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
    });

    await guild.channels.create({
      name: "Uun Tickets",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
    });

    return interaction.reply({ content: "✅ System Installed", ephemeral: true });
  }

  /* ===== DELETE ===== */

  if (interaction.isButton() && interaction.customId === "delete") {
    guild.channels.cache.forEach(c => {
      if (
        c.name.includes("Uun") ||
        c.name.includes("log") ||
        c.name.includes("ticket") ||
        c.name.includes("feedback")
      ) c.delete().catch(()=>{});
    });
    return interaction.reply({ content: "🗑 System Deleted", ephemeral: true });
  }

  /* ===== PANEL ===== */

  if (interaction.isButton() && interaction.customId === "panel") {

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("Uun")
      .setDescription("اختر نوع التذكرة من القائمة")
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_type")
      .setPlaceholder("اختر نوع التذكرة")
      .addOptions(
        { label: "استفسار", value: "استفسار" },
        { label: "شكوى", value: "شكوى" },
        { label: "دعم فني", value: "دعم فني" }
      );

    interaction.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)]
    });

    return interaction.reply({ content: "Panel Sent", ephemeral: true });
  }

  /* ===== CREATE TICKET ===== */

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_type") {

    if (Object.values(tickets).find(t => t.owner === interaction.user.id))
      return interaction.reply({ content: "لديك تذكرة مفتوحة بالفعل", ephemeral: true });

    const category = guild.channels.cache.find(c => c.name === "Uun Tickets");
    const ticketNumber = String(counter++).padStart(4, "0");

    const channel = await guild.channels.create({
      name: `ticket-${ticketNumber}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    tickets[channel.id] = {
      owner: interaction.user.id,
      type: interaction.values[0],
      created: Date.now(),
      claimed: null,
      lastActivity: Date.now()
    };

    save();

    sendLog(getLog(guild, "ticket-open-log"),
      "🎫 Ticket Opened",
      `${interaction.user} opened ${channel}`,
      "Blue"
    );

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Uun System")
      .addFields(
        { name: "👤 صاحب التذكرة", value: `<@${interaction.user.id}>`, inline: true },
        { name: "📂 النوع", value: interaction.values[0], inline: true },
        { name: "🕒 وقت الفتح", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("استلام").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("إغلاق").setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });

    return interaction.reply({ content: "✅ تم إنشاء التذكرة", ephemeral: true });
  }

  /* ===== CLAIM ===== */

  if (interaction.isButton() && interaction.customId === "claim") {

    tickets[interaction.channel.id].claimed = interaction.user.id;
    save();

    sendLog(getLog(guild, "ticket-claim-log"),
      "🛠 Ticket Claimed",
      `${interaction.user} claimed ${interaction.channel}`,
      "Green"
    );

    return interaction.reply({ content: "تم استلام التذكرة" });
  }

  /* ===== CLOSE ===== */

  if (interaction.isButton() && interaction.customId === "close") {

    const modal = new ModalBuilder()
      .setCustomId("close_modal")
      .setTitle("Uun System");

    const reason = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("سبب الإغلاق")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reason));
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "close_modal") {

    const reason = interaction.fields.getTextInputValue("reason");
    const data = tickets[interaction.channel.id];
    if (!data) return;

    sendLog(getLog(guild, "ticket-close-log"),
      "🔒 Ticket Closed",
      `${interaction.channel} closed\nReason: ${reason}`,
      "Red"
    );

    const feedback = getLog(guild, "uun-feedback");

    const rateRow = new ActionRowBuilder().addComponents(
      [1,2,3,4,5].map(n =>
        new ButtonBuilder()
          .setCustomId(`rate_${n}_${interaction.channel.id}`)
          .setLabel(`${n}⭐`)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    feedback?.send({
      content: `📊 تقييم تذكرة ${interaction.channel.name}`,
      components: [rateRow]
    });

    delete tickets[interaction.channel.id];
    save();

    interaction.reply("جارٍ الإغلاق...");
    setTimeout(() => interaction.channel.delete().catch(()=>{}), 4000);
  }

  /* ===== RATING ===== */

  if (interaction.isButton() && interaction.customId.startsWith("rate_")) {

    const parts = interaction.customId.split("_");
    const rating = parts[1];
    const channelId = parts[2];

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("⭐ New Ticket Rating")
      .setDescription(`${interaction.user} rated ticket <#${channelId}>`)
      .addFields({ name: "Rating", value: `${rating}/5` })
      .setTimestamp();

    interaction.update({ content: "✅ تم تسجيل تقييمك", components: [] });

    getLog(guild, "uun-feedback")?.send({ embeds: [embed] });
  }

});

/* ================= MEMBER LOGS ================= */

client.on("guildMemberAdd", member => {
  sendLog(getLog(member.guild,"member-join-log"),
    "🟢 Member Joined",
    `${member} joined the server`,
    "Green");
});

client.on("guildMemberRemove", member => {
  sendLog(getLog(member.guild,"member-leave-log"),
    "🔴 Member Left",
    `${member.user.tag} left the server`,
    "Red");
});

/* ================= VOICE LOGS ================= */

client.on("voiceStateUpdate", (oldState, newState) => {

  const guild = newState.guild;

  if (!oldState.channelId && newState.channelId)
    sendLog(getLog(guild,"voice-join-log"),
      "🎙 Voice Join",
      `${newState.member} joined ${newState.channel}`,
      "Blue");

  if (oldState.channelId && !newState.channelId)
    sendLog(getLog(guild,"voice-leave-log"),
      "📤 Voice Leave",
      `${oldState.member} left <#${oldState.channelId}>`,
      "Orange");

  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId)
    sendLog(getLog(guild,"voice-move-log"),
      "🔁 Voice Move",
      `${newState.member} moved from <#${oldState.channelId}> to ${newState.channel}`,
      "Purple");
});

/* ================= ROLE LOGS ================= */

client.on("guildMemberUpdate", async (oldMember, newMember) => {

  const logChannel = getLog(newMember.guild,"member-role-log");
  if (!logChannel) return;

  const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  const audit = await newMember.guild.fetchAuditLogs({
    limit:1,
    type:AuditLogEvent.MemberRoleUpdate
  }).catch(()=>null);

  let executor = "Unknown";
  if (audit?.entries.first())
    executor = audit.entries.first().executor;

  for (const role of added.values())
    sendLog(logChannel,"➕ Role Added",`${role} added to ${newMember} by ${executor}`,"Green");

  for (const role of removed.values())
    sendLog(logChannel,"➖ Role Removed",`${role} removed from ${newMember} by ${executor}`,"Red");
});

/* ================= AUTO CLOSE ================= */

const AUTO_CLOSE_TIME = 6 * 60 * 60 * 1000;

setInterval(async () => {

  for (const channelId in tickets) {

    const data = tickets[channelId];
    if (!data) continue;
    if (data.claimed) continue;

    if (Date.now() - data.lastActivity >= AUTO_CLOSE_TIME) {

      const channel = client.channels.cache.get(channelId);
      if (!channel) continue;

      sendLog(getLog(channel.guild,"ticket-close-log"),
        "⏳ Auto Close",
        `${channel} closed بسبب عدم النشاط 6 ساعات`,
        "Orange"
      );

      delete tickets[channelId];
      save();

      channel.delete().catch(()=>{});
    }
  }

},60000);

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
