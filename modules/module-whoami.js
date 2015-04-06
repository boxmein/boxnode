// A quick command to tell you who you are for the bot.

var _ = require('underscore');
var Q = require('q');

var config, myconfig;

exports.type = 'command';

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`whoami` - what i think of you'
  };
};

exports.listener = function(line, words, respond, util) {
  var flags = {};

  // has owner access?
  flags.owner = util.matchesHostname(config.owner, line.hostmask);

  // has system. access?
  flags.syscmd = _.any(config.modules.system.authorized, function(e) {
    return util.matchesHostname(e, line.hostmask);
  });

  // has ops in this channel?
  var oppromise = util.isOperatorIn(line.nick, line.params[0])
                      .then(function(op) {
    console.log('op promise finished: ' + op);
    flags.op = op;
  });

  // has voice in this channel?
  var voicepromise = util.isVoiceIn(line.nick, line.params[0])
                      .then(function(voice) {
    console.log('voice promise finished: ' + voice);
    flags.voice = voice;
  });

  // when all promises are done, respond
  Q.all([oppromise,
         voicepromise]).done(function() {
    var endstr = 'you are ' + line.nick;

    if (flags.owner)
      endstr += ', the owner of this bot';

    if (flags.op)
      endstr += ', opped';

    if (flags.voice)
      endstr += ', voiced';

    respond(endstr);
  });
};

exports.init = function(c, mc, alias) {
  config = c;
  myconfig = m;
};
