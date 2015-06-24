var nodeutil = require('util');
var _ = require('underscore');

exports.type = 'command';
exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`echo <anything...>` - responds with anything'
  };
};

exports.listener = _stagger(function(line, words, respond, util) {
  var text = trim(words.slice(1).join(' '));
  if (text.length == 0) return;
  respond.PRIVMSG(line.params[0], '\u200b' + text);
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

function trim(str) {
  return str.replace(/(^\s+|\s+$)/g, '');
}
