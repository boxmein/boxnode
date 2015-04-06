// Channel op module
var Q = require('q');
var _ = require('underscore');

exports.type = 'command';

var config, nick, owner, DEBUG;

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    '*': 'can I use admin stuff?',

    'op': '`op [#channel] <target>` - make someone a channel operator',
    'deop': '`deop [#channel] <target>` - remove someone\'s channel operator powers',

    'voice': '`voice [#channel] <target>` - add voice to someone',
    'devoice': '`devoice [#channel] <target>` - remove voice from someone',

    'ban': '`ban [#channel] <target>` - ban someone from the channel',
    'unban': '`unban [#channel] <target>` - unban someone from the channel',

    'kick': '`kick [#channel] <target>` - kicks the target off the channel',
    'mode': '`mode [#channel] <mode> <target> ` - sets a bunch of modes on the target',
    'quiet': '`quiet [#channel] <target>` - sets the +q flag on a target, like a ban except they can join',
    'invite': '`invite [#channel] <target>` - invite the target to the channel',
    'topic': '`topic [#channel] <topic...>` - set the channel topic'
  };
};

exports.listener = function(line, words, respond, util) {
  var call = this.event.slice(9);

  // 1. *I* have to be ops
  util.isOperatorIn(nick, line.params[0]).done(function(y) {
    if (!y) {
      if (config.loud)
        respond(config.not_an_op || 'I am not an op!');
      return;
    }

    // 2. the caller has to be permitted to do the thing
    var permitted = util.matchesHostname(owner, line.hostmask);

    permitted = permitted || _.any(config.authorized, function(ea) {
      return util.matchesHostname(ea, line.hostmask);
    });

    if(DEBUG && permitted)
      console.log('caller permitted: their hostname is allowed');

    var oppromise, voicepromise;


    if (config.ops_allowed) {
      var oppromise = util.isOperatorIn(line.nick, line.params[0])
                          .then(function(y) {
        permitted = permitted || y;
        if (DEBUG && y)
          console.log('caller permitted: ops_allowed && they\'re an op');
      });
    } else {
      oppromise = Q.defer();
      oppromise.resolve();
      oppromise = oppromise.promise;
    }


    if (config.voices_allowed) {
      var voicepromise = util.isVoiceIn(line.nick, line.params[0])
                             .then(function(y) {
        permitted = permitted || y;
        if (DEBUG && y)
          console.log('caller permitted: voices_allowed && they\'re a voice');
      });
    } else {
      voicepromise = Q.defer();
      voicepromise.resolve();
      voicepromise = voicepromise.promise;
    }


    Q.all([voicepromise, oppromise]).then(function() {

      if (!permitted) {
        if (config.loud)
          respond(config.not_allowed || 'You are not allowed to do this!');
        return;
      }

      console.log('Performing op command: ' + call)

      // Actually do the shit they told us to

      var command = call;

      words.shift();

      var channel = words.shift(), target;

      if (!util.isChannel(channel)) {
        target = channel;
        channel = util.params[0];
      }

      target = target || words.shift() || line.hostmask;

      switch (command) {
        case 'op':
          respond.MODE(channel, '+o', target);
          break;

        case 'deop':
          respond.MODE(channel, '-o', target);
          break;

        case 'voice':
          respond.MODE(channel, '+v', target);
          break;

        case 'devoice':
          respond.MODE(channel, '-v', target);
          break;
      }
    });

  });
};

exports.init = function(cfg, myconfig, alias) {
  alias('op', 'operator.op');

  DEBUG = cfg.debug;

  config = myconfig;
  nick = cfg.nick;
  owner = cfg.owner;
};
