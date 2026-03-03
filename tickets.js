const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

module.exports = (client) => {

  let data = JSON.parse(fs.readFileSync("./tickets.json"));
  let counter = data.counter || 1;
  let open = data.open || {};

  function save(){
    fs.writeFileSync("./tickets.json", JSON.stringify({counter,open},null,2));
  }

  client.on("messageCreate", async (m)=>{
    if(m.content!=="!ticket-panel") return;

    const row=new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("open_ticket").setLabel("فتح تذكرة").setStyle(ButtonStyle.Primary)
    );

    m.channel.send({content:"🎫 افتح تذكرة",components:[row]});
  });

  client.on("interactionCreate", async (i)=>{
    if(!i.isButton()) return;

    const guild=i.guild,member=i.member;

    if(i.customId==="open_ticket"){

      if(open[member.id])
        return i.reply({content:"عندك تذكرة مفتوحة",ephemeral:true});

      const cat=guild.channels.cache.find(c=>c.name==="Uun Tickets");

      const ch=await guild.channels.create({
        name:`ticket-${counter++}`,
        type:ChannelType.GuildText,
        parent:cat.id,
        permissionOverwrites:[
          {id:guild.id,deny:[PermissionsBitField.Flags.ViewChannel]},
          {id:member.id,allow:[PermissionsBitField.Flags.ViewChannel]}
        ]
      });

      open[member.id]=ch.id;
      save();

      guild.channels.cache.find(c=>c.name==="ticket-open-log")
        ?.send(`🎫 ${member} opened ${ch}`);

      const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("claim").setLabel("استلام").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("close").setLabel("إغلاق").setStyle(ButtonStyle.Danger)
      );

      ch.send({content:`${member}`,components:[row]});

      // تنبيه قبل ساعة
      setTimeout(()=>ch.send("⏳ سيتم الإغلاق بعد ساعة"),9*60*60*1000);

      // إغلاق بعد 10 ساعات
      setTimeout(()=>{
        if(ch.deletable){
          ch.send("🔒 تم الإغلاق التلقائي");
          ch.delete();
        }
      },10*60*60*1000);

      i.reply({content:"تم إنشاء التذكرة",ephemeral:true});
    }

    if(i.customId==="claim"){
      if(!member.permissions.has(PermissionsBitField.Flags.Administrator))
        return i.reply({content:"Admin only",ephemeral:true});

      guild.channels.cache.find(c=>c.name==="ticket-claim-log")
        ?.send(`🛠 ${member} claimed ${i.channel}`);
      i.reply("تم الاستلام");
    }

    if(i.customId==="close"){

      const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("rate_5").setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Success)
      );

      i.channel.send({content:"قيّم الخدمة:",components:[row]});

      guild.channels.cache.find(c=>c.name==="ticket-close-log")
        ?.send(`🔒 ${i.channel.name} closed`);

      delete open[Object.keys(open).find(k=>open[k]===i.channel.id)];
      save();

      setTimeout(()=>i.channel.delete(),5000);
    }

    if(i.customId==="rate_5"){
      i.reply({content:"شكراً لتقييمك ⭐",ephemeral:true});
    }

  });

};
