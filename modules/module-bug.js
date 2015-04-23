exports.type = 'command';
var fs = require('fs');
var lastUsed = {};
var logFile = null;
var myconfig = null;


exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`bug` - send a report to my log about anything. keep it tweet-length :D'
  };
};

exports.listener = function(line, words, respond) {
  if (lastUsed[line.hostname]) {
    // console.log('we have a last-used entry', lastUsed[line.hostname], lastUsed[line.hostname] + 300000, Date.now());

    if ((lastUsed[line.hostname] + 5000 * 60) > Date.now()) {
      respond('Wait 5 minutes until adding another one, kay :D');
      return;
    } else {
      lastUsed[line.hostname] = Date.now();
    }
  } else {
    // console.log('we dont have a last-used log entry');
    lastUsed[line.hostname] = Date.now();
  }

  if (words.length == 0)
    respond('put something in the description! see `help bug`');

  var endstr = '' + Date.now() + ': ' + line.hostmask + ' - ' + words.join(' ').slice(0, 140);
  console.log('\x1b[35;1m' + endstr + '\x1b[0m');

  fs.write(logFile, endstr + '\r\n', null, 'utf8', function() {
    respond('bug report successful!');
  })
};

exports.init = function(config, mc, alias) {
  logFile = fs.openSync('bug.log', 'a');
  myconfig = mc;
  fs.write(logFile, 'started logging at ' + Date.now() + '\n', 'utf8');
};