// ================== UUN SYSTEM V5 ULTIMATE FINAL ==================

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AuditLogEvent
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* ================= DATABASE ================= */

if (!fs.existsSync("./tickets.json"))
  fs.writeFileSync("./tickets.json", JSON.stringify({}));

let db = JSON.parse(fs.readFileSync("./tickets.json"));
let counter = db.counter || 1;
let tickets = db.tickets || {};

function save() {
  fs.writeFileSync("./tickets.json", JSON.stringify({ counter, tickets }, null, 2));
}

/* ================= READY ================= */

client.once("ready", () => {
  console.log("🔥 Uun System Ultimate Online");
});

/* ================= COMMAND ================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (tickets[message.channel.id]) {
    tickets[message.channel.id].lastActivity = Date.now();
    save();
  }

  if (message.content === "!setup") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("install").setLabel("Install").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("panel").setLabel("Send Ticket Panel").setStyle(ButtonStyle.Primary)
    );

    message.reply({ content: "🔧 Uun Control Panel", components: [row] });
  }
});

/* ================= INSTALL ================= */

client.on("interactionCreate", async (interaction) => {

if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

const guild = interaction.guild;
const member = interaction.member;

/* ===== INSTALL ===== */

if (interaction.isButton() && interaction.customId === "install") {

if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
return interaction.reply({ content: "Admin only", ephemeral: true });

const logsCat = await guild.channels.create({
name: "Uun Logs",
type: ChannelType.GuildCategory,
permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
});

const logChannels = [
"member-join-log",
"member-leave-log",
"voice-join-log",
"voice-leave-log",
"voice-move-log",
"member-role-log",
"ticket-open-log",
"ticket-close-log",
"ticket-claim-log"
];

for (const name of logChannels) {
await guild.channels.create({
name,
type: ChannelType.GuildText,
parent: logsCat.id,
permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
});
}

await guild.channels.create({
name: "uun-feedback",
type: ChannelType.GuildText,
permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
});

await guild.channels.create({
name: "Uun Tickets",
type: ChannelType.GuildCategory,
permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
});

interaction.reply({ content: "✅ System Installed", ephemeral: true });
}

/* ===== RATING FIXED ===== */

if (interaction.isButton() && interaction.customId.startsWith("rate_")) {

const rating = interaction.customId.split("_")[1];

const embed = new EmbedBuilder()
.setColor("#FFD700")
.setTitle("⭐ Ticket Rating")
.addFields(
{ name: "User", value: `${interaction.user}`, inline: true },
{ name: "Rating", value: `${rating}/5`, inline: true }
)
.setTimestamp();

const feedback = guild.channels.cache.find(c => c.name === "uun-feedback");
if (feedback) feedback.send({ embeds: [embed] });

interaction.reply({ content: "شكراً لتقييمك ❤️", ephemeral: true });
}

});

/* ================= LOGS EMBED SYSTEM ================= */

function logEmbed(channel, title, description, color) {
if (!channel) return;
const embed = new EmbedBuilder()
.setColor(color)
.setTitle(title)
.setDescription(description)
.setTimestamp();
channel.send({ embeds: [embed] });
}

/* ===== MEMBER JOIN ===== */
client.on("guildMemberAdd", member => {
logEmbed(
member.guild.channels.cache.find(c=>c.name==="member-join-log"),
"🟢 Member Joined",
`${member} joined the server`,
"Green"
);
});

/* ===== MEMBER LEAVE ===== */
client.on("guildMemberRemove", member => {
logEmbed(
member.guild.channels.cache.find(c=>c.name==="member-leave-log"),
"🔴 Member Left",
`${member.user.tag} left the server`,
"Red"
);
});

/* ===== VOICE LOGS ===== */
client.on("voiceStateUpdate", (oldState, newState) => {

const guild = newState.guild;

if (!oldState.channelId && newState.channelId) {
logEmbed(
guild.channels.cache.find(c=>c.name==="voice-join-log"),
"🎙 Voice Join",
`${newState.member} joined ${newState.channel}`,
"Blue"
);
}

if (oldState.channelId && !newState.channelId) {
logEmbed(
guild.channels.cache.find(c=>c.name==="voice-leave-log"),
"📤 Voice Leave",
`${oldState.member} left <#${oldState.channelId}>`,
"Orange"
);
}

if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
logEmbed(
guild.channels.cache.find(c=>c.name==="voice-move-log"),
"🔁 Voice Move",
`${newState.member} moved from <#${oldState.channelId}> to ${newState.channel}`,
"Purple"
);
}

});

/* ===== ROLE LOGS ===== */
client.on("guildMemberUpdate", async (oldMember, newMember) => {

const logChannel = newMember.guild.channels.cache.find(c=>c.name==="member-role-log");
if (!logChannel) return;

const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

const audit = await newMember.guild.fetchAuditLogs({
limit:1,
type:AuditLogEvent.MemberRoleUpdate
}).catch(()=>null);

let executor = "Unknown";
if (audit && audit.entries.first()) {
const entry = audit.entries.first();
if (entry.target.id === newMember.id) executor = entry.executor;
}

for (const role of addedRoles.values()) {
logEmbed(logChannel,"➕ Role Added",`${role} added to ${newMember} by ${executor}`,"Green");
}

for (const role of removedRoles.values()) {
logEmbed(logChannel,"➖ Role Removed",`${role} removed from ${newMember} by ${executor}`,"Red");
}

});

/* ================= AUTO CLOSE 6 HOURS ================= */

const AUTO_CLOSE_TIME = 6 * 60 * 60 * 1000;

setInterval(async () => {
for (const channelId in tickets) {

const data = tickets[channelId];
if (!data) continue;

if (!data.lastActivity)
data.lastActivity = data.created || Date.now();

if (Date.now() - data.lastActivity >= AUTO_CLOSE_TIME) {

const channel = client.channels.cache.get(channelId);
if (!channel) continue;

logEmbed(
channel.guild.channels.cache.find(c=>c.name==="ticket-close-log"),
"⏳ Auto Close",
`${channel.name} closed بسبب عدم النشاط 6 ساعات`,
"Orange"
);

delete tickets[channelId];
save();

channel.delete().catch(()=>{});
}
}
},60000);

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
