// Simple logger

var util = require('util');

var DEFAULTS = {
  // Logging levels. Case insensitive.
  // Smallest index is most verbose, biggest index is most important.
  'loglevels': ['VERBOSE', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'FATAL'],
  // Level at which log entries are allowed in the output.
  'loglevel': 'VERBOSE',
  // If you need to pass in a concern if you want a logger
  'separation_of_concerns': true,
  // Default concern
  'concern': '(global)',
  // If to timestamp the logging
  'timestamp': true,
  // Format string for everything
  'formatstring': '%time | %concern %loglevel1 %message',
  // If to color the format string with ANSI escape sequences
  'color': true,
  // Colors corresponding to the log level
  'colors': {
    'VERBOSE': '37;0',
    'DEBUG': '37;0',
    'INFO': '36;1',
    'WARNING': '33;1',
    'ERROR': '31;1',
    'FATAL': '31;1' },

  // you can enable/disable individual loggers with DEBUG=<concern>
  'enabled': true
};

function clone(obj) {
  var target = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      target[i] = obj[i];
    }
  }
  return target;
}

module.exports = function(props) {
  this.currprops = clone(DEFAULTS);

  if (typeof props == 'string') {
    this.currprops.concern = props;
  } else {
    for (var k in props) {
      if (props.hasOwnProperty(k)) {
        this.currprops[k] = props[k];
      }
    }
  }

  var that = this;
  var prop = that.currprops;

  var logIndex = prop.loglevels.indexOf(prop.loglevel);

  function log(loglevel, text) {
    if (!prop.enabled) return;

    var endstr = prop.formatstring;

    // Coloring
    if (prop.color) {
      endstr = '\x1b[' + prop.colors[loglevel.toUpperCase()] + 'm' +
               endstr + '\x1b[0m';
    }

    // Date stamps
    var d = new Date();
    var dstr = '' + ('0'+d.getHours()).slice(-2) + ':' +
                    ('0'+d.getMinutes()).slice(-2) + ':' +
                    ('0'+d.getSeconds()).slice(-2);

    endstr = endstr.replace('%time', prop.timestamp ? dstr : '');

    // Separation of concerns
    endstr = endstr.replace('%concern', prop.separation_of_concerns ? prop.concern : '');

    // Output log levels
    endstr = endstr.replace('%loglevel1', loglevel[0]);
    endstr = endstr.replace('%loglevel', loglevel);

    // Concat other arguments

    var msg = '';
    for (var i = 1; i < arguments.length; i++) {
      if (!arguments.hasOwnProperty(i))
        break;
      var s = arguments[i];

      if (typeof s == 'string') {
        msg += ' ' + s;
      } else {
        msg += ' ' + util.inspect(s);
      }
    }

    // And the actual message >_>
    endstr = endstr.replace('%message', msg);

    if (prop.loglevels.indexOf(loglevel) >= logIndex) {
      console.log(endstr);
    }

  }

  var endobj = {};

  for (var i = 0; i < prop.loglevels.length; i++) {
    endobj[prop.loglevels[i].toLowerCase()] = log.bind(that, prop.loglevels[i]);
  }

  // usable as a swap for conso
  endobj.log = log.bind(that, prop.loglevels[0]);

  endobj.properties = prop;

  // DEBUG=irc node ircbot
  if (process && process.env && process.env.DEBUG) {
    var env_enabled_concerns = process.env.DEBUG.split(',');
    prop.enabled = env_enabled_concerns.indexOf(prop.concern) !== -1;
    if (prop.enabled) 
      prop.loglevel = prop.loglevels[0];
  }

  return endobj;
};
