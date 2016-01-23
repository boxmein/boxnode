var _ = require('underscore');

exports.type = 'event';

exports.init = function(s_app, s_irc, s_command, util) {
  var msg = util.config.get('modules.commandchar.message', 'just use %char');
  var words = util.config.get('modules.commandchar.match_words', ['prefix']);
  s_irc.on('PRIVMSG', function onAnnouncePrivmsg(line) {
    var chan = line.params[0];
    var user = line.nick;
    var text = line.params[1].toLowerCase();

    if (text.indexOf(util.config.get('nick', 'boxnode')) !== -1) {
      if ( _.any(words, function(w) { return text.indexOf(w) !== -1; }) ) {
        util.respond(chan, user, msg.replace(/%char/g, app.config.get('command_character')));
      }
    }
  });
};
