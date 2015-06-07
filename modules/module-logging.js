/*
  module-logging.js
  This is an example of an 'event'-type module.
  This module gets access to the global configuration and all event streams, so
  you can do pretty much anything with those event streams, including injecting
  your own events.
*/
exports.type = 'event';

exports.init = function(app, irc, command, util) {

  /*
    'app.events' event stream:
    these events are sort of system-level: stuff like major IRC events (quit),
    new modules (module.new), ...
    EventEmitter2 lets you listen to wildcard events, eg module.*.
  */
  app.onAny(function() {
    console.log('\x1b[36;1mapp.events emitted: ' + this.event, arguments, '\x1b[0m');
  });


  /*
    'app.commandevents' event stream:
    these events fire when someone uses !command. the events contain the exact
    same arguments as one would expect for listener functions in the 'command'
    event type - the respective IRC line, the list of words the user spoke (
    including the command) and the respond function.
  */
  command.onAny(function() {
    console.log('\x1b[33;1mapp.commandevents emitted: ' + this.event, arguments, '\x1b[0m');
  });

  /*
    'app.ircevents' event stream:
    these are IRC lines broadcast as a more palatable format as returned by
    parseIRCLine.

    Say, an event would be Welcome, or PRIVMSG, or other numerics translated
    into appropriate commands. (See constants.json)
  */
  irc.onAny(function() {
    console.log('\x1b[37;0mapp.ircevents emitted: ' + this.event, arguments, '\x1b[0m');
  });
};
