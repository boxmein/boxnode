/*

  Lame-O-Nickometer adapted to JS from
  https://github.com/deekayen/Lame-O-Nickometer/blob/master/nickometer.php

*/
function nickometer(nick) {
  var score = 0;

  console.log('starting with nick', nick);

  // Punish for special cases.

  for (var i=0; i<special_costs.length;i++) {
    var pair = special_costs[i];

    if (pair[0].test(nick)) {
      console.log('punishing for', pair[0], 'with', pair[1]);
      score += pair[1];
    }
  }

  // Punish for consecutive non-alphanumerics

  var counted = nick.match(/([^A-Za-z]{2,})/g);
  var count = counted instanceof Array ? counted.length : 0;

  // console.log(counted, count);

  if (count > 0) {
    score += Math.pow(10, count);
    console.log('punishing for repeat nonalnum with', Math.pow(10, count));
  }

  // Punish for too [[many]] ((layers))

  var paren_layer = (nick.length - nick.replace(/[\(\)]/g, '').length)/2 - 1;
  paren_layer = paren_layer > 0 ? paren_layer : 0;
  if (paren_layer > 0)
    console.log('found', paren_layer, 'extra layers of parentheses');

  var brack_layer = (nick.length - nick.replace(/[\[\]]/g, '').length)/2 - 1;
  brack_layer = brack_layer > 0 ? brack_layer : 0;
  if (brack_layer > 0)
    console.log('found', brack_layer, 'extra layers of brackets');

  var brace_layer = (nick.length - nick.replace(/[\{\}]/g, '').length)/2 - 1;
  brace_layer = brace_layer > 0 ? brace_layer : 0;
  if (brace_layer > 0)
    console.log('found', brace_layer, 'extra layers of braces');

  var total = paren_layer + brack_layer + brace_layer;
  if (total > 0)
    score += Math.pow(10, total);

  // Punish for k3wlt0k

  var weights = [5, 5, 2, 5, 2, 3, 1, 2, 2, 2];
  for (var i=0; i<9;i++) {
    var count = (nick.match(new RegExp(i, 'g')) || []).length;
    if (count > 0) {
      score += count * weights[i] * 30;
    }
  }

  // TODO: punish for case shifts
  // TODO: punish for number shifts

  // Punish for lame endings

  if (/[XZ][^A-Za-z]*$/.test(nick)) {
    console.log('Last character is super laaaaame');
    score += 50;
  }

  // Punish for each allcaps character
  var count = (nick.match(/[A-Z]/g) ||[]).length;
  if (count > 0) {
    console.log('found',count,'allcaps characters which are also laaaaame');
    score += Math.pow(7, count);
  }

  return score;
}

// apparently this isn't a standard function:
// Use a MDN polyfill
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Obje
//   cts/Math/tanh
Math.tanh = Math.tanh || function(x) {
  if (x === Infinity) {
    return 1;
  } else if (x === -Infinity) {
    return -1;
  } else {
    return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x));
  }
};

var special_costs = [
  // pairs let me do regex,string
  // while objects are string,string
  [ /69/i , 500],
  [ /dea?th/i , 500],
  [ /dark/i , 400],
  [ /n[i1]ght/i , 300],
  [ /n[i1]te/i , 500],
  [ /fuck/i , 500],
  [ /sh[i1]t/i , 500],
  [ /coo[l1]/i , 500],
  [ /kew[l1]/i , 500],
  [ /lame/i , 500],
  [ /dood/i , 500],
  [ /dude/i , 500],
  [ /rool[sz]/i , 500],
  [ /rule[sz]/i , 500],
  [ /[l1](oo?|u)[sz]er/i , 500],
  [ /[l1]eet/i , 500],
  [ /e[l1]ite/i , 500],
  [ /[l1]ord/i , 500],
  [ /k[i1]ng/i , 500],
  [ /pron/i , 1000],
  [ /warez/i , 1000],
  [ /phi[1l]ip/i , 1000],
  [ /xx/i , 100],
  [ /[rkx]0/i , 1000],
  [ /0[rkx]/i , 1000],
];


module.exports = nickometer;

