var CommandArray = [];
var clog = require('../../utils/clog.js');

CommandArray.ping = {
  name		: 'ping',
  help		: "Replies with pong!",
  module	: 'standard',
  cooldown	: 5,
  levelReq	: 0,
  clean		: 0,
  exec: function (client, msg, suffix) {
    msg.reply('I could say something like \"Pong!\" here, but meh...');
  }
}

CommandArray.eval = {
  name		: 'eval',
  help		: "Runs arbitrary JS code and gives back the results.",
  module	: 'standard',
  cooldown	: 0,
  levelReq	: 'owner',
  clean		: 0,
  exec: function (client, msg, suffix) {
    var result;

	try {
		result = eval("try{" + suffix + "} catch (error) { clog.logError(\"EVAL\", error); msg.channel.sendMessage(\"```\" + error + \"```\") }");
	} catch (err) {
		clog.logError("EVAL CATCH", err);
		msg.channel.sendMessage("```" + err + "```");
	}

	if (result && typeof result !== 'object') { msg.channel.sendMessage("```" + result + "```") }
	else if (result && typeof result === 'object') { msg.channel.sendMessage("```xl\n" + result + "```") }
  }
}

exports.CommandArray = CommandArray;
