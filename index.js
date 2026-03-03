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

/* ================== تحميل بيانات التكت ================== */

let data = {};
if (fs.existsSync("./tickets.json")) {
  data = JSON.parse(fs.readFileSync("./tickets.json"));
}

let counter = data.counter || 1;
let openTickets = data.open || {};

function save() {
  fs.writeFileSync(
    "./tickets.json",
    JSON.stringify({ counter, open: openTickets }, null, 2)
  );
}

/* ================== Ready ================== */

client.once("ready", () => {
  console.log("✅ Uun System Fully Loaded");
});

/* ================== Setup + Panel ================== */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!setup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("install")
        .setLabel("Install")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("delete")
        .setLabel("Delete")
        .setStyle(ButtonStyle.Danger)
    );

    return message.reply({ content: "Choose:", components: [row] });
  }

  if (message.content === "!ticket-panel") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("🎫 فتح تذكرة")
        .setStyle(ButtonStyle.Primary)
    );

    return message.channel.send({
      content: "اضغط الزر لفتح تذكرة",
      components: [row]
    });
  }
});

/* ================== Buttons ================== */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const guild = interaction.guild;
  const member = interaction.member;

  /* ===== Install ===== */

  if (interaction.customId === "install") {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    let logs = guild.channels.cache.find(c => c.name === "Uun Logs");
    if (!logs)
      logs = await guild.channels.create({
        name: "Uun Logs",
        type: ChannelType.GuildCategory
      });

    const logNames = [
      "member-join-log",
      "member-leave-log",
      "voice-join-log",
      "voice-leave-log",
      "voice-move-log",
      "ticket-open-log",
      "ticket-close-log",
      "ticket-claim-log"
    ];

    for (const name of logNames) {
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

    interaction.reply({ content: "✅ Installed", ephemeral: true });
  }

  /* ===== Delete ===== */

  if (interaction.customId === "delete") {
    guild.channels.cache.forEach(c => {
      if (c.name.includes("Uun") || c.name.includes("log"))
        c.delete().catch(() => {});
    });

    interaction.reply({ content: "🗑 Deleted", ephemeral: true });
  }

  /* ===== Open Ticket ===== */

  if (interaction.customId === "open_ticket") {
    if (openTickets[member.id])
      return interaction.reply({
        content: "❌ عندك تذكرة مفتوحة بالفعل",
        ephemeral: true
      });

    const category = guild.channels.cache.find(
      c => c.name === "Uun Tickets"
    );

    if (!category)
      return interaction.reply({
        content: "❌ نظام التذاكر غير مثبت",
        ephemeral: true
      });

    const channel = await guild.channels.create({
      name: `ticket-${counter++}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: member.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });

    openTickets[member.id] = channel.id;
    save();

    guild.channels.cache.find(c => c.name === "ticket-open-log")
      ?.send(`🎫 ${member} opened ${channel}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim")
        .setLabel("استلام")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("close")
        .setLabel("إغلاق")
        .setStyle(ButtonStyle.Danger)
    );

    channel.send({
      content: `${member}`,
      components: [row]
    });

    interaction.reply({ content: "✅ تم إنشاء التذكرة", ephemeral: true });
  }

  /* ===== Claim ===== */

  if (interaction.customId === "claim") {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    guild.channels.cache.find(c => c.name === "ticket-claim-log")
      ?.send(`🛠 ${member} claimed ${interaction.channel}`);

    interaction.reply("✅ تم الاستلام");
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

    interaction.channel.send("⭐ شكراً لاستخدامك الدعم");

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
