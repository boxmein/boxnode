/*
  module-shinylogging.js
*/
exports.type = 'event';

var util = require('util');
var logger;

// events for which we'll just log all parameters
var ircEventParamLog = ['ISupport', 'MOTD', 'EndOfMOTD', 'LUserChannels',
    'LUserClient', 'LUserMe', 'MyInfo', 'Welcome', 'YourHost', 'NamReply',
    'EndOfNames', 'Created', 'VHostAssigned'];

exports.init = function(app, irc, command, u) {
  logger = new require('toplog')({
    concern: 'irc',
    loglevel: u.config.get('modules.shinylogging.loglevel', u.config.get('loglevel', 'INFO'))
  });

  logger.properties.colors.INFO = '37;1';

  app.onAny(function() {
    var evt = this.event;

    if (evt == 'module.unload' ||
        evt == 'module.reload') {
        logger.verbose(evt + ' ' + arguments[1]);
    }

    else if (evt == 'module.errorinit') {
      logger.error(evt, arguments);
    }

    else if (/^quit\..*/.test(evt)) {
      logger.verbose('(app) QUITTING ' + evt);
    }

    else if (evt == 'ready') {
      logger.verbose('(app) ready to join channels!');
    }

    else {
      logger.verbose("(app) " + evt + " " + arguments);
    }
  });

  command.onAny(function(ircline) {
    var evt = this.event;
    logger.verbose('\x1b[37;0m' + ircline.prefix + ' is using ' + evt + '('+ircline.params[1]+')');
  });

  irc.onAny(function(ircline) {
    var evt = this.event;

    // Channel / private messages
    if (evt == 'PRIVMSG') {
      // detect /me's
      var text = ircline.params[1];
      if (/\x01ACTION.*\x01/.test(text)) {
        var meText = text.replace('\x01ACTION','').replace('\x01','');
        logger.verbose(util.format('\x1b[36;1m(%s) * %s %s\x1b[0m',
                    ircline.params[0], ircline.nick, meText));
      }
      else {
        logger.verbose(util.format('\x1b[37;1m(%s) <%s> %s\x1b[0m',
                    ircline.params[0], ircline.nick, text));
      }
    }

    // Channel / user notices
    else if (evt == 'NOTICE') {

      var target = ircline.nick || ircline.prefix;

      var mynick = u.config.get('nick', 'boxnode');
      if (ircline.params[0] !== mynick) {
        target += '/' + ircline.params[0];
      }
      logger.verbose(util.format('\x1b[36;1m-%s- %s\x1b[0m', target, ircline.params[1]));
    }

    // Joins / parts / quits
    else if (evt == 'JOIN') {
      logger.verbose(util.format('\x1b[36;1m%s (%s) joined %s\x1b[0m',
                  ircline.nick, ircline.prefix, ircline.params[0]));
    }
    else if (evt == 'PART') {
      logger.verbose(util.format('\x1b[36;1m%s (%s) left %s (%s)\x1b[0m',
                  ircline.nick, ircline.prefix, ircline.params[0],
                  ircline.params[1]));
    }
    else if (evt == 'QUIT') {
      logger.verbose(util.format('\x1b[36;1m%s (%s) quit (%s)\x1b[0m',
                  ircline.nick, ircline.prefix, ircline.params[0]));
    }

    // Ping replies
    else if (evt == 'PING') {
      logger.verbose('\x1b[37;1mpong!\x1b[0m');
    }

    // MOTD
    else if (evt == 'MOTD' || evt == 'EndOfMOTD' || evt == 'MOTDStart') {
      logger.verbose(evt+':', ircline.params[0], ircline.params[1]);
    }

    // Channel topics
    else if (evt == 'Topic') {
      logger.verbose(util.format('\x1b[36;1mTopic for %s is: %s',
          ircline.params[1], ircline.params[2]));
    }

    // Channel Topic Last Set By message
    else if (evt == '333') {
      logger.verbose('Topic last set on ' + ircline.params[3] + ' by ' + ircline.params[2]);
    }

    // various pointless messages
    else if (ircEventParamLog.indexOf(evt) !== -1) {
      logger.verbose('*** ' + evt, ircline.params.join(' '));
    }

    // Default logging is very loud
    else {
      if (u.config.get('loglevel') >= 3) {
        logger.verbose('\x1b[33;1mapp.ircevents emitted: ' + this.event + ' ' +
          util.inspect(arguments) + '\x1b[0m');
      }
    }
  });
};
