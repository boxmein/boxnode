/*
  Nickometer module for this bot
*/
exports.type = 'command';
exports.listAll = function() { return ['*']; };
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
    return respond('Your nickname is ' + score + '% lame!');
  }

  respond('The nickname `' + nick + '` is ' + score + '% lame!');
};

// Following adapted from
// https://github.com/deekayen/Lame-O-Nickometer/blob/master/nickometer.php

var special_costs = [
  // pairs let me do regex,string
  // while objects are string,string
  [/69/i, 500],
  [/dea?th/i, 500],
  [/dark/i, 400],
  [/n[i1]ght/i, 300],
  [/n[i1]te/i, 500],
  [/fuck/i, 500],
  [/sh[i1]t/i, 500],
  [/coo[l1/i, 500],
  [/kew[l1/i, 500],
  [/lame/i, 500],
  [/dood/i, 500],
  [/dude/i, 500],
  [/rool[sz/i, 500],
  [/rule[sz/i, 500],
  [/[l1](oo?|u)[sz]er/i, 500],
  [/[l1]eet/i, 500],
  [/e[l1]ite/i, 500],
  [/[l1]ord/i, 500],
  [/k[i1]ng/i, 500],
  [/pron/i, 1000],
  [/warez/i, 1000],
  [/phi[1l]ip/i, 1000],
  [/xx/i, 100],
  [/\[rkx]0/i, 1000],
  [/\0[rkx/i, 1000],
];

function nickometer(nick) {
  var score = 0;

  // Punish for special cases.

  for (var i=0; i<special_costs.length;i++) {
    var pair = special_costs[i];

    if (pair[0].test(nick)) {
      console.log('punishing for', pair[0], 'with', pair[1]);
      score += pair[1];
    }
  }

  // Punish for consecutive non-alphanumerics

  var count = nick.match(/([^A-Za-z]{2,})/g).length;

  if (count > 0) {
    score += Math.pow(10, count);
    console.log('punishing for repeat nonalnum with', Math.pow(10, count));
  }

  // Punish for more than 1 layer of balanced surrounding parentheses
  var sans_parens = nick.replace(/^\((.+)\)$/, "$1");
  var paren_layer = (nick.length - sans_parens.replace(/[\(\)]/g, '').length)/2;

  console.log('found', paren_layer,'extra layers of parentheses, punishing');

  // Punish for more than 1 layer of balanced surrounding brackets
  var sans_bracks = nick.replace(/^\[(.+)\]$/, "$1");
  var brack_layer = (nick.length - sans_bracks.replace(/[\[\]]/g, '').length)/2;

  console.log('found', brack_layer,'extra layers of brackets, punishing');

  // Punish for more than 1 layer of balanced surrounding braces
  var sans_braces = nick.replace(/^\{(.+)\}$/, "$1");
  var brace_layer = (nick.length - sans_braces.replace(/[\{\}]/g, '').length)/2;

  console.log('found', brace_layer,'extra layers of braces, punishing');

}
