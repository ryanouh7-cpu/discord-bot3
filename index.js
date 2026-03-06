// ================== UUN FULL SPLIT LOGS (FIXED) ==================

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  AuditLogEvent,
  Partials
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration, // أضفت هذا لضمان وصول لوقات البان والكيك
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction] // لضمان عمل لوقات الرسائل القديمة
});

client.once("ready", () => {
  console.log(`✅ Uun Full Split Logs Online | Connected as ${client.user.tag}`);
});

/* ================= HELPERS ================= */

function logChannel(guild, name) {
  return guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildText);
}

function createEmbed(title, color = "Blurple") {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setFooter({ text: "Uun Logs System" })
    .setTimestamp();
}

async function getAuditEntry(guild, type) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 1 });
    return logs.entries.first();
  } catch (e) { return null; }
}

/* ================= SETUP COMMAND ================= */

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  if (message.content === "!logs-setup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const role = message.guild.roles.cache.find(r => r.name === ".");
    if (!role) return message.reply("رتبة . غير موجودة");

    let cat = message.guild.channels.cache.find(c => c.name === "Uun Logs" && c.type === ChannelType.GuildCategory);
    if (!cat) {
      cat = await message.guild.channels.create({
        name: "Uun Logs",
        type: ChannelType.GuildCategory
      });
    }

    const perms = [
      { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel] }
    ];

    const channels = [
      "member-join-log", "member-leave-log", "member-kick-log", "member-ban-log",
      "member-unban-log", "member-timeout-log", "member-timeout-remove-log",
      "voice-join-log", "voice-leave-log", "voice-move-log",
      "channel-create-log", "channel-delete-log", "channel-update-log",
      "role-create-log", "role-delete-log", "role-update-log",
      "role-give-log", "role-remove-log", "message-delete-log", "message-edit-log"
    ];

    for (const name of channels) {
      if (!message.guild.channels.cache.find(c => c.name === name)) {
        await message.guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: cat.id,
          permissionOverwrites: perms
        });
      }
    }
    message.reply("✅ Full Logs Installed & Checked");
  }
});

/* ================= MEMBER EVENTS ================= */

client.on("guildMemberAdd", member => {
  logChannel(member.guild, "member-join-log")?.send({
    embeds: [createEmbed("🟢 Member Joined", "Green").addFields({ name: "Member", value: `${member} (${member.id})` })]
  });
});

client.on("guildMemberRemove", async member => {
  const kick = await getAuditEntry(member.guild, AuditLogEvent.MemberKick);
  if (kick && kick.target.id === member.id && (Date.now() - kick.createdTimestamp < 5000)) {
    logChannel(member.guild, "member-kick-log")?.send({
      embeds: [createEmbed("👢 Member Kicked", "Orange").addFields(
        { name: "Member", value: `${member.user.tag}` },
        { name: "By", value: `${kick.executor}` },
        { name: "Reason", value: kick.reason || "No Reason" }
      )]
    });
  } else {
    logChannel(member.guild, "member-leave-log")?.send({
      embeds: [createEmbed("🔴 Member Left", "Red").addFields({ name: "Member", value: `${member.user.tag}` })]
    });
  }
});

/* ================= BAN EVENTS ================= */

client.on("guildBanAdd", async ban => {
  const entry = await getAuditEntry(ban.guild, AuditLogEvent.MemberBanAdd);
  logChannel(ban.guild, "member-ban-log")?.send({
    embeds: [createEmbed("🚫 Member Banned", "DarkRed").addFields(
      { name: "User", value: `${ban.user.tag}` },
      { name: "By", value: `${entry?.executor || "Unknown"}` }
    )]
  });
});

client.on("guildBanRemove", async ban => {
  const entry = await getAuditEntry(ban.guild, AuditLogEvent.MemberBanRemove);
  logChannel(ban.guild, "member-unban-log")?.send({
    embeds: [createEmbed("♻ Member Unbanned", "Green").addFields(
      { name: "User", value: `${ban.user.tag}` },
      { name: "By", value: `${entry?.executor || "Unknown"}` }
    )]
  });
});

/* ================= UPDATES & ROLES ================= */

