const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {

/* ================== MESSAGE DELETE ================== */

client.on("messageDelete", async (message) => {
  if (!message.guild || message.author?.bot) return;

  const logChannel = message.guild.channels.cache.find(c => c.name === "message-delete-log");
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("🗑 Message Deleted")
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      { name: "👤 User", value: `${message.author} (${message.author.id})`, inline: false },
      { name: "📍 Channel", value: `${message.channel}`, inline: true },
      { name: "📝 Content", value: message.content ? message.content.slice(0, 1000) : "No text" }
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
});

/* ================== MESSAGE EDIT ================== */

client.on("messageUpdate", async (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const logChannel = oldMsg.guild.channels.cache.find(c => c.name === "message-edit-log");
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor("Orange")
    .setTitle("✏ Message Edited")
    .setThumbnail(oldMsg.author.displayAvatarURL())
    .addFields(
      { name: "👤 User", value: `${oldMsg.author} (${oldMsg.author.id})` },
      { name: "📍 Channel", value: `${oldMsg.channel}` },
      { name: "🔴 Before", value: oldMsg.content?.slice(0, 1000) || "No text" },
      { name: "🟢 After", value: newMsg.content?.slice(0, 1000) || "No text" }
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
});

/* ================== ROLE LOG ================== */

client.on("guildMemberUpdate", async (oldMember, newMember) => {

  const logChannel = newMember.guild.channels.cache.find(c => c.name === "role-log");
  if (!logChannel) return;

  const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (added.size > 0) {
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("🎭 Role Added")
      .setDescription(`${newMember} was given: ${added.map(r => r).join(", ")}`)
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }

  if (removed.size > 0) {
    const embed = new EmbedBuilder()
      .setColor("DarkRed")
      .setTitle("🎭 Role Removed")
      .setDescription(`${newMember} lost: ${removed.map(r => r).join(", ")}`)
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
});

/* ================== VOICE LOG ================== */

client.on("voiceStateUpdate", async (oldState, newState) => {

  const logChannel = newState.guild.channels.cache.find(c => c.name === "voice-log");
  if (!logChannel) return;

  if (!oldState.channel && newState.channel) {
    logChannel.send(`🔊 ${newState.member} joined ${newState.channel.name}`);
  }

  if (oldState.channel && !newState.channel) {
    logChannel.send(`🔇 ${oldState.member} left ${oldState.channel.name}`);
  }

  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    logChannel.send(`🔁 ${newState.member} moved from ${oldState.channel.name} to ${newState.channel.name}`);
  }
});

};
