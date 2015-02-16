/*
  A module that throws an error on command.
*/
exports.type = 'command';
exports.listener = function(line, words, respond) {
  throw new Error('module-throw');
};
