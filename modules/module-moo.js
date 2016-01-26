var logger;
exports.type = 'command';
exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`moo` - moo'
  };
};

exports.init = function(u) {
  logger = new require('toplog')({
    concern: 'moo',
    loglevel: util.config.get('modules.moo.loglevel', util.config.get('loglevel', 'INFO'))
  });
  exports.listener = u.funcStagger(function(line, words, respond, util) {
    logger.info('mooooooooo');
    respond.PRIVMSG(line.channel, 'moooooooooooo');
  }, 500);
};
