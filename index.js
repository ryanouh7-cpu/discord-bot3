// ================== UUN LOGS BOT FULL SPLIT ==================

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
  console.log("📜 Uun Split Logs Online");
});

/* ================= HELPERS ================= */

function getLog(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

function embed(title, color="Blurple"){
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setFooter({ text: "Uun Logs System" })
    .setTimestamp();
}

async function getExecutor(guild,type){
  const logs = await guild.fetchAuditLogs({ type, limit:1 }).catch(()=>{});
  return logs?.entries.first();
}

/* ================= SETUP ================= */

client.on("messageCreate", async (message)=>{

  if(!message.guild||message.author.bot) return;

  if(message.content==="!logs-setup"){

    if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const role = message.guild.roles.cache.find(r=>r.name===".");
    if(!role) return message.reply("رتبة . غير موجودة");

    const cat = await message.guild.channels.create({
      name:"Uun Logs",
      type:ChannelType.GuildCategory
    });

    const perms = [
      { id: message.guild.id, deny:[PermissionsBitField.Flags.ViewChannel] },
      { id: role.id, allow:[PermissionsBitField.Flags.ViewChannel] },
      { id: client.user.id, allow:[PermissionsBitField.Flags.ViewChannel] }
    ];

    const channels = [

      // Member
      "member-join-log",
      "member-leave-log",
      "member-kick-log",
      "member-ban-log",
      "member-unban-log",
      "member-timeout-log",
      "member-timeout-remove-log",

      // Voice
      "voice-join-log",
      "voice-leave-log",
      "voice-move-log",

      // Channel
      "channel-create-log",
      "channel-delete-log",
      "channel-update-log",

      // Role
      "role-create-log",
      "role-delete-log",
      "role-update-log",
      "role-give-log",
      "role-remove-log",

      // Message
      "message-delete-log",
      "message-edit-log"
    ];

    for(const name of channels){
      await message.guild.channels.create({
        name,
        type:ChannelType.GuildText,
        parent:cat.id,
        permissionOverwrites:perms
      });
    }

    message.reply("✅ Split Logs Installed");
  }

});

/* ================= MEMBER JOIN ================= */

client.on("guildMemberAdd",member=>{
  getLog(member.guild,"member-join-log")
    ?.send({embeds:[
      embed("🟢 Member Joined","Green")
      .addFields(
        {name:"Member",value:`${member} (${member.id})`}
      )
    ]});
});

/* ================= MEMBER LEAVE / KICK ================= */

client.on("guildMemberRemove",async member=>{

  const entry=await getExecutor(member.guild,AuditLogEvent.MemberKick);

  if(entry && entry.target.id===member.id){
    getLog(member.guild,"member-kick-log")
      ?.send({embeds:[
        embed("👢 Member Kicked","Orange")
        .addFields(
          {name:"Member",value:`${member.user.tag} (${member.id})`},
          {name:"By",value:`${entry.executor}`}
        )
      ]});
  }else{
    getLog(member.guild,"member-leave-log")
      ?.send({embeds:[
        embed("🔴 Member Left","Red")
        .addFields(
          {name:"Member",value:`${member.user.tag} (${member.id})`}
        )
      ]});
  }

});

/* ================= BAN / UNBAN ================= */

client.on("guildBanAdd",async ban=>{
  const entry=await getExecutor(ban.guild,AuditLogEvent.MemberBanAdd);
  getLog(ban.guild,"member-ban-log")
    ?.send({embeds:[
      embed("🚫 Member Banned","DarkRed")
      .addFields(
        {name:"User",value:`${ban.user} (${ban.user.id})`},
        {name:"By",value:`${entry?.executor||"Unknown"}`}
      )
    ]});
});

client.on("guildBanRemove",async ban=>{
  const entry=await getExecutor(ban.guild,AuditLogEvent.MemberBanRemove);
  getLog(ban.guild,"member-unban-log")
    ?.send({embeds:[
      embed("♻ Member Unbanned","Green")
      .addFields(
        {name:"User",value:`${ban.user} (${ban.user.id})`},
        {name:"By",value:`${entry?.executor||"Unknown"}`}
      )
    ]});
});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
