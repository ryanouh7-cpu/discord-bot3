const {
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

module.exports = (client) => {

let ticketCounter = 1;
const openTickets = new Map();
const ticketOwners = new Map();
const ticketTimers = new Map();

/* ===== Panel Command ===== */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!panel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_type")
      .setPlaceholder("اختر نوع التذكرة")
      .addOptions([
        { label: "استفسار", value: "استفسار" },
        { label: "شكوى", value: "شكوى" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🎟️ Uun Ticket System")
      .setDescription("اختر نوع التذكرة من القائمة بالأسفل");

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ===== Interactions ===== */

client.on("interactionCreate", async (interaction) => {

  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "ticket_type") {

      if (openTickets.has(interaction.user.id))
        return interaction.reply({ content: "❌ لديك تذكرة مفتوحة بالفعل.", ephemeral: true });

      const type = interaction.values[0];
      const number = String(ticketCounter).padStart(4, "0");
      ticketCounter++;

      let category = interaction.guild.channels.cache.find(c => c.name === "Uun Tickets");

      if (!category) {
        category = await interaction.guild.channels.create({
          name: "Uun Tickets",
          type: ChannelType.GuildCategory
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `ticket-${number}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      openTickets.set(interaction.user.id, channel.id);
      ticketOwners.set(channel.id, interaction.user.id);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("claim_ticket")
          .setLabel("📌 استلام")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("🔒 إغلاق")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(0x00aeff)
            .setTitle(`🎟️ ${type}`)
            .setDescription("سيتم مساعدتك قريباً.")
        ],
        components: [row]
      });

      interaction.reply({ content: `✅ تم إنشاء ${channel}`, ephemeral: true });

      startTicketTimer(channel);
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId === "claim_ticket") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ content: "❌ للأدمن فقط.", ephemeral: true });

      interaction.reply("📌 تم استلام التذكرة.");
    }

    if (interaction.customId === "close_ticket") {
      closeTicket(interaction.channel);
    }
  }
});

/* ===== Timers ===== */

function startTicketTimer(channel) {

  const ownerId = ticketOwners.get(channel.id);

  const warn = setTimeout(() => {
    channel.send(`🔔 <@${ownerId}> سيتم الإغلاق خلال ساعة.`);
  }, 9 * 60 * 60 * 1000);

  const close = setTimeout(() => {
    closeTicket(channel);
  }, 10 * 60 * 60 * 1000);

  ticketTimers.set(channel.id, { warn, close });
}

async function closeTicket(channel) {

  const ownerId = ticketOwners.get(channel.id);
  if (!ownerId) return;

  openTickets.delete(ownerId);
  ticketOwners.delete(channel.id);

  const timers = ticketTimers.get(channel.id);
  if (timers) {
    clearTimeout(timers.warn);
    clearTimeout(timers.close);
  }

  setTimeout(() => channel.delete().catch(() => {}), 3000);
}

};
