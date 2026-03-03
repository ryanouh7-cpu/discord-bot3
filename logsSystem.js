const { EmbedBuilder } = require("discord.js");

module.exports = (client) => {

  // ===== Voice Logs =====
  client.on("voiceStateUpdate", async (oldState, newState) => {

    const guild = newState.guild;
    if (!guild) return;

    const joinLog = guild.channels.cache.find(c => c.name === "voice-join-log");
    const leaveLog = guild.channels.cache.find(c => c.name === "voice-leave-log");
    const moveLog = guild.channels.cache.find(c => c.name === "voice-move-log");
    const muteLog = guild.channels.cache.find(c => c.name === "voice-mute-log");
    const deafenLog = guild.channels.cache.find(c => c.name === "voice-deafen-log");

    const member = newState.member;

    // دخول فويس
    if (!oldState.channelId && newState.channelId) {
      if (joinLog) {
        joinLog.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setTitle("🔊 Voice Join")
              .setDescription(`${member} joined **${newState.channel.name}**`)
              .setTimestamp()
          ]
        });
      }
    }

    // خروج من فويس
    if (oldState.channelId && !newState.channelId) {
      if (leaveLog) {
        leaveLog.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("🔇 Voice Leave")
              .setDescription(`${member} left **${oldState.channel.name}**`)
              .setTimestamp()
          ]
        });
      }
    }

    // تنقل بين رومات
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      if (moveLog) {
        moveLog.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Orange")
              .setTitle("🔁 Voice Move")
              .setDescription(`${member} moved from **${oldState.channel.name}** to **${newState.channel.name}**`)
              .setTimestamp()
          ]
        });
      }
    }

    // ميوت
    if (oldState.serverMute !== newState.serverMute) {
      if (muteLog) {
        muteLog.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Yellow")
              .setTitle("🔈 Voice Mute Update")
              .setDescription(`${member} server mute: **${newState.serverMute ? "Enabled" : "Disabled"}**`)
              .setTimestamp()
          ]
        });
      }
    }

    // ديفن
    if (oldState.serverDeaf !== newState.serverDeaf) {
      if (deafenLog) {
        deafenLog.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Blue")
              .setTitle("🎧 Voice Deafen Update")
              .setDescription(`${member} server deafen: **${newState.serverDeaf ? "Enabled" : "Disabled"}**`)
              .setTimestamp()
          ]
        });
      }
    }

  });

};
