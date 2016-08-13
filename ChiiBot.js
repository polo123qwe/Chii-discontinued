'use strict'
/**
 *	ChiiBot
 */
process.title = 'ChiiBot'

var Discordie = require('discordie');
var config = require('./config.json');
var utilsLoader = require('./utils/utilsLoader.js');
var commandLoader = require('./data/commandLoader.js');
var help = utilsLoader.help;
var db = utilsLoader.db;
var clog = utilsLoader.clog;
var commands = commandLoader.commandController.Commands;

var Events = Discordie.Events;

//Constants
const DELAY = 5000;

var setupTime = Date.now();

var client = new Discordie({
    autoReconnect: true,
});

/* Event: Ready */
client.Dispatcher.on(Events.GATEWAY_READY, e => {

    console.log(clog.c.colorYellow("Connected, loading users..."));
    client.Users.fetchMembers().then(() => {
        console.log(clog.c.colorYellow("..everything ready! " + (Date.now() - setupTime) + "ms"));
    });
    var game = {
        name: "with the world"
    };
    client.User.setStatus("online", game);
    client.uptime = Date.now();
});

/* Event: Message */
client.Dispatcher.on(Events.MESSAGE_CREATE, e => {
    /* Suf = message trigger suffix */
    var suf = config.bot.suffix;

    db.logging.storeMessageDB(e.message).catch(function(err) {
        console.log(err);
    });
    /* Ignore messages without the suffix */
    if (!(e.message.content.split(" ")[0].slice(-1) == suf)) {
        return;
    }

    var cmd = e.message.content.split(" ")[0].substring(0, e.message.content.split(" ")[0].length - suf.length);
    var suffix = e.message.content.substr(cmd.length + suf.length + 1);

    /* Prevent the bot from responding to itself (infite loops suck) */
    if (e.message.author.client || e.message.author.id === client.User.id) {
        return;
    }

    /* Help is handled in a different file */
    if (cmd == "help") {
        help(e.message, commands, suffix);
    }

    /* Check if the command is valid */
    if (!commands[cmd] || typeof commands[cmd] !== 'object') {
        return;
    }


    if (!e.message.isPrivate) { /* This is only for non-DMs */

        if (!utilsLoader.cooldowns.checkCD(client, cmd, e.message.guild.id, e.message)) {
            return
        }

        db.fetch.getChannelConfig(e.message.channel.id).then(function(query) {
            if (query.rowCount > 0 && !query.rows[0].enabled) return;
            db.perms.checkPerms(e.message, e.message.author.id, e.message.member.roles).then(function(lvl) {

                //Owner skips
                if (commands[cmd].levelReq === 'owner' && config.permissions.owner.indexOf(e.message.author.id) == -1) {
                    e.message.reply(':no_entry_sign: This command is for the bot owner only.').then(function(botMsg, error) {
                        setTimeout(() => {
                            botMsg.delete()
                        }, DELAY);
                    });
                } else if (commands[cmd].levelReq !== 'owner' && lvl < commands[cmd].levelReq) {
                    e.message.channel.sendMessage(':disappointed: You do not have enough permission to run this command.').then(function(botMsg, error) {
                        setTimeout(() => {
                            botMsg.delete()
                        }, DELAY);
                    });
                } else {
                    try {
                        /* Log command execution to the console */
                	    clog.logCommand(e.message.guild.name, e.message.author, cmd, suffix);

                        commands[cmd].exec(client, e.message, suffix);

                        /* Check for clean property on commands */
                        if (commands[cmd].hasOwnProperty("clean")) {
                            if (commands[cmd].clean > 0) {
                                setTimeout(() => {
                                    e.message.delete()
                                }, (commands[cmd].clean * 1000));
                            }
                        }
                    } catch (cmder) {
                        e.message.channel.sendMessage(':warning: An error ocurred while running that command!\n```' + cmder + '```');
                        clog.logError("COMMAND", cmder);
                    }

                }
            }).catch(function(errrr) {
                console.log("Error!\n" + errrr);
            });
        });
    } else { /* This is for commands that are allowed in DMs */
        if (!commands[cmd].hasOwnProperty("DM") || !commands[cmd].DM) {
            e.message.channel.sendMessage(':warning: This command cannot be used in DMs.');
        }
        try {
			clog.logCommand("DM " + e.message.author.username, e.message.author, cmd, suffix);
            
            commands[cmd].exec(client, e.message, suffix);
        } catch (cmderr) {
            e.message.channel.sendMessage(':warning: An error ocurred while running that command!\n```' + cmder + '```');
            clog.logError("COMMAND", cmder);
        }
    }
});

//Joined and left events
client.Dispatcher.on(Events.GUILD_MEMBER_ADD, e => {
    db.logging.storeUserDB(e.member);

    var rules;
    for (var channel of e.guild.channels) {
        if (channel.name.toLowerCase() == "rules" || channel.name.toLowerCase() == "readme") {
            rules = channel;
            break;
        }
    }
    if (!rules) {
        e.guild.generalChannel.sendMessage("Welcome to " + e.guild.name + ", " + e.member.mention + "! Don't forget to read the rules.");
    } else {
        e.guild.generalChannel.sendMessage("Welcome to " + e.guild.name + ", " + e.member.mention +
            "! Don't forget to read the rules." + " <#" + rules.id + ">");
    }
});

client.Dispatcher.on(Events.GUILD_MEMBER_REMOVE, e => {
    e.guild.generalChannel.sendMessage("**" + e.user.username + "#" + e.user.discriminator + "** is now gone.")
});

client.Dispatcher.on(Events.GUILD_BAN_ADD, e => {});
/////////////////////////////

/* Client Login */
if (config.bot.selfbot && config.bot.email != "" && config.bot.password != "") {
    client.connect({
        email: config.bot.email,
        password: config.bot.password
    });
} else {
    client.connect({
        token: config.bot.token
    });
}
