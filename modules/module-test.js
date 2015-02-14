// This means it has a listener, help and list functions.
exports.type = 'command';

var message;

// List all the different commands you define here.
// * is equivalent to calling it without a sub-command.
exports.listAll = function() {
  return ['*'];
};

// Get the help texts for all the different commands you have here.
exports.getHelp = function() {
  return {
    '*': 'test command! responds with hello and how it was called.'
  };
};

// Called every time the "test" event (or "test.*") event fires.
exports.listener = function(line, words, respond) {
  respond(message.replace('%cmd', this.event));
};

// Called when the module is loaded.
exports.init = function(config, myconfig) {
  console.log('initialized test with ', myconfig);
  message = myconfig.message;
};
