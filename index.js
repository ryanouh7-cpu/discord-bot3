// ================== UUN SYSTEM STABLE CLEAN ==================

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
  fs.writeFileSync("./tickets.json", JSON.stringify({ counter: 1, tickets: {} }));

let { counter, tickets } = JSON.parse(fs.readFileSync("./tickets.json"));

function save() {
  fs.writeFileSync("./tickets.json", JSON.stringify({ counter, tickets }, null, 2));
}

const getLog = (guild, name) =>
  guild.channels.cache.find(c => c.name === name);

const log = (channel, title, desc, color = "Blurple") => {
  if (!channel) return;
  channel.send({
    embeds: [new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(desc)
      .setTimestamp()]
  });
};

/* ================= READY ================= */

client.once("ready", () =>
  console.log("🔥 Uun System Stable Clean Online")
);

/* ================= SETUP ================= */

client.on("messageCreate", async message => {

  if (message.author.bot) return;

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

client.on("interactionCreate", async interaction => {

  if (!interaction.guild) return;
  const guild = interaction.guild;

  /* INSTALL */

  if (interaction.isButton() && interaction.customId === "install") {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    const cat = await guild.channels.create({
      name: "Uun Logs",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
    });

    const logs = [
      "member-join-log","member-leave-log",
      "voice-join-log","voice-leave-log","voice-move-log",
      "member-role-log","ban-log","timeout-log",
      "message-delete-log","ticket-open-log",
      "ticket-close-log","ticket-claim-log"
    ];

    for (const name of logs)
      await guild.channels.create({
        name, type: ChannelType.GuildText,
        parent: cat.id,
        permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
      });

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

    return interaction.reply({ content: "✅ Installed", ephemeral: true });
  }

  /* PANEL */

  if (interaction.isButton() && interaction.customId === "panel") {

    const embed = new EmbedBuilder()
      .setColor("DarkButNotBlack")
      .setTitle("Uun")
      .setDescription("اختر نوع التذكرة")
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_type")
      .setPlaceholder("اختر")
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

  /* CREATE TICKET */

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_type") {

    if (Object.values(tickets).find(t => t.owner === interaction.user.id))
      return interaction.reply({ content: "عندك تذكرة مفتوحة", ephemeral: true });

    const category = guild.channels.cache.find(c => c.name === "Uun Tickets");
    const id = String(counter++).padStart(4, "0");

    const channel = await guild.channels.create({
      name: `ticket-${id}`,
      type: ChannelType.GuildText,
      parent: category?.id,
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
      lastActivity: Date.now(),
      claimed: null
    };

    save();

    log(getLog(guild,"ticket-open-log"),
      "🎫 Ticket Opened",
      `👤 ${interaction.user}\n📂 ${interaction.values[0]}\n📍 ${channel}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("استلام").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("إغلاق").setStyle(ButtonStyle.Danger)
    );

    channel.send({
      content: `${interaction.user}`,
      embeds: [new EmbedBuilder()
        .setColor("Blurple")
        .setTitle("Uun System")
        .setDescription(`👤 ${interaction.user}\n📂 ${interaction.values[0]}\n🕒 <t:${Math.floor(Date.now()/1000)}:F>`)],
      components: [row]
    });

    return interaction.reply({ content: "تم إنشاء التذكرة", ephemeral: true });
  }

  /* CLAIM */

  if (interaction.isButton() && interaction.customId === "claim") {

    tickets[interaction.channel.id].claimed = interaction.user.id;
    save();

    log(getLog(guild,"ticket-claim-log"),
      "🛠 Ticket Claimed",
      `👤 ${interaction.user}\n📍 ${interaction.channel}`);

    return interaction.reply("تم الاستلام");
  }

  /* CLOSE */

  if (interaction.isButton() && interaction.customId === "close") {

    const modal = new ModalBuilder()
      .setCustomId("close_modal")
      .setTitle("Uun System");

    const reason = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("سبب الإغلاق")
      .setStyle(TextInputStyle.Paragraph);

    modal.addComponents(new ActionRowBuilder().addComponents(reason));
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "close_modal") {

    const data = tickets[interaction.channel.id];
    if (!data) return;

    const reason = interaction.fields.getTextInputValue("reason");

    log(getLog(guild,"ticket-close-log"),
      "🔒 Ticket Closed",
      `📍 ${interaction.channel}\n📝 ${reason}`);

    const feedback = getLog(guild,"uun-feedback");

    feedback?.send({
      embeds: [new EmbedBuilder()
        .setColor("Gold")
        .setTitle("⭐ Ticket Rating")
        .setDescription(`👤 <@${data.owner}>\n📂 ${data.type}`)],
      components: [new ActionRowBuilder().addComponents(
        [1,2,3,4,5].map(n =>
          new ButtonBuilder()
            .setCustomId(`rate_${interaction.channel.id}_${n}`)
            .setLabel(`${n}⭐`)
            .setStyle(ButtonStyle.Secondary)
        )
      )]
    });

    delete tickets[interaction.channel.id];
    save();

    interaction.reply("جارٍ الإغلاق...");
    setTimeout(()=>interaction.channel.delete().catch(()=>{}),4000);
  }

  /* RATING */

  if (interaction.isButton() && interaction.customId.startsWith("rate_")) {

    const [ , channelId, rating ] = interaction.customId.split("_");

    log(getLog(guild,"uun-feedback"),
      "⭐ New Rating",
      `📍 <#${channelId}>\n⭐ ${rating}/5\n👤 ${interaction.user}`,
      "Gold");

    return interaction.reply({ content: "شكراً لتقييمك ❤️", ephemeral: true });
  }

});

/* ================= AUTO CLOSE ================= */

setInterval(() => {

  const now = Date.now();
  const limit = 6 * 60 * 60 * 1000;

  for (const id in tickets) {
    const t = tickets[id];
    if (!t.claimed && now - t.lastActivity > limit) {
      const channel = client.channels.cache.get(id);
      if (channel) {
        log(getLog(channel.guild,"ticket-close-log"),
          "⏰ Auto Closed",
          `📍 ${channel}`);
        channel.delete().catch(()=>{});
      }
      delete tickets[id];
      save();
    }
  }

}, 60000);

/* ================= OTHER LOGS ================= */

client.on("guildMemberAdd", m =>
  log(getLog(m.guild,"member-join-log"),
    "🟢 Member Joined", `${m}`,"Green"));

client.on("guildMemberRemove", m =>
  log(getLog(m.guild,"member-leave-log"),
    "🔴 Member Left", `${m.user.tag}`,"Red"));

client.on("voiceStateUpdate", (o,n) => {
  if (!o.channel && n.channel)
    log(getLog(n.guild,"voice-join-log"),
      "🎙 Voice Join", `${n.member} → ${n.channel}`);
  if (o.channel && !n.channel)
    log(getLog(n.guild,"voice-leave-log"),
      "📤 Voice Leave", `${n.member} ← ${o.channel}`);
  if (o.channel && n.channel && o.channel.id !== n.channel.id)
    log(getLog(n.guild,"voice-move-log"),
      "🔁 Voice Move", `${n.member}`);
});

client.on("guildMemberUpdate", async (o,n) => {

  const added = n.roles.cache.filter(r=>!o.roles.cache.has(r.id));
  const removed = o.roles.cache.filter(r=>!n.roles.cache.has(r.id));

  for (const r of added.values())
    log(getLog(n.guild,"member-role-log"),
      "➕ Role Added", `${n} → ${r}`);

  for (const r of removed.values())
    log(getLog(n.guild,"member-role-log"),
      "➖ Role Removed", `${n} → ${r}`);

  if (!o.communicationDisabledUntil && n.communicationDisabledUntil)
    log(getLog(n.guild,"timeout-log"),
      "⏳ Timeout", `${n}`,"Orange");
});

client.on("guildBanAdd", ban =>
  log(getLog(ban.guild,"ban-log"),
    "🚫 Banned", `${ban.user}`,"DarkRed"));

client.on("messageDelete", msg => {
  if (!msg.guild || msg.author?.bot) return;
  log(getLog(msg.guild,"message-delete-log"),
    "🗑 Message Deleted",
    `👤 ${msg.author}\n📍 ${msg.channel}\n💬 ${msg.content || "No Text"}`,
    "Grey");
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
