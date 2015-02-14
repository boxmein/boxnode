exports.type = 'event';

exports.init = function(config, app, irc, command) {

  app.onAny(function() {
    console.log('\x1b[36;1mapp.events emitted: ' + this.event,
      config.loglevel > 3 ? arguments : '', '\x1b[0m');
  });

  command.onAny(function() {
    console.log('\x1b[33;1mapp.commandevents emitted: ' + this.event,
      config.loglevel > 3 ? arguments : '', '\x1b[0m');
  });

  irc.onAny(function() {
    console.log('\x1b[37;0mapp.ircevents emitted: ' + this.event,
      config.loglevel > 3 ? arguments : '', '\x1b[0m');
  });
};
