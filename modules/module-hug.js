// who said robots can't be kind?
exports.type = 'command';

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': 'hug [someone] - hug that someone. (or you)'
  };
};

exports.listener = function(line, words, respond, util) {
  var target = words[1] || line.nick;
  var message = line.nick == 'Doxin' ?
    '\x1Dhugs\x1D %nick' : 'hugs %nick';

  if (line.params[0] == util.config.get('nick')) {
    line.params[0] = line.nick;
  }

  respond.PRIVMSG(line.params[0],
    '\x01ACTION ' + message.replace('%nick', target) + '\x01');
};
