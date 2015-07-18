
var _ = require('underscore');
var logger = new require('toplog')({concern: 'test', loglevel: 'INFO'});

exports.type = 'command';

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    '*': '`rand` - returns a random number between 0 and 1. more available if you `list rand`!',
    'range': '`rand.range <from> <to>` - returns a random number between <from> and <to>',
    'coin': '`rand.coin` - flip a coin',
    'coin2': '`rand.coin2` - flip a cheat coin',
    'dice': '`rand.dice <dice-definition>` - flip a 6-sided die or a standard definition of dice (eg 2d20) [max: 5d120]',
    'dice2': '`rand.dice2` - flip a cheat 6-sided die',
    '8ball': '`rand.8ball` - flip a twenty-sided magic eight-ball dice',
    'pick': '`rand.pick <things...>` - pick one of the things (things have to be separated by spaces)',
    'shuffle': '`rand.shuffle <things>` - shuffle a list of things (also separated by spaces)'
  };
};

exports.listener = function(line, words, respond, util) {
  var shortEvt = this.event.slice(5);

  if (shortEvt == '8ball') {
    respond(_.sample(magic8ball));
  }
  else if (shortEvt == 'range' && words.length == 3) {
    var from = parseInt(words[1], 10);
    var to = parseInt(words[2], 10);
    respond(Math.floor((Math.random() * (to - from)) + from));
  }
  else if (shortEvt == 'coin') {
    respond(Math.random() > 0.5 ? 'heads' : 'tails');
  }
  else if (shortEvt == 'coin2') {
    respond(Math.random() > 0.7 ? 'heads' : 'tails');
  }
  else if (shortEvt == 'dice') {
    var diceDef = words[1]; 
    var times = 1, sides = 6;
    var results = [];

    if (diceDef) {
      var ds = diceDef.split('d');
      var dt = parseInt(ds[0], 10);
      var du = parseInt(ds[1], 10);
      if (!isNaN(dt) && !isNaN(du)) {
        times = Math.max(dt, 5);
        sides = Math.max(du, 120);
      }
    }

    while (times --> 0) 
        results.push(Math.round(Math.random() * (sides-1))+1);

    respond(results.join(', '));
  }
  else if (shortEvt == 'dice2') {
    // this looks cooler than it is
    respond(Math.random() > 0.7 
            ? '1' : Math.random() > 0.6 
              ? '2' : Math.random() > 0.5 
                ? '3' : Math.random() > 0.4 
                  ? '4' : Math.random() > 0.3 
                    ? '5' : '6');
  }
  else if (shortEvt == 'shuffle' && words.length > 1) {
    respond(_.shuffle(words.slice(1)));
  } 
  else if (shortEvt == 'pick' && words.length > 1) {
    respond(_.sample(words.slice(1)));
  }
  else if (shortEvt == '') {
    respond(Math.random());
  }
  else {
    respond('no such subcommand known - try `rand.help!`');
  }
};

var magic8ball = ["It is certain",
  "It is decidedly so",
  "Without a doubt",
  "Yes definitely",
  "You may rely on it",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
  "Reply hazy - try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful"];