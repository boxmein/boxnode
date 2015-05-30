/*
  module-shinylogging.js
*/
exports.type = 'event';

var util = require('util');
var toplog = require('../toplog');

exports.init = function(config, app, irc, command) {

  /*
    'app.events' event stream:
    these events are sort of system-level: stuff like major IRC events (quit),
    new modules (module.new), ...
    EventEmitter2 lets you listen to wildcard events, eg module.*.
  */
  app.onAny(function() {
    var evt = this.event;

    if (evt == 'module.unload' ||
        evt == 'module.reload') {
        console.log(evt + ' ' + arguments[1]);
    }

    else if (/^quit\..*/.test(evt)) {
      console.log('QUITTING ' + evt);
    }

    else if (evt == 'ready') {
      console.log('ready to join channels!');
    }

    else {
      if (config.loglevel >= 3)
        console.log(arguments);
    }
  });


  /*
    'app.commandevents' event stream:
    these events fire when someone uses !command. the events contain the exact
    same arguments as one would expect for listener functions in the 'command'
    event type - the respective IRC line, the list of words the user spoke (
    including the command) and the respond function.
  */
  command.onAny(function(ircline) {
    var evt = this.event;
    console.log('\x1b[37;0m' + ircline.prefix + ' is using ' + evt + '('+ircline.params[1]+')');
  });

  /*
    'app.ircevents' event stream:
    these are IRC lines broadcast as a more palatable format as returned by
    parseIRCLine.

    Say, an event would be Welcome, or PRIVMSG, or other numerics translated
    into appropriate commands. (See constants.json)
  */
  irc.onAny(function(ircline) {
    var evt = this.event;
    if (evt == 'PRIVMSG') {
      // detect /me's
      var text = ircline.params[1];
      if (/\x01ACTION.*\x01/.test(text)) {
        var meText = text.replace('\x01ACTION','').replace('\x01','');
        console.log(util.format('\x1b[36;1m(%s) * %s %s\x1b[0m',
                    ircline.params[0], ircline.channel, meText));
      }
      else {
        console.log(util.format('\x1b[37;1m(%s) <%s> %s\x1b[0m',
                    ircline.params[0], ircline.nick, text));
      }
    }

    else if (evt == 'JOIN') {
      console.log(util.format('\x1b[36;1m%s (%s) joined %s (%s)\x1b[0m',
                  ircline.nick, ircline.prefix, ircline.params[0],
                  ircline.params[1]));
    }
    else if (evt == 'PART') {
      console.log(util.format('\x1b[36;1m%s (%s) left %s (%s)\x1b[0m',
                  ircline.nick, ircline.prefix, ircline.params[0],
                  ircline.params[1]));
    }
    else if (evt == 'QUIT') {
      console.log(util.format('\x1b[36;1m%s (%s) quit (%s)\x1b[0m',
                  ircline.nick, ircline.prefix, ircline.params[0]));
    }
    else if (evt == 'PING') {
      console.log('\x1b[37;1mpong!\x1b[0m');
    }
    else {
      if (config.loglevel >= 3) {
        console.log('\x1b[33;1mapp.ircevents emitted: ' + this.event,
          arguments, '\x1b[0m');
      }
    }
  });
};
