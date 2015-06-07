exports.type = 'command';

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`version` - literally outputs the version # of this bot...'
  };
};


exports.listener = function(line, words, respond) {
  respond(getMessage());
};

exports.init = function(util, alias) {
  getMessage = util.config.get.bind(util.config, 'modules.version.str');
};
