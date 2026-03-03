const {
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = (client) => {

  client.on("messageCreate", async (message) => {
    if (message.content !== "!setup") return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("install").setLabel("Install").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Danger)
    );

    message.reply({ content: "Choose:", components: [row] });
  });

  client.on("interactionCreate", async (i) => {
    if (!i.isButton()) return;
    if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return i.reply({ content: "Admin only", ephemeral: true });

    if (i.customId === "install") {
      await install(i.guild);
      i.reply({ content: "Installed", ephemeral: true });
    }

    if (i.customId === "delete") {
      i.guild.channels.cache.forEach(c => {
        if (c.name.includes("Uun") || c.name.includes("log") || c.name.includes("دعم"))
          c.delete().catch(()=>{});
      });
      i.reply({ content: "Deleted", ephemeral: true });
    }
  });

  async function install(guild) {

    const logs = await guild.channels.create({ name: "Uun Logs", type: ChannelType.GuildCategory });

    const names = [
      "member-join-log","member-leave-log","username-change-log",
      "voice-join-log","voice-leave-log","voice-move-log",
      "voice-mute-log","voice-deafen-log",
      "role-add-log","role-remove-log",
      "message-delete-log","message-edit-log",
      "ticket-open-log","ticket-close-log","ticket-claim-log"
    ];

    for (const n of names)
      await guild.channels.create({ name: n, type: ChannelType.GuildText, parent: logs.id });

    await guild.channels.create({ name: "Uun Tickets", type: ChannelType.GuildCategory });

    const support = await guild.channels.create({ name: "Uun Support", type: ChannelType.GuildCategory });

    await guild.channels.create({ name: "قاعة الانتظار", type: ChannelType.GuildVoice, parent: support.id });

    for (let i = 1; i <= 3; i++) {
      await guild.channels.create({
        name: `دعم فني ${i}`,
        type: ChannelType.GuildVoice,
        parent: support.id,
        permissionOverwrites: [
          { id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.Connect] }
        ]
      });
    }
  }

};