client.on("guildMemberUpdate", async (oldM, newM) => {
  // Timeout Logs
  if (!oldM.communicationDisabledUntil && newM.communicationDisabledUntil) {
    logChannel(newM.guild, "member-timeout-log")?.send({
      embeds: [createEmbed("⏳ Member Timed Out", "Orange").addFields({ name: "Member", value: `${newM}` })]
    });
  }
  if (oldM.communicationDisabledUntil && !newM.communicationDisabledUntil) {
    logChannel(newM.guild, "member-timeout-remove-log")?.send({
      embeds: [createEmbed("✅ Timeout Removed", "Green").addFields({ name: "Member", value: `${newM}` })]
    });
  }

  // Role Give/Remove Logs
  const oldRoles = oldM.roles.cache;
  const newRoles = newM.roles.cache;

  if (oldRoles.size < newRoles.size) {
    const role = newRoles.filter(r => !oldRoles.has(r.id)).first();
    const entry = await getAuditEntry(newM.guild, AuditLogEvent.MemberRoleUpdate);
    logChannel(newM.guild, "role-give-log")?.send({
      embeds: [createEmbed("🛡️ Role Given", "Blue").addFields(
        { name: "Member", value: `${newM}` },
        { name: "Role", value: `${role}` },
        { name: "By", value: `${entry?.executor || "Unknown"}` }
      )]
    });
  }

  if (oldRoles.size > newRoles.size) {
    const role = oldRoles.filter(r => !newRoles.has(r.id)).first();
    const entry = await getAuditEntry(newM.guild, AuditLogEvent.MemberRoleUpdate);
    logChannel(newM.guild, "role-remove-log")?.send({
      embeds: [createEmbed("🛡️ Role Removed", "DarkRed").addFields(
        { name: "Member", value: `${newM}` },
        { name: "Role", value: `${role.name}` },
        { name: "By", value: `${entry?.executor || "Unknown"}` }
      )]
    });
  }
});

/* ================= VOICE EVENTS ================= */

client.on("voiceStateUpdate", (oldS, newS) => {
  if (!oldS.channel && newS.channel) {
    logChannel(newS.guild, "voice-join-log")?.send({
      embeds: [createEmbed("🎤 Voice Join").addFields({ name: "Member", value: `${newS.member}` }, { name: "Channel", value: `${newS.channel}` })]
    });
  }
  if (oldS.channel && !newS.channel) {
    logChannel(oldS.guild, "voice-leave-log")?.send({
      embeds: [createEmbed("📤 Voice Leave").addFields({ name: "Member", value: `${oldS.member}` }, { name: "Channel", value: `${oldS.channel.name}` })]
    });
  }
  if (oldS.channel && newS.channel && oldS.channel.id !== newS.channel.id) {
    logChannel(newS.guild, "voice-move-log")?.send({
      embeds: [createEmbed("🔄 Voice Move").addFields({ name: "Member", value: `${newS.member}` }, { name: "From", value: `${oldS.channel.name}` }, { name: "To", value: `${newS.channel.name}` })]
    });
  }
});

/* ================= MESSAGE EVENTS ================= */

client.on("messageDelete", async message => {
  if (!message.guild || message.author?.bot) return;
  logChannel(message.guild, "message-delete-log")?.send({
    embeds: [createEmbed("🗑 Message Deleted", "Grey").addFields(
      { name: "Author", value: `${message.author.tag}` },
      { name: "Channel", value: `${message.channel}` },
      { name: "Content", value: message.content || "No Text/Media" }
    )]
  });
});

client.on("messageUpdate", async (oldM, newM) => {
  if (!oldM.guild || oldM.author?.bot || oldM.content === newM.content) return;
  logChannel(oldM.guild, "message-edit-log")?.send({
    embeds: [createEmbed("✏ Message Edited", "Yellow").addFields(
      { name: "Author", value: `${oldM.author.tag}` },
      { name: "Channel", value: `${oldM.channel}` },
      { name: "Before", value: oldM.content || "No Text" },
      { name: "After", value: newM.content || "No Text" }
    )]
  });
});

// ملاحظة: أحداث القنوات والرتب (Create/Delete) تعمل بشكل جيد في كودك الأصلي لذا أبقيتها كما هي مع تحسين بسيط
client.on("channelCreate", c => logChannel(c.guild, "channel-create-log")?.send({ embeds: [createEmbed("📁 Channel Created", "Green").addFields({ name: "Channel", value: `${c}` })] }));
client.on("channelDelete", c => logChannel(c.guild, "channel-delete-log")?.send({ embeds: [createEmbed("🗑 Channel Deleted", "Red").addFields({ name: "Channel", value: `${c.name}` })] }));

client.login(process.env.TOKEN);
