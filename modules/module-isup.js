var net = require('net');
var logger = new require('toplog')({concern: 'isup', loglevel: 'INFO'});

exports.type = 'command';

exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`isup <domain>` - Check if a website is up. (up = accepts connections on port 80)'
  };
};

exports.listener = function(line, words, respond, util) {
  var domain = words[1];
  if (!domain) {
    return respond('you didn\'t tell me a domain! try `help isup`!');
  }

  logger.verbose('connecting via unref-d socket to port 80 of', domain);
  var sock = net.connect(80, domain, function() {
    logger.debug(domain+':80 up');
    respond('Seems up to me!');
    sock.end();
  });

  sock.unref();
  sock.setTimeout(5000);

  sock.on('timeout', function() {
    logger.debug(domain+':80 did not respond in 5000ms');
    respond('It\'s down (timeout)!');
    sock.end();
  });

  sock.on('error', function(err) {
    logger.error(err);
    if (err.errno == 'ENOTFOUND') {
      respond('invalid address!');
    } else if (err.errno == 'ECONNREFUSED') {
      respond('It\'s down (connection refused)!');
    } else if (err.errno !== 'ETIMEDOUT') {
      respond('error handling request! :((( ('+err.errno+')');
    }
  });
};

exports.init = function(util, addAlias) {
  addAlias('justme', 'isup');
};