// Channel op module
var Q = require('q');
var _ = require('underscore');

var logger = new require('toplog')({concern: 'operator', loglevel: 'VERBOSE'});

exports.type = 'command';

var util = null;

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
  util.isOperatorIn(util.config.get('nick', 'boxnode'), line.params[0]).done(function(y) {
    if (!y) {
      if (util.config.get('loud', false))
        respond(util.config.get('modules.operator.not_an_op', 'I am not an op!'));
      return;
    }

    // 2. the caller has to be permitted to do the thing
    var permitted = util.matchesHostname(owner, line.hostmask);

    permitted = permitted || _.any(util.config.get('modules.operator.authorized'), function(ea) {
      return util.matchesHostname(ea, line.hostmask);
    });

    logger.verbose('caller permitted: their hostname is allowed');

    var oppromise, voicepromise;

    if (util.config.get('modules.operator.ops_allowed', false)) {
      var oppromise = util.isOperatorIn(line.nick, line.params[0])
                          .then(function(y) {
        permitted = permitted || y;
        logger.verbose('caller permitted: ops_allowed && they\'re an op');
      });
    } else {
      oppromise = Q.defer();
      oppromise.resolve();
      oppromise = oppromise.promise;
    }


    if (util.config.get('modules.operator.voices_allowed', false)) {
      var voicepromise = util.isVoiceIn(line.nick, line.params[0])
                             .then(function(y) {
        permitted = permitted || y;
        logger.verbose('caller permitted: voices_allowed && they\'re a voice');
      });
    } else {
      voicepromise = Q.defer();
      voicepromise.resolve();
      voicepromise = voicepromise.promise;
    }


    Q.all([voicepromise, oppromise]).then(function() {

      if (!permitted) {
        if (util.config.get('modules.operator.loud'))
          respond(util.config.get('modules.operator.not_allowed') || 'You are not allowed to do this!');
        return;
      }

      logger.debug('Performing op command: ' + call)

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

exports.init = function(u, alias) {
  alias('op', 'operator.op');
  util = u;
};
