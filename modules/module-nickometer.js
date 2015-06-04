/*
  Nickometer module for this bot
  ~boxmein
*/
var nickometer = require('./nickometer');

exports.type = 'command';
exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`nickometer [nick]` - return how lame your / someone else\'s nickname is'
  };
};

exports.listener = function(line, words, respond) {
  if (words.length > 1) {
    var nick = words[1];
    var your = false;
  }
  else {
    var nick = line.nick;
    var your = true;
  }

  var score = nickometer(nick);

  if (your) {
    return respond('Your nickname gets a lameness score of ' + score + '!');
  }

  respond('The nickname `' + nick + '` gets a lameness score of ' + score + '!');
};

exports.init = function(util, alias) {};

