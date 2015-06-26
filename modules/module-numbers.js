
var _ = require('underscore');
var util = null;
var toplog = require('toplog');
var logger = new toplog({ concern: 'numbers' });

exports.type = 'command';

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    '*': '`numbers` - starts a new numbers game. See https://gist.github.com/boxmein/594135db55f2f8ef868b.',
    'guess': '`numbers.guess <gameid> <num>` - offer a guess for the game specified by game ID',
    'stop': '`numbers.stop <gameid>` - if you made the game, you can also stop it'
  };
};

function getCounts(n1, n2) {
  n1 = ('0000' + n1.toString()).slice(-4);
  n2 = ('0000' + n2.toString().slice(0, n1.length)).slice(-4);

  var sharedPos = 0;
  var sharedNum = 0;

  for (var i=0; i < n1.length; i++) {
    if (n1.indexOf(n2[i]) !== -1) {
      sharedNum += 1;
    }
  }

  for (var i=0; i<n1.length; i++) {
    if (n1[i] == n2[i]) {
      sharedPos += 1;
    }
  }

  return {
    'position': sharedPos,
    'number':   sharedNum
  };
}

function rand4() {
  var num, ns;
  while (true) {
    num = Math.floor(Math.random() * 8999) + 1000;
    ns = num.toString();
    if (_.uniq(ns).length == ns.length)
      return num;
  }
}

var games = {};
var gameid = 0;

exports.listener = function(line, words, respond, util) {
  var subcmd = this.event.slice(8);

  if (subcmd == '') {
    gameid =  (gameid + 1) % 50;

    games[gameid] = {
      author: line.nick,
      secretNumber: rand4()
    };
    logger.verbose('new game created by ' + line.nick + ': ' + gameid);
    respond('you created a new game! the game ID is ' + gameid);
  }

  else if (subcmd == 'guess') {
    var gid = words[1];
    var guess = words[2];

    try {
      gid = parseInt(gid, 10);
      if (isNaN(gid))
        throw new Error('not a base-10 number');
    } catch (err) {
      respond('`numbers.guess <gid> <guess>` - <gid> invalid: ' + err.message);
    }

    try {
      guess = parseInt(guess, 10);
      if (isNaN(guess))
        throw new Error('not a base-10 number');
    } catch (err) {
      respond('`numbers.guess <gid> <guess>` - <guess> invalid: ' + err.message);
    }

    if (games.hasOwnProperty(gid)) {
      var counts = getCounts(games[gid].secretNumber, guess);
      if (counts.position !== 4) {
        respond('(game ID ' + gid + ') the guess ' + guess + ': shares ' +
          counts.number + ' numbers, ' + counts.position + ' positioned right');
      }
      else {
        delete games[gid];
        respond('a winrar is you! correct guess');
      }
    } else {
      respond('No such game (' + gid.slice(0, 10) + ')');
    }
  }

  else if (subcmd == 'stop') {
    if (games.hasOwnProperty(words[1]) &&
         (games[words[1]].author == line.nick ||
          util.matchesHostname(util.config.get('owner', '*!*@unaffiliated/boxmein'), line.hostmask))) {
      delete games[words[1]];
      respond('successfully deleted game ' + words[1]);
    }
  }

  else if (subcmd == 'hax' && games.hasOwnProperty(words[1]) &&
          (games[words[1]].author == line.nick ||
           util.matchesHostname(util.config.get('owner', '*!*@unaffiliated/boxmein'), line.hostmask))) {
    if (games.hasOwnProperty(words[1])) {
      respond.PRIVMSG(line.nick, 'the secret number is: ' + games[words[1]].secretNumber);
    }
  }

  else if (subcmd == 'test') {
    var one = parseInt(words[1]);
    var two = parseInt(words[2]);

    if (isNaN(one)) { return respond ('first argument not a number'); }
    if (isNaN(two)) { return respond ('second argument not a number'); }

    one = ('0000'+one.toString()).slice(-4);
    two = ('0000'+two.toString()).slice(-4);
    var counts = getCounts(one, two);
    respond(one + ' <> ' + two + ' = (num, pos) ' + counts.number + ', ' + counts.position );
  }
};

exports.init = function(u, addAlias) {
  util = u;
  logger.currprops.loglevel = util.config.get('loglevels.numbers', 'VERBOSE');
};
