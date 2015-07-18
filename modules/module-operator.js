// Channel op module
var Q = require('q');
var _ = require('underscore');

var logger = new require('toplog')({concern: 'operator'});

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

  logger.verbose('checking if I am operators');

  // 1. *I* have to be ops
  util.isOperatorIn(util.config.get('nick', 'boxnode'), line.params[0]).done(function(y) {
    logger.verbose('got response - ' + y);
    if (!y) {
      logger.verbose('I am not of operators');
      if (util.config.get('loud', false))
        respond(util.config.get('modules.operator.not_an_op', 'I am not an op!'));
      return;
    }

    logger.verbose('checking if the target is allowed to use op commands');

    // 2. the caller has to be permitted to do the thing
    var permitted = util.matchesHostname(util.config.get('owner'), line.hostmask);

    if (permitted) logger.verbose('caller is owner, permitted');

    permitted = permitted || _.any(util.config.get('modules.operator.authorized'), function(ea) {
      return util.matchesHostname(ea, line.hostmask);
    });

    logger.verbose('caller permitted: their hostname is on the authorized list');

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
      logger.verbose('finished querying if the user is voice/op, now gonna perform?');

      if (!permitted) {
        if (util.config.get('modules.operator.loud'))
          respond(util.config.get('modules.operator.not_allowed') || 'You are not allowed to do this!');
        return;
      }

      // Actually do the shit they told us to

      words.shift();

      var channel = words.shift(), target;

      if (!util.isChannel(channel)) {
        target = channel;
        channel = line.params[0];
      }

      logger.info(line.hostmask, 'is doing', call, target);

      target = target || words.shift() || line.hostmask;

      switch (call) {
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

        case 'ban':
          respond.MODE(channel, '+b', target);
          break;

        case 'unban':
          respond.MODE(channel, '-b', target);
          break;

        case 'quiet':
          respond.MODE(channel, '+q', target);
          break;

        case 'unquiet':
          respond.MODE(channel, '-q', target);
          break;

        case 'mode':
          respond.MODE(channel, target, words.shift() || '');
          break;

        case 'kick':
          respond.RAW('KICK ' + channel + ' :' + target);
          break;

        case 'invite':
          respond.RAW('INVITE ' + channel + ' :'+ target);
          break;

        case 'topic':
          respond.RAW('TOPIC ' + channel + ' :' + target + ' ' + words.join(' '));
          break;

        default:
          logger.verbose('did not find this subcommand - try `list operator!`');
          break;
      }
    });

  });
};

exports.init = function(u) {
  u.addAlias('op', 'operator.op');
  u.addAlias('deop', 'operator.deop');

  u.addAlias('ban', 'operator.ban');
  u.addAlias('unban', 'operator.unban');

  u.addAlias('voice', 'operator.voice');
  u.addAlias('devoice', 'operator.devoice');

  u.addAlias('quiet', 'operator.quiet');
  u.addAlias('unquiet', 'operator.unquiet');

  u.addAlias('kick', 'operator.kick');
  u.addAlias('invite', 'operator.invite');
  u.addAlias('topic', 'operator.topic');

  util = u;

  logger.properties.loglevel = util.config.get('loglevels.operator', 'VERBOSE');
};
