// ================== UUN FULL SPLIT LOGS ==================

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
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log("✅ Uun Full Split Logs Online");
});

/* ================= HELPERS ================= */

function log(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

function embed(title, color="Blurple"){
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setFooter({ text: "Uun Logs System" })
    .setTimestamp();
}

async function getAudit(guild, type){
  const logs = await guild.fetchAuditLogs({ type, limit:1 }).catch(()=>{});
  return logs?.entries.first();
}

/* ================= SETUP ================= */

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  if (message.content === "!logs-setup") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const role = message.guild.roles.cache.find(r=>r.name===".");
    if (!role) return message.reply("رتبة . غير موجودة");

    const cat = await message.guild.channels.create({
      name: "Uun Logs",
      type: ChannelType.GuildCategory
    });

    const perms = [
      { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
    ];

    const channels = [
      "member-join-log",
      "member-leave-log",
      "member-kick-log",
      "member-ban-log",
      "member-unban-log",
      "member-timeout-log",
      "member-timeout-remove-log",
      "voice-join-log",
      "voice-leave-log",
      "voice-move-log",
      "channel-create-log",
      "channel-delete-log",
      "channel-update-log",
      "role-create-log",
      "role-delete-log",
      "role-update-log",
      "role-give-log",
      "role-remove-log",
      "message-delete-log",
      "message-edit-log"
    ];

    for (const name of channels) {
      await message.guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: cat.id,
        permissionOverwrites: perms
      });
    }

    message.reply("✅ Full Logs Installed");
  }
});

/* ================= MEMBER ================= */

client.on("guildMemberAdd", member => {
  log(member.guild,"member-join-log")
  ?.send({embeds:[
    embed("🟢 Member Joined","Green")
    .addFields({name:"Member",value:`${member} (${member.id})`})
  ]});
});

client.on("guildMemberRemove", async member => {

  const kick = await getAudit(member.guild,AuditLogEvent.MemberKick);

  if (kick && kick.target.id === member.id) {
    log(member.guild,"member-kick-log")
    ?.send({embeds:[
      embed("👢 Member Kicked","Orange")
      .addFields(
        {name:"Member",value:`${member.user.tag} (${member.id})`},
        {name:"By",value:`${kick.executor}`}
      )
    ]});
  } else {
    log(member.guild,"member-leave-log")
    ?.send({embeds:[
      embed("🔴 Member Left","Red")
      .addFields({name:"Member",value:`${member.user.tag} (${member.id})`})
    ]});
  }
});

/* ================= BAN ================= */

client.on("guildBanAdd", async ban => {
  const entry = await getAudit(ban.guild,AuditLogEvent.MemberBanAdd);
  log(ban.guild,"member-ban-log")
  ?.send({embeds:[
    embed("🚫 Member Banned","DarkRed")
    .addFields(
      {name:"User",value:`${ban.user} (${ban.user.id})`},
      {name:"By",value:`${entry?.executor || "Unknown"}`}
    )
  ]});
});

client.on("guildBanRemove", async ban => {
  const entry = await getAudit(ban.guild,AuditLogEvent.MemberBanRemove);
  log(ban.guild,"member-unban-log")
  ?.send({embeds:[
    embed("♻ Member Unbanned","Green")
    .addFields(
      {name:"User",value:`${ban.user} (${ban.user.id})`},
      {name:"By",value:`${entry?.executor || "Unknown"}`}
    )
  ]});
});

/* ================= TIMEOUT ================= */

client.on("guildMemberUpdate", async (oldM,newM)=>{

  if (!oldM.communicationDisabledUntil && newM.communicationDisabledUntil){
    log(newM.guild,"member-timeout-log")
    ?.send({embeds:[
      embed("⏳ Member Timed Out","Orange")
      .addFields({name:"Member",value:`${newM} (${newM.id})`})
    ]});
  }

  if (oldM.communicationDisabledUntil && !newM.communicationDisabledUntil){
    log(newM.guild,"member-timeout-remove-log")
    ?.send({embeds:[
      embed("✅ Timeout Removed","Green")
      .addFields({name:"Member",value:`${newM} (${newM.id})`})
    ]});
  }

});

