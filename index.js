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

/* ================= READY ================= */

client.once("ready", () => {
  console.log("🔥 Uun System V5 Ultimate Online");
});

/* ================= COMMAND ================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

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

  const guild = interaction.guild;
  const member = interaction.member;

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

    interaction.reply({ content: "✅ System Installed", ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === "delete") {

    guild.channels.cache.forEach(c => {
      if (
        c.name.includes("Uun") ||
        c.name.includes("log") ||
        c.name.includes("ticket") ||
        c.name.includes("feedback")
      ) c.delete().catch(()=>{});
    });

    interaction.reply({ content: "🗑 System Deleted", ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === "panel") {

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("Uun")
      .setDescription("اختر نوع التذكرة من القائمة بالأسفل")
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

    interaction.reply({ content: "Panel Sent", ephemeral: true });
  }

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
      claimed: null
    };

    save();

    guild.channels.cache.find(c => c.name === "ticket-open-log")
      ?.send(`🎫 ${interaction.user.tag} opened ${channel.name}`);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Uun System")
      .addFields(
        { name: "👤 صاحب التذكرة", value: `<@${interaction.user.id}>`, inline: true },
        { name: "📂 نوع التذكرة", value: interaction.values[0], inline: true },
        { name: "🕒 وقت الفتح", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("استلام").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("إغلاق").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("manage").setLabel("إدارة").setStyle(ButtonStyle.Secondary)
    );

    channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [row]
    });

    interaction.reply({ content: "✅ تم إنشاء التذكرة", ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === "claim") {

    tickets[interaction.channel.id].claimed = interaction.user.id;
    save();

    guild.channels.cache.find(c => c.name === "ticket-claim-log")
      ?.send(`🛠 ${interaction.user.tag} claimed ${interaction.channel.name}`);

    interaction.reply("تم استلام التذكرة");
  }

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

    guild.channels.cache.find(c => c.name === "ticket-close-log")
      ?.send(`🔒 ${interaction.channel.name} closed | Reason: ${reason}`);

    const owner = await client.users.fetch(data.owner).catch(()=>null);

    if (owner) {
      const row = new ActionRowBuilder().addComponents(
        [1,2,3,4,5].map(n =>
          new ButtonBuilder()
            .setCustomId(`rate_${n}`)
            .setLabel(`${n}⭐`)
            .setStyle(ButtonStyle.Secondary)
        )
      );
      owner.send({ content: "⭐ قيّم تجربتك:", components: [row] }).catch(()=>{});
    }

    delete tickets[interaction.channel.id];
    save();

    interaction.reply("جارٍ الإغلاق...");
    setTimeout(() => interaction.channel.delete().catch(()=>{}), 4000);
  }

  if (interaction.isButton() && interaction.customId.startsWith("rate_")) {

    const rating = interaction.customId.split("_")[1];

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle("⭐ Ticket Rating")
      .addFields(
        { name: "User", value: `${interaction.user}`, inline: true },
        { name: "Rating", value: `${rating}/5`, inline: true }
      )
      .setTimestamp();

    guild.channels.cache.find(c => c.name === "uun-feedback")
      ?.send({ embeds: [embed] });

    interaction.reply({ content: "شكراً لتقييمك ❤️", ephemeral: true });
  }

});

/* ================= OTHER LOGS ================= */

function getLog(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

client.on("guildMemberAdd", member => {
  getLog(member.guild, "member-join-log")
    ?.send(`🟢 ${member.user.tag} joined`);
});

client.on("guildMemberRemove", member => {
  getLog(member.guild, "member-leave-log")
    ?.send(`🔴 ${member.user.tag} left`);
});

client.on("voiceStateUpdate", (oldState, newState) => {

  const guild = newState.guild;

  if (!oldState.channelId && newState.channelId)
    getLog(guild, "voice-join-log")
      ?.send(`🎙 ${newState.member.user.tag} joined ${newState.channel.name}`);

  if (oldState.channelId && !newState.channelId)
    getLog(guild, "voice-leave-log")
      ?.send(`📤 ${newState.member.user.tag} left ${oldState.channel.name}`);

  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId)
    getLog(guild, "voice-move-log")
      ?.send(`🔁 ${newState.member.user.tag} moved voice channels`);
});

/* ================= AUTO CLOSE (6 HOURS) ================= */

const AUTO_CLOSE_TIME = 6 * 60 * 60 * 1000;

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (tickets[message.channel.id]) {
    tickets[message.channel.id].lastActivity = Date.now();
    save();
  }
});

setInterval(async () => {

  for (const channelId in tickets) {

    const data = tickets[channelId];
    if (!data) continue;

    if (!data.lastActivity) {
      data.lastActivity = data.created || Date.now();
      save();
    }

    if (Date.now() - data.lastActivity >= AUTO_CLOSE_TIME) {

      const channel = client.channels.cache.get(channelId);
      if (!channel) continue;

      const guild = channel.guild;

      guild.channels.cache.find(c => c.name === "ticket-close-log")
        ?.send(`⏳ ${channel.name} Auto Closed (No activity 6 hours)`);

      const owner = await client.users.fetch(data.owner).catch(()=>null);

      if (owner) {
        const row = new ActionRowBuilder().addComponents(
          [1,2,3,4,5].map(n =>
            new ButtonBuilder()
              .setCustomId(`rate_${n}`)
              .setLabel(`${n}⭐`)
              .setStyle(ButtonStyle.Secondary)
          )
        );

        owner.send({
          content: "⏳ تم إغلاق التذكرة تلقائياً بسبب عدم النشاط (6 ساعات)\n⭐ قيّم تجربتك:",
          components: [row]
        }).catch(()=>{});
      }

      delete tickets[channelId];
      save();

      channel.delete().catch(()=>{});
    }
  }

}, 60000);

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
