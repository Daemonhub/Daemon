const Discord = require('discord.js');
const db = require('quick.db');
const url = require("url");
const path = require("path");
var express = require('express');
var app = express();
const passport = require("passport");
const session = require("express-session");
const LevelStore = require("level-session-store")(session);
const Strategy = require("passport-discord").Strategy;
const helmet = require("helmet");
const md = require("marked");

exports.run = async(client, message, args) => {

  
  if(args[0] == "commands") {
return message.channel.send(`
<:XMARK6:690583258022412299> It looks like you don't have any commands to show.

To enable or add commands, head to your dashboard and enable the plugins of your choice -> 
https://mee6turk.glitch.me/${message.guild.id}/manage`);
}
  
if (args[0] == "levels") {
  let mee6levels = new Discord.RichEmbed()
  .setTitle("Levels Plugin")
  .setDescription(`
\`!levels\`
Get a link to the leaderboard

\`!rank (optional member)\`
Get the rank of anyone in the server`)
  .setColor('#60d1f6')
  return message.channel.send(mee6levels)
}
  
 const mee6help = new Discord.RichEmbed()
  .setColor('#60d1f6')
  .setAuthor(`MEE6 Plugins Commands`, client.user.avatarURL)
  .addField('**Commands**', '`!help commands`', true)
  .addField('**Levels**', '`!help levels`', true)
 .setThumbnail('https://cdn.discordapp.com/attachments/688803433947594796/690582370092449932/mee6_kare.png')
        message.channel.send(mee6help)
 
}


exports.conf = {
enabled: true,
guildOnly: true,
permLevel: 0,
aliases: [],
kategori: "help"

}

exports.help = {
name: "help",
description: "Bot hakkında kısa bilgiyi gösterir.",
usage: "help"

}