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
  console.log("🔥 Uun System Online (Private Mode)");
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

    message.reply({ content: "Uun Control Panel", components: [row] });
  }
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async (interaction) => {

  const guild = interaction.guild;
  const member = interaction.member;

  /* ================= BUTTONS ================= */

  if (interaction.isButton()) {

    /* ===== INSTALL ===== */

    if (interaction.customId === "install") {

      if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ content: "Admin only", ephemeral: true });

      // Logs Category (Private)
      const logsCat = await guild.channels.create({
        name: "Uun Logs",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
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
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });
      }

      // Feedback (Private)
      await guild.channels.create({
        name: "uun-feedback",
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      // Tickets Category (Private)
      await guild.channels.create({
        name: "Uun Tickets",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      interaction.reply({ content: "✅ System Installed (Private)", ephemeral: true });
    }

    /* ===== DELETE ===== */

    if (interaction.customId === "delete") {
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

    /* ===== SEND PANEL ===== */

    if (interaction.customId === "panel") {

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("Uun")
        .setDescription("اختر نوع التذكرة")
        .setTimestamp();

      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_type")
        .setPlaceholder("اختر نوع التذكرة")
        .addOptions(
          { label: "استفسار", value: "استفسار" },
          { label: "شكوى", value: "شكوى" }
        );

      const row = new ActionRowBuilder().addComponents(menu);

      interaction.channel.send({ embeds: [embed], components: [row] });
      interaction.reply({ content: "Panel Sent", ephemeral: true });
    }

    /* ===== CLAIM ===== */

    if (interaction.customId === "claim") {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ content: "Admin only", ephemeral: true });

      tickets[interaction.channel.id].claimed = member.id;
      save();

      guild.channels.cache.find(c => c.name === "ticket-claim-log")
        ?.send(`🛠 ${member} claimed ${interaction.channel.name}`);

      interaction.reply("Ticket Claimed");
    }

    /* ===== MANAGE ===== */

    if (interaction.customId === "manage") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("notify").setLabel("Notify Owner").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("unclaim").setLabel("Unclaim").setStyle(ButtonStyle.Secondary)
      );

      interaction.reply({ content: "Manage Options", components: [row], ephemeral: true });
    }

    /* ===== CLOSE ===== */

    if (interaction.customId === "close") {

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

    /* ===== RATING ===== */

    if (interaction.customId.startsWith("rate_")) {

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

      interaction.reply({ content: "Thanks for rating!", ephemeral: true });
    }
  }

  /* ================= SELECT MENU ================= */

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_type") {

    if (Object.values(tickets).find(t => t.owner === interaction.user.id))
      return interaction.reply({ content: "You already have a ticket", ephemeral: true });

    const category = guild.channels.cache.find(c => c.name === "Uun Tickets");

    const channel = await guild.channels.create({
      name: `ticket-${counter++}`,
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
      ?.send(`🎫 ${interaction.user} opened ${channel.name}`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("manage").setLabel("Manage").setStyle(ButtonStyle.Secondary)
    );

    channel.send({ content: `${interaction.user}`, components: [row] });

    interaction.reply({ content: "Ticket Created", ephemeral: true });
  }

  /* ================= CLOSE MODAL ================= */

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
      owner.send({ content: "⭐ Rate your experience:", components: [row] }).catch(()=>{});
    }

    delete tickets[interaction.channel.id];
    save();

    interaction.reply("Closing...");
    setTimeout(() => interaction.channel.delete().catch(()=>{}), 4000);
  }

});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
