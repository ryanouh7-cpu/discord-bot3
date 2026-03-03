const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {

  const get = (g,n)=>g.channels.cache.find(c=>c.name===n);

  client.on("guildMemberAdd", m=>{
    get(m.guild,"member-join-log")
      ?.send({embeds:[new EmbedBuilder().setColor("Green").setDescription(`${m} joined`).setTimestamp()]});
  });

  client.on("guildMemberRemove", m=>{
    get(m.guild,"member-leave-log")
      ?.send({embeds:[new EmbedBuilder().setColor("Red").setDescription(`${m.user.tag} left`).setTimestamp()]});
  });

  client.on("voiceStateUpdate",(o,n)=>{
    const g=n.guild,m=n.member;

    if(!o.channelId && n.channelId)
      get(g,"voice-join-log")
        ?.send({embeds:[new EmbedBuilder().setDescription(`${m} joined ${n.channel.name}`)]});

    if(o.channelId && !n.channelId)
      get(g,"voice-leave-log")
        ?.send({embeds:[new EmbedBuilder().setDescription(`${m} left ${o.channel.name}`)]});

    if(o.channelId && n.channelId && o.channelId!==n.channelId)
      get(g,"voice-move-log")
        ?.send({embeds:[new EmbedBuilder().setDescription(`${m} moved voice`)]});

    if(n.channel?.name==="قاعة الانتظار")
      get(g,"ticket-open-log")
        ?.send(`🔔 ${m} waiting in support`);
  });

};
