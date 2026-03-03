const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

/* ================== الإعدادات ================== */

const CATEGORY_ID = "1432421974159790283";

const SUPPORT_ROLES = [
  "1423467608967090186",
  "1423446372409151538",
  "1423440712518733957"
];

/* ================== عداد التذاكر ================== */

const COUNTER_FILE = "./counter.json";

if (!fs.existsSync(COUNTER_FILE)) {
  fs.writeFileSync(COUNTER_FILE, JSON.stringify({ number: 35 }));
}

function getNextTicketNumber() {
  const data = JSON.parse(fs.readFileSync(COUNTER_FILE));
  const current = data.number;
  data.number++;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data));
  return current;
}

/* ================== تشغيل البوت ================== */

client.once("ready", () => {
  console.log(`تم تشغيل البوت ${client.user.tag}`);
});

/* ================== لوحة فتح التذاكر ================== */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!setup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("📩 نظام الدعم - 21 SYSTEM")
      .setDescription("اختر نوع التذكرة من الأزرار بالأسفل");

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("طلب_مصور")
        .setLabel("طلب مصور")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("استفسار")
        .setLabel("تكت استفسار")
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("اعلان_صوتي")
        .setLabel("طلب تصميم إعلان صوتي")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("تسجيل_دخول")
        .setLabel("طلب تصميم تسجيل دخول")
        .setStyle(ButtonStyle.Danger)
    );

    message.channel.send({ embeds: [embed], components: [row1, row2] });
  }
});

/* ================== التفاعلات ================== */

client.on("interactionCreate", async (interaction) => {

  /* ========= إنشاء تذكرة ========= */

  if (interaction.isButton()) {

    const type = interaction.customId;

    const existing = interaction.guild.channels.cache.find(
      c => c.topic === `ticket-owner-${interaction.user.id}`
    );

    if (existing)
      return interaction.reply({ content: "❌ لديك تذكرة مفتوحة بالفعل.", ephemeral: true });

    const ticketNumber = getNextTicketNumber();

    const overwrites = [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
      }
    ];

    SUPPORT_ROLES.forEach(roleId => {
      overwrites.push({
        id: roleId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
      });
    });

    const channel = await interaction.guild.channels.create({
      name: `ticket-${ticketNumber}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      topic: `ticket-owner-${interaction.user.id}`,
      permissionOverwrites: overwrites
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ff99)
      .setTitle("📋 معلومات التذكرة")
      .addFields(
        { name: "👤 مالك التذكرة", value: `<@${interaction.user.id}>`, inline: true },
        { name: "🎫 رقم التذكرة", value: `${ticketNumber}`, inline: true },
        { name: "📂 قسم التذكرة", value: type, inline: true },
        { name: "📅 تاريخ الإنشاء", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
      );

    const options = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("خيارات")
        .setPlaceholder("إدارة التذكرة")
        .addOptions([
          { label: "إغلاق التذكرة", value: "close", emoji: "🔒" },
          { label: "إضافة عضو", value: "add", emoji: "➕" },
          { label: "طلب نسخة من التذكرة", value: "transcript", emoji: "📄" }
        ])
    );

    await channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [options]
    });

    interaction.reply({ content: `✅ تم إنشاء تذكرتك: ${channel}`, ephemeral: true });
  }

  /* ========= خيارات التذكرة ========= */

  if (interaction.isStringSelectMenu()) {

    const choice = interaction.values[0];

    if (choice === "close") {
      await interaction.reply("🔒 سيتم إغلاق التذكرة خلال 3 ثواني...");
      setTimeout(() => interaction.channel.delete(), 3000);
    }

    if (choice === "add") {
      const modal = new ModalBuilder()
        .setCustomId("add_user")
        .setTitle("إضافة عضو");

      const input = new TextInputBuilder()
        .setCustomId("user_id")
        .setLabel("اكتب ID العضو")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (choice === "transcript") {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      let html = "<html><body>";
      sorted.forEach(m => {
        html += `<p><strong>${m.author.tag}:</strong> ${m.content}</p>`;
      });
      html += "</body></html>";

      fs.writeFileSync("transcript.html", html);

      await interaction.reply({ files: ["transcript.html"], ephemeral: true });
    }
  }

  /* ========= مودال إضافة عضو ========= */

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "add_user") {
      const userId = interaction.fields.getTextInputValue("user_id");

      await interaction.channel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true
      });

      interaction.reply("✅ تم إضافة العضو إلى التذكرة.");
    }
  }

});

client.login(TOKEN);