/* ================= VOICE ================= */

client.on("voiceStateUpdate",(oldS,newS)=>{

  if (!oldS.channel && newS.channel){
    log(newS.guild,"voice-join-log")
    ?.send({embeds:[
      embed("🎤 Voice Join")
      .addFields({name:"Member",value:`${newS.member}`},
                 {name:"Channel",value:`${newS.channel}`})
    ]});
  }

  if (oldS.channel && !newS.channel){
    log(oldS.guild,"voice-leave-log")
    ?.send({embeds:[
      embed("📤 Voice Leave")
      .addFields({name:"Member",value:`${oldS.member}`},
                 {name:"Channel",value:`${oldS.channel}`})
    ]});
  }

  if (oldS.channel && newS.channel && oldS.channel.id!==newS.channel.id){
    log(newS.guild,"voice-move-log")
    ?.send({embeds:[
      embed("🔄 Voice Move")
      .addFields(
        {name:"Member",value:`${newS.member}`},
        {name:"From",value:`${oldS.channel}`},
        {name:"To",value:`${newS.channel}`}
      )
    ]});
  }

});

/* ================= CHANNEL ================= */

client.on("channelCreate", channel=>{
  log(channel.guild,"channel-create-log")
  ?.send({embeds:[embed("📁 Channel Created","Green")
    .addFields({name:"Channel",value:`${channel}`})]});
});

client.on("channelDelete", channel=>{
  log(channel.guild,"channel-delete-log")
  ?.send({embeds:[embed("🗑 Channel Deleted","Red")
    .addFields({name:"Channel",value:`${channel.name}`})]});
});

client.on("channelUpdate",(oldC,newC)=>{
  if(oldC.name!==newC.name){
    log(newC.guild,"channel-update-log")
    ?.send({embeds:[
      embed("✏ Channel Renamed","Orange")
      .addFields(
        {name:"Old",value:oldC.name},
        {name:"New",value:newC.name}
      )
    ]});
  }
});

/* ================= ROLE ================= */

client.on("roleCreate", role=>{
  log(role.guild,"role-create-log")
  ?.send({embeds:[embed("🎭 Role Created","Green")
    .addFields({name:"Role",value:`${role}`})]});
});

client.on("roleDelete", role=>{
  log(role.guild,"role-delete-log")
  ?.send({embeds:[embed("🗑 Role Deleted","Red")
    .addFields({name:"Role",value:`${role.name}`})]});
});

client.on("roleUpdate",(oldR,newR)=>{
  if(oldR.name!==newR.name){
    log(newR.guild,"role-update-log")
    ?.send({embeds:[
      embed("✏ Role Renamed","Orange")
      .addFields(
        {name:"Old",value:oldR.name},
        {name:"New",value:newR.name}
      )
    ]});
  }
});

/* ================= MESSAGE ================= */

client.on("messageDelete", message=>{
  if(!message.guild||message.author?.bot)return;
  log(message.guild,"message-delete-log")
  ?.send({embeds:[
    embed("🗑 Message Deleted","Grey")
    .addFields(
      {name:"Author",value:`${message.author}`},
      {name:"Channel",value:`${message.channel}`},
      {name:"Content",value:message.content||"No Text"}
    )
  ]});
});

client.on("messageUpdate",(oldM,newM)=>{
  if(!oldM.guild||oldM.author?.bot)return;
  log(oldM.guild,"message-edit-log")
  ?.send({embeds:[
    embed("✏ Message Edited","Yellow")
    .addFields(
      {name:"Author",value:`${oldM.author}`},
      {name:"Channel",value:`${oldM.channel}`},
      {name:"Before",value:oldM.content||"No Text"},
      {name:"After",value:newM.content||"No Text"}
    )
  ]});
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
