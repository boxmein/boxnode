var logger = new require('toplog')({concern: 'moo', loglevel: 'VERBOSE'});
exports.type = 'command';
exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`moo` - moo'
  };
};

exports.listener = _stagger(function(line, words, respond, util) {
  logger.info('mooooooooo');
  respond.PRIVMSG(line.channel, 'moooooooooooo');
}, 500);


// Stagger function calls over a time
function _stagger(func, delay, thisObj) {
  // queue of function arguments
  var queue = [];
  var performing = false;

  function startPerforming() {
    if (performing) return;
    performing = true;

    setTimeout(callFunc, delay);
  }

  function callFunc() {
    var a = queue.shift();

    if (a) {
      func.apply(thisObj, a);
      if (queue.length > 0) {
        setTimeout(callFunc, delay);
      } else {
        performing = false;
      }
    }
  }

  return function() {
    queue.push(arguments);

    if (!performing) {
      startPerforming();
    }
  };
}
