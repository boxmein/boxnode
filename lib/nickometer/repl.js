/*

  Read-Eval-Print-Loop to test nickometer.js

*/

var repl = require('repl');
var nickometer = require('./nickometer');

repl.start({
  prompt: 'nickometer>',
  eval: function(cmd, context, filename, callback) {
    var nick = cmd.replace(/(^\(|\)$)/g, '').replace(/(^\s+|\s+$)/g,'');
    var result = nickometer(nick);
    callback(null, result);
  }
});
