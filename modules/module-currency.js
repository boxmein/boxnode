var logger = new require('toplog')({concern: 'currency', loglevel: 'verbose'});
var monets = require('money');

exports.type = 'command';

exports.listAll = function() {
  return Object.keys(exports.getHelp());
};

exports.getHelp = function() {
  return {
    '*': '`currency <amount> <from> to <to>` - convert an amount of money from one currency to another. uses pretty live rates :P'
  };
};

var conversionRx = /([0-9.]+) ([a-z_-]+) (to|\->) ([a-z_-]+)/i;
exports.listener = function(line, words, respond, util) {
  var shortEvt = this.event.slice(5);
  var lin = words.slice(1).join(' ');

  var data = lin.match(conversionRx);

  if (data) {
    logger.verbose('found data!', data);
    var amount = data[1];
    var curr1 = data[2];
    var curr2 = data[4];

    amount = parseFloat(amount, 10);

    if (isNaN(amount)) {
      return respond('The amount was not a number!');
    }

    curr1 = curr1.toUpperCase();
    curr2 = curr2.toUpperCase();

    try {
      logger.verbose('trying monets.convert(' + amount + ', {from: ' + curr1 + ', to: ' + curr2 + '})!');
      respond(monets.convert(amount, {from: curr1, to: curr2}));
    } catch (err) {
      if (err == 'fx error') {
        respond('money.js barfed, one of your currencies probably doesn\'t exist!');
      } else {
        throw err;
      }
    }
  } else {
    logger.verbose('data was falsey - ', data);
    respond('couldn\'t parse your response! (try `help currency`)');
  }
};

exports.init = function(util, addAlias) {

};
