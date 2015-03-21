exports.type = 'command';
var validator = require('validator');

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': 'lets you screw around with the validator.'
  };
};

exports.listener = function(line, words, respond) {
  var word = this.event.slice(this.event.indexOf('.')+1);
  console.log(this.event, word);
  if (word == 'list') {
    respond(JSON.stringify(Object.keys(validator)));
  }
  if (validator.hasOwnProperty(word)) {
    respond(validator[word](words.slice(1)));
  }
};


console.log('reloaded validatortest');

