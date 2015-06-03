exports.type = 'command';

// Store the 'message' configuration value as a global.
var message;

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`version` - literally outputs the version # of this bot...'
  };
};


exports.listener = function(line, words, respond) {
  respond(message);
};

exports.init = function(config, myconfig, alias) {
  message = myconfig.str;
};
