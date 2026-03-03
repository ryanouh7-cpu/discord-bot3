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

const CATEGORY_ID = "1432421974159790283";
const SUPPORT_ROLES = [
  "1423467608967090186",
  "1423446372409151538",
  "1423440712518733957"
];

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= SETUP PANEL ================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!setup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only.");

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🎟️ Support Center")
      .setDescription("Click the button below to create a ticket.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Create Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ================= INTERACTIONS ================= */
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    /* ===== CREATE TICKET ===== */
    if (interaction.customId === "create_ticket") {
      const existing = interaction.guild.channels.cache.find(
        c => c.name === `ticket-${interaction.user.id}`
      );
      if (existing)
        return interaction.reply({ content: "❌ You already have a ticket.", ephemeral: true });

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
        name: `ticket-${interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: overwrites
      });

      const infoEmbed = new EmbedBuilder()
        .setColor(0x00ff99)
        .setTitle("📋 Ticket Information")
        .addFields(
          { name: "Owner", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Ticket ID", value: channel.id, inline: true },
          { name: "Created", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
        );

      const optionsRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("ticket_options")
          .setPlaceholder("Ticket Options")
          .addOptions([
            { label: "Close Ticket", value: "close", emoji: "🔒" },
            { label: "Add User", value: "add", emoji: "➕" },
            { label: "Transcript", value: "transcript", emoji: "📄" }
          ])
      );

      await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [infoEmbed],
        components: [optionsRow]
      });

      interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    }
  }

  /* ===== SELECT MENU ===== */
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket_options") {
      const choice = interaction.values[0];

      /* ---- CLOSE ---- */
      if (choice === "close") {
        const modal = new ModalBuilder()
          .setCustomId("close_modal")
          .setTitle("Close Ticket");

        const reasonInput = new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("Reason for closing")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return interaction.showModal(modal);
      }

      /* ---- ADD USER ---- */
      if (choice === "add") {
        const modal = new ModalBuilder()
          .setCustomId("add_modal")
          .setTitle("Add User to Ticket");

        const userInput = new TextInputBuilder()
          .setCustomId("user_id")
          .setLabel("Enter User ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(userInput));
        return interaction.showModal(modal);
      }

      /* ---- TRANSCRIPT ---- */
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
  }

  /* ===== MODALS ===== */
  if (interaction.isModalSubmit()) {

    /* ---- CLOSE CONFIRM ---- */
    if (interaction.customId === "close_modal") {
      const reason = interaction.fields.getTextInputValue("reason");
      await interaction.reply(`🔒 Closing ticket...\nReason: ${reason}`);
      setTimeout(() => interaction.channel.delete(), 3000);
    }

    /* ---- ADD USER CONFIRM ---- */
    if (interaction.customId === "add_modal") {
      const userId = interaction.fields.getTextInputValue("user_id");

      await interaction.channel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true
      });

      interaction.reply(`➕ User added to ticket.`);
    }
  }
});

client.login(TOKEN);
