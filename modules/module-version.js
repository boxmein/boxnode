exports.type = 'command';

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`version` - literally outputs the version # of this bot...'
  };
};

var getMessage;
exports.listener = function(line, words, respond, util) {
  respond(util.config.get('modules.version.str'));
};
