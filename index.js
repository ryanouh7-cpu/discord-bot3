// ================== UUN LOGS ULTRA DETAILED ==================

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  AuditLogEvent
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* ================= READY ================= */

client.once("ready", () => {
  console.log("📜 Uun Ultra Detailed Logs Online");
});

/* ================= HELPERS ================= */

function getLog(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

function createEmbed(title, color = "Blurple") {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setFooter({ text: "Uun Logs System" })
    .setTimestamp();
}

async function getExecutor(guild, type) {
  const logs = await guild.fetchAuditLogs({ type, limit: 1 }).catch(()=>{});
  return logs?.entries.first();
}

/* ================= SETUP ================= */

client.on("messageCreate", async (message) => {

  if (!message.guild || message.author.bot) return;

  if (message.content === "!logs-setup") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const cat = await message.guild.channels.create({
      name: "Uun Logs",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const logs = [
      "member-log",
      "channel-log",
      "role-log",
      "voice-log",
      "message-log",
      "mod-log"
    ];

    for (const name of logs) {
      await message.guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: cat.id,
        permissionOverwrites: [
          { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });
    }

    message.reply("✅ Ultra Logs Installed");
  }

});

/* ================= MEMBER JOIN ================= */

client.on("guildMemberAdd", member => {

  const embed = createEmbed("🟢 Member Joined","Green")
    .addFields(
      { name: "👤 Member", value: `${member} (${member.id})` },
      { name: "📅 Created Account", value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:F>` },
      { name: "🕒 Joined Server", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
    );

  getLog(member.guild,"member-log")?.send({ embeds:[embed] });
});

/* ================= MEMBER LEAVE / KICK ================= */

client.on("guildMemberRemove", async member => {

  const entry = await getExecutor(member.guild, AuditLogEvent.MemberKick);

  const embed = createEmbed("🔴 Member Left","Red")
    .addFields(
      { name: "👤 Member", value: `${member.user.tag} (${member.id})` }
    );

  if (entry && entry.target.id === member.id) {
    embed.setTitle("👢 Member Kicked")
      .addFields(
        { name: "🛠 By", value: `${entry.executor} (${entry.executor.id})` },
        { name: "📝 Reason", value: entry.reason || "No Reason" }
      );
  }

  getLog(member.guild,"member-log")?.send({ embeds:[embed] });
});

/* ================= BAN / UNBAN ================= */

client.on("guildBanAdd", async ban => {

  const entry = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);

  const embed = createEmbed("🚫 Member Banned","DarkRed")
    .addFields(
      { name: "👤 User", value: `${ban.user} (${ban.user.id})` },
      { name: "🛠 By", value: `${entry?.executor || "Unknown"}` },
      { name: "📝 Reason", value: entry?.reason || "No Reason" }
    );

  getLog(ban.guild,"mod-log")?.send({ embeds:[embed] });
});

client.on("guildBanRemove", async ban => {

  const entry = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove);

  const embed = createEmbed("♻ Member Unbanned","Green")
    .addFields(
      { name: "👤 User", value: `${ban.user} (${ban.user.id})` },
      { name: "🛠 By", value: `${entry?.executor || "Unknown"}` }
    );

  getLog(ban.guild,"mod-log")?.send({ embeds:[embed] });
});

/* ================= TIMEOUT ================= */

client.on("guildMemberUpdate", async (oldMember,newMember)=>{

  if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {

    const entry = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate);

    const embed = createEmbed("⏳ Member Timed Out","Orange")
      .addFields(
        { name:"👤 Member", value:`${newMember} (${newMember.id})`},
        { name:"🛠 By", value:`${entry?.executor || "Unknown"}`},
        { name:"⏱ Until", value:`<t:${Math.floor(new Date(newMember.communicationDisabledUntil).getTime()/1000)}:F>`}
      );

    getLog(newMember.guild,"mod-log")?.send({embeds:[embed]});
  }

  if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {

    const entry = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate);

    const embed = createEmbed("✅ Timeout Removed","Green")
      .addFields(
        { name:"👤 Member", value:`${newMember} (${newMember.id})`},
        { name:"🛠 By", value:`${entry?.executor || "Unknown"}`}
      );

    getLog(newMember.guild,"mod-log")?.send({embeds:[embed]});
  }

});

/* ================= CHANNEL CREATE / DELETE / RENAME ================= */

client.on("channelCreate", async channel=>{

  const entry = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate);

  const embed = createEmbed("📁 Channel Created","Green")
    .addFields(
      { name:"📌 Channel", value:`${channel} (${channel.id})`},
      { name:"🛠 By", value:`${entry?.executor || "Unknown"}`}
    );

  getLog(channel.guild,"channel-log")?.send({embeds:[embed]});
});

client.on("channelDelete", async channel=>{

  const entry = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete);

  const embed = createEmbed("🗑 Channel Deleted","Red")
    .addFields(
      { name:"📌 Channel", value:`${channel.name}`},
      { name:"🛠 By", value:`${entry?.executor || "Unknown"}`}
    );

  getLog(channel.guild,"channel-log")?.send({embeds:[embed]});
});

client.on("channelUpdate", async (oldChannel,newChannel)=>{

  if(oldChannel.name!==newChannel.name){

    const entry = await getExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate);

    const embed = createEmbed("✏ Channel Renamed","Orange")
      .addFields(
        { name:"Old Name", value:oldChannel.name },
        { name:"New Name", value:newChannel.name },
        { name:"🛠 By", value:`${entry?.executor || "Unknown"}`}
      );

    getLog(newChannel.guild,"channel-log")?.send({embeds:[embed]});
  }

});

/* ================= ROLE RENAME ================= */

client.on("roleUpdate", async (oldRole,newRole)=>{

  if(oldRole.name!==newRole.name){

    const entry = await getExecutor(newRole.guild, AuditLogEvent.RoleUpdate);

    const embed = createEmbed("🎭 Role Renamed","Orange")
      .addFields(
        { name:"Old Name", value:oldRole.name },
        { name:"New Name", value:newRole.name },
        { name:"🛠 By", value:`${entry?.executor || "Unknown"}`}
      );

    getLog(newRole.guild,"role-log")?.send({embeds:[embed]});
  }

});

/* ================= MESSAGE DELETE ================= */

client.on("messageDelete", async message=>{

  if(!message.guild||message.author?.bot)return;

  const embed=createEmbed("🗑 Message Deleted","Grey")
    .addFields(
      {name:"👤 Author",value:`${message.author} (${message.author.id})`},
      {name:"📍 Channel",value:`${message.channel}`},
      {name:"💬 Content",value:message.content||"No Text"}
    );

  getLog(message.guild,"message-log")?.send({embeds:[embed]});
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
