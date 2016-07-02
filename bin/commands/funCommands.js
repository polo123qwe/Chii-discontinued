var utils = require("../utils.js");
var sql = require('../sqliteClass.js');
var cleverbot = require("cleverbot.io");
var cleverbotUser = require("../../config.json").cleverbotUser;
var cleverbotPass = require("../../config.json").cleverbotPass;
cbot = new cleverbot(cleverbotUser, cleverbotPass);

var enable = {};

module.exports = {
    decide: {
        permissions: -1,
        run: function(message, bot){
            var splittedMessage = message.content.split(" ");
            splittedMessage.shift();
            var options = splittedMessage.join(" ").split(", ");
            if(options.length < 2) return;

            bot.sendMessage(message, "Chosen one is: " + options[utils.getRandom(0, options.length)]);
        },
        help: "`decide! <option 1, option 2,...>` - decide between multiple choices! **Separate choices with a comma and a space**",
        cd: 30000,
    },

    ask: {
        permissions: -1,
        run: function(message, bot){
            var splittedMessage = message.content.split(" ");
            splittedMessage.shift();
            var question = splittedMessage.join(" ");

            if(!question){
                bot.sendMessage(message, "Say something!");
                return;
            }
            cbot.create(function (err, session) {
                cbot.ask(question, function (err, response) {
                    if(err){
                        bot.sendMessage(message, "No reply");
                    }else {
                        bot.sendMessage(message, response);
                    }
                });
            });
        },
        help: "`ask! <question>` - ask a question to cleverbot",
        check: true,
        cd: 60000,
    },

    tfun: {
        permissions: 2,
        run: function(message, bot){
            if(message.channel.isPrivate) return;
            var server = message.channel.server;

            module.exports.check[server.id] = !module.exports.check[server.id];
            if(module.exports.check[server.id]){
                bot.sendMessage(message, "Fun commands enabled");
            }else{
                bot.sendMessage(message, "Fun commands disabled");
            }

        },
        help: "`tfun!` - toggles the fun commands mode.",
    },

    getStatus: function(sqldb){
        sqldb.retServConfig(function(err, rows){
            if(err) console.log(err);
            var check = {};
            for(var row of rows){
                check[row.server_id] = !row.fun;
            }
            module.exports.check = check;
        });
    },
}