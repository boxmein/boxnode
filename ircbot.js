var net     = require('net')
  , path    = require('path')
  , fs      = require('fs')
  , _       = require('underscore')
  , Q       = require('q')
  , Emitter = require('eventemitter2').EventEmitter2
  , toplog  = require('./toplog.js')
  // stolen from https://github.com/SBSTP/irc/blob/master/constants.go
  , CONSTS  = require('./constants.json')
  , _CONSTS = _.invert(CONSTS);

var logger = new toplog({concern: 'ircbot', loglevel: 'VERBOSE'});

var app = {
  // generic system-level events
  events: new Emitter({ wildcard: true }),

  // IRC-level events (privmsg, etc)
  ircevents: new Emitter({ wildcard: true }),

  // command events (eg call this command!)
  commandevents: new Emitter({ wildcard: true }),

  // module store
  modules: {},

  // state store for stuff like channel nick lists
  state: {
    // channel objects containing list of nicks
    channels: {},

    // RPL_ISUPPORT things
    isupport: {},

    // common chars for different levels of authority
    // will update to match server characters
    OP_CHAR: '@',
    VOICE_CHAR: '+'
  },

  // utility functions
  util: {
    // parseIRCLine
    // matchesHostname
    // getNames
    // isOperatorIn
    // isVoiceIn
    // addAlias
    // config.get
  },

  // command aliases
  aliases: {},

  // configManager
};


//
// Mega-error-handlers.
//

logger.verbose('Setting up error handlers...');

app.events.on('error', function() {
  logger.error('\x1b[31;1merror in app.events: ' + arguments + '\x1b[0m');
});


// Unload a module if it throws up
app.commandevents.on('error', function(err, module, line) {
  logger.error('\x1b[31;1merror in a module:', module.name, err, '\x1b[0m');
  logger.verbose(err.stack);

  app.events.emit('module.unload', module.name);

  if (config.get('announce_module_crash', false)) {
    var msg = config.announce_module_message || 'module crashed: "%module"';
    if (line && line.params && line.nick)
      respond(line.params[0], line.nick, msg.replace('%module', module.name));
  }
});

// IRC event error? :O
app.ircevents.on('error', function() {
  logger.error('\x1b[31;1merror in app.ircevents: ' + arguments + '\x1b[0m');
});


//
// Config API
//

var configManager, config;

config = configManager = app.config = require('./config_manager.js');
app.config.reload();

app.util.config = {};
app.util.config.get = app.config.get.bind(configManager);

app.events.on('reloadconfig', function onReloadConfig() {
  app.config.reload();
});

//
// Some useful functions
//


/** Parse a line of IRC into an object.

  ":NickServ!NickServ@services. NOTICE boxnode :You gotta identify bro\r\n"
  :<prefix>                     <num>  <params...>                    \r\n

  turns into:

  {
    "prefix": "NickServ!NickServ@services.",
    "numeric": "NOTICE", // this is the actual command sent from the IRC server
    "command": "NOTICE", // this is a name for the command, see constants.json
    "params": [
      "boxnode",
      "You gotta identify bro"
    ],

    // Might not be included.
    "nick": "NickServ",
    "username": "NickServ",
    "hostname": "services."
  }

*/
function parseIRCLine(ea) {
  if (!ea || ea == '')
    return;

  var hostrx = /^(.+)!(.+)@(.+)$/;

  var ircline = {};
  var words = ea.split(' ');

  // parse and append prefix
  if (ea[0] === ':') {
    ircline.prefix = words.shift().slice(1);

    if (hostrx.test(ircline.prefix)) {
      var a = ircline.prefix.match(hostrx);
      if (a.length == 4) {
        ircline.nick = a[1];
        ircline.username = a[2];
        ircline.hostname = a[3];
        ircline.hostmask = ircline.prefix;
      }
    }
  }

  ircline.numeric = words.shift();


  if (!_CONSTS.hasOwnProperty(ircline.numeric)) {
    // console.warn(ircline.numeric, 'is not recognized');
    ircline.command = ircline.numeric;
  }
  else
    ircline.command = _CONSTS[ircline.numeric];

  ircline.params = [];


  // start parsing params
  for (var i = 0; i < words.length; i++) {
    if (words[i][0] !== ':') {
      ircline.params.push(words[i]);
      continue;
    }

    // got a trailing parameter
    var str = words.slice(i).join(' ').slice(1);
    ircline.params.push(str);
    break;
  }

  return ircline;
}


/** Is this IRC line valid? */
function isValidIRCLine(line) {
  return line && !(line.prefix == '' ||
                   line.command == undefined);
}


/** Return if a hostname matches a pattern.
  * Patterns are regexes where * completes to (.+?) and the entire thing is
  * surrounded with ^ and $.
  */
function matchesHostname(a, b) {
  logger.verbose('matchesHostname called by', matchesHostname.caller.name);

  if (typeof a !== 'string') {
    throw new Error('invalid parameter #1, string expected, got ' + typeof a);
  }
  if (typeof b !== 'string') {
    throw new Error('invalid parameter #2, string expected, got ' + typeof b);
  }

  var matcher = new RegExp('^' + a.replace(/[\*]/g, '(.+?)') + '$');
  // console.log(matcher);
  // console.log('matching a to b', a, b);
  return matcher.test(b);
}


/** Writes a line of data to the socket. */
function writeToSocket(data) {
  logger.verbose(data);
  sock.write(data + '\r\n');
}


/** Turns the params array returned by parseIRCLine back into an IRC-valid param
  * string. Prepends a : to the first param with a space in it.
  */
function paramsToString(params) {
  var endstr = '';
  for (var i=0;i<params.length;i++) {
    if (params.indexOf(' ') === -1) {
      endstr += params[i] + (i<params.length-1 ? ' ' : '');
      continue;
    }

    // multi-word param, therefore trailing
    endstr += ':' + params.slice(i).join(' ');
    break;
  }
  return endstr;
}

// Returns a response object given the JSON-returning URL to query.
// @param url {String} The URL to send a HTTP GET to
// @returns {Deferred<object>} The parsed JSON object
function getJSON(url) {
  logger.info('GET ' + url);
  var deferred = Q.defer();
  http.get(url, function(response) {
    var glorp = '';
    response.setEncoding('UTF-8');

    response.on('data', function(chunk) {
      glorp += chunk;
    });

    response.on('end', function() {
      try {
        var data = JSON.parse(glorp);
        deferred.resolve(data);
      } catch (err) {
        deferred.reject(err);
      }
    });
    response.on('error', deferred.reject);
  }).on('error', deferred.reject);
  return deferred.promise;
}


// Pad a string on the left to #{length} length.
// @param str {String} The string to pad
// @param len {Number} the amount of zeros to add
// @returns a string of length #{length} with zeros added to the left
function padLeft(str, len) {
  var zeros = '0';

  for (var i = 0; i < len; i++) {
    zeros += '0';
  }

  if (typeof str !== 'string') str = ''+str;

  return (zeros + str).slice(-len);
}

// Remove all non-printable ASCII characters from the input.
function superStrip(str) {
  var newstr = '';
  for (var i=0;i<str.length;i++) {
    var ccode = str.charCodeAt(i);

    if (ccode >= 0x20 && ccode <= 0x7e) {
      newstr += str[i];
    } else {
      newstr += '_';
    }
  }

  return newstr;
}


/** Is this word a channel? */
function isChannel(a) {
  return a.indexOf('#') === 0;
}


/** List all names in a channel.
  * Pass a true for the second parameter to force reloading the names list.
  * Returns a promise!
  */
function getNames(channel, force_update) {

  var def = Q.defer();

  var names = [];

  if (!force_update &&
      app.state.channels[channel] &&
      app.state.channels[channel].names &&
      app.state.channels[channel].names.length > 0) {

    def.resolve(app.state.channels[channel].names);
    return def.promise;
  }

  // set up handlers
  function namReply(data) {
    // console.log('NamReply', arguments);
    names.push(data.params[3].split(' '));
  }

  app.ircevents.on('NamReply', namReply);

  app.ircevents.once('EndOfNames', function() {

    app.ircevents.off('NamReply', namReply);
    names = _.flatten(names);

    // cache results because we're cool

    if (!app.state.channels[channel])
      app.state.channels[channel] = {};

    app.state.channels[channel].names = names;
    def.resolve(names);
  });

  // ask for all NAMES in the channel.
  respond.RAW('NAMES ' + channel);

  return def.promise;
}

app.util.parseIRCLine = parseIRCLine;
app.util.matchesHostname = matchesHostname;
app.util.getNames = getNames;
app.util.isChannel = isChannel;
app.util.getJSON = getJSON;
app.util.padLeft = padLeft;
app.util.superStrip = superStrip;


// respond function.

/** Respond to a message in <channel> to <nick>, with <data>. */
function respond(channel, nick, data) {
  if (channel == app.config.get('nick'))
    channel = nick;
  respond.PRIVMSG(channel, nick + ': ' + data);
}

// Send PRIVMSG to anything
respond.PRIVMSG = function(channel, data) {
  respond.RAW('PRIVMSG ' + channel + ' :' + data);
};

// Apply MODEs
respond.MODE = function(channel, mode, target) {
  respond.RAW('MODE ' + channel + ' ' + mode + ' :'+target);
};

// Raw IRC for anything else.
respond.RAW = function(data) {
  writeToSocket(data.replace(/[\r\n]/g, ''));
};

app.util.respond = respond;

// Alias system

function addAlias(from, to) {
  logger.debug('Added alias: ' + from + ' -> ' + to);
  app.aliases[from] = to;
}

app.util.addAlias = addAlias;

function deleteAlias(from) {
  logger.debug('Removed alias: ' + from);
  delete app.aliases[from];
}

// Remove any alias from a command name
function unalias(aliased) {
  var unaliased = aliased;

  // overflow limit = 20 nested aliases
  var i = 20;
  while (i --> 0 && app.aliases.hasOwnProperty(unaliased)) {
    unaliased = app.aliases[unaliased];
  }

  logger.verbose('Resolved alias ' + aliased + ' to ' + unaliased);
  return unaliased;
}



// is this nickname an operator in that channel?
// returns a promise!
function isOperatorIn(nick, channel) {
  return getNames(channel).then(function(names) {
    return !!_.any(names, function(each) {
      return each.indexOf(nick) === 1 &&
             each[0] == app.state.OP_CHAR;
    });
  });
}

// is this nickname voiced in that channel?
// returns a promise!
function isVoiceIn(nick, channel) {
  return getNames(channel).then(function(names) {
    return !!_.any(names, function(each) {
       return each.indexOf(nick) === 1 &&
              each[0] == app.state.VOICE_CHAR;
    });
  });
}

app.util.isOperatorIn = isOperatorIn;
app.util.isVoiceIn = isVoiceIn;

//
// Event handlers
//


// Connection handshake
app.events.on('sock.connect', function onSockConnect() {

  logger.info('connecting to the server');

  if (app.config.get('server_password'))
    writeToSocket('PASS ' + app.config.get('server_password'));

  writeToSocket('NICK ' + app.config.get('nick', 'boxnode'));
  writeToSocket('USER ' + app.config.get('username', 'boxnode') + ' * * :' +
                app.config.get('realname', '<realname unspecified>'));
});



// Receive data
app.events.on('sock.data', function onSockData(chunk) {
  var lines = chunk.split('\r\n');

  // TODO: instead of ignoring partial IRC lines on chunk borders,
  //       try concatenating them with the next chunk somehow.

  lines
    .map(function(ea) {
      try {
        var parsedLine = parseIRCLine(ea);

        if (!isValidIRCLine(parsedLine))
          return null;

        return parsedLine;
      } catch (err) {
        return null;
      }
    })
    .filter(function(ea) {
      return ea !== null;
    })
    .forEach(function(ea) {
      // if (DEBUG) console.log(ea);
      if (!ea) return;
      app.ircevents.emit(ea.command, ea);
    });
});



// IRC: Receive PING
app.ircevents.on('PING', function onPing(line) {
  logger.verbose('PING received, returning PONG');
  writeToSocket('PONG ' + paramsToString(line.params));
});



// IRC: PRIVMSGs
app.ircevents.on('PRIVMSG', function onPrivmsg(line) {
  // ##boxmein, '!test'
  if (line.params.length == 2 &&
      line.params[1] != '') {

    var command_char = app.config.get('command_character');

    if (line.params[1].indexOf(command_char) === 0) {
      // Fire a command event with the command name.
      // Pass the handler the IRC line,
      // a list of all words the command was called with,
      // and a function to call to respond to the user.
      var words = line.params[1].split(' ');

      var command = words[0].slice(command_char.length);

      // clone respond's methods to newrespond
      var newrespond = respond.bind({}, line.params[0], line.nick);
      for (var k in respond) {
        newrespond[k] = respond[k];
      }


      app.commandevents.emit(unalias(command),
        line, words, newrespond, app.util);
    }
  }
});



//
// IRC Events
//



app.ircevents.on('Welcome',
  app.events.emit.bind(app.events, 'ready'));


// Parse ISUPPORT lines, might be useful!
app.ircevents.on('ISupport', function onISupport(line) {
  var supports = line.params.slice(1, -1);

  _.each(supports, function(ea) {
    var es = ea.split('=');
    app.state.isupport[es[0]] = es[1] || true;

    // find out the op/voice chars
    if(es[0] == 'PREFIX') {

      logger.verbose('Found PREFIX line - setting OP_CHAR and VOICE_CHAR');
      // "(ov)@+"
      // index the o and v chars, and add them to app.state.OP_CHAR/VOICE_CHAR
      var rparen = es[1].indexOf(')');
      var op = es[1].indexOf('o');
      var voice = es[1].indexOf('v');

      app.state.OP_CHAR = es[1][rparen + op];
      app.state.VOICE_CHAR = es[1][rparen + voice];

      logger.verbose(app.state.OP_CHAR, app.state.VOICE_CHAR);
    }
  });
});



app.ircevents.on('JOIN', function onJoin(line) {
  var channel = line.params[0]
    , channels = app.state.channels;

  if (!channel || channel == '')
    return;

  // ignore own joins
  if (line.nick == app.config.get('nick'))
    return;

  channels[channel] = channels[channel] || {};
  channels[channel].names = channels[channel].names || [];

  if (channels[channel].names.indexOf(line.nick) !== -1) {
    logger.warning(line.nick, 'is already in this channel!');
  }

  channels[channel].names.push(line.nick);
});



app.ircevents.on('PART', function onPart(line) {

  var channel = line.params[0]
    , channels = app.state.channels;

  if (!channel || channel == '')
    return;

  var i = -1;
  if (channels[channel] &&
      channels[channel].names &&
      (i = channels[channel].names.indexOf(line.nick)) !== -1) {
    channels[channel].names.splice(i, 1);
    return;
  } else {
    // lol wtf
    logger.warning('wtf??? someone left a channel they weren\'t in');
  }
});




// Ready to join/do everything
app.events.on('ready', function onJoinReady(line) {
  logger.verbose('ready to join channels!');
  // we're connected to the server! let's try and join some channels!
  writeToSocket('JOIN ' + app.config.get('channels').map(function(ea) {
    return ea.name;
  }).join(','));
});




// Nickserv authentication
if (app.config.get('auth') && app.config.get('auth').type == 'NickServ') {
  logger.verbose('NickServ auth setup, setting a notice listener...');

  app.ircevents.on('Notice', function onAuthNotice(line) {
    // Actual NickServ
    if (line.nick == 'NickServ' && line.hostname == 'services.' &&
        line.params[1].indexOf('identify') !== -1) {
      logger.info('Identifying to NickServ as ' + app.config.get('auth').name);
      writeToSocket('PRIVMSG NickServ :identify ' + app.config.get('auth').name + ' ' + app.config.get('auth').password);
    }
  });
}




//
// Module system
//

// Cushion the listener so the bot won't crash because a module goes down.
function cushionListener(module) {
  return function(line, words, respond, util) {
    try {
      module.listener.call(this, line, words, respond, util);
    } catch (err) {
      app.commandevents.emit('error', line, err, module);
    }
  };
}


// New module added (only when you add via require())
app.events.on('module.new', function onNewModule(name) {
  logger.info('new module: ' + name);

  try {
    var module = require('./modules/module-' + name + '.js');
  }
  catch (err) {
    logger.error('Failed to load module `'+name+'`: ' + err.message);
    app.events.emit('module.loadfail', name, err);
    return;
  }

  module.name = name;
  module.path = require.resolve('./modules/module-' + name + '.js');

  module.unload = function onModuleUnload() {
    require.cache[module.path] = undefined;

    // disable the events that we hooked
    app.commandevents.off(module.name, module._listener);
    app.commandevents.off([module.name, '*'], module._listener);

    delete app.modules[module.name];
  };

  module.reload = function onModuleReload() {
    logger.info('\x1b[31;1mreloading module ' + name + '\x1b[0m');

    // if there's an unload method then unload the module first
    if (module.unload)
      module.unload();

    app.events.emit('module.new', name);
  };

  app.events.emit('module.newbare', module);
});



// Add a bare module - don't need to require()
app.events.on('module.newbare', function onNewBareModule(module) {

  // silently refuse to finish loading if we're missing key properties
  if (!module.type ||
     (module.type == 'command' && !module.listener) ||
     (module.type == 'event'   && !module.init)){
    app.events.emit('module.error', module);
    return;
  }

  module.type = module.type.toLowerCase();
  module.reload = module.reload || function() {};

  // This module is an IRC command module. pass it some generic stuff and
  // don't make it worry about hooking onto event streams.
  if (module.type == 'command') {

    // Init function can read configuration and specific configuration
    // It can also add aliases.
    // If init function throws, then don't load the module.
    if (module.init && typeof module.init == 'function') {
      try {
        var ret = module.init(app.util, addAlias);
      } catch (err) {
        app.events.emit('module.errorinit', module);
      }
      // can do something here with the init return value...
    }

    if (!module.getHelp)
      module.getHelp = function() { return {'*': ''}; };

    if (!module.listAll)
      module.listAll = function() { return []; };

    // use a cushioned event listener that responds to throwing
    module._listener = cushionListener(module);

    app.commandevents.on(module.name, module._listener);
    app.commandevents.on([module.name, '*'], module._listener);
  }

  // This module wants to hook onto events or emit them
  else if (module.type == 'event') {
    logger.verbose('new event-type module: ' + module);

    // also silently fail
    if (!module.init) {
      app.events.emit('module.errorinit', module, {message: 'no init function'});
      return;
    }

    try {
      module.init(app.events, app.ircevents, app.commandevents, app.util);
    } catch (err) {
      app.events.emit('module.errorinit', module, err);
      // clean up added event listeners?
    }
  }

  app.modules[module.name] = module;
});


app.events.on('module.reload', function onModuleReload(name) {
  logger.verbose('in module.reload listener: ' + name);
  if (!app.modules.hasOwnProperty(name))
    return;
  if (app.modules[name].reload)
    app.modules[name].reload();
});


app.events.on('module.unload', function onModuleUnload(name) {
  logger.verbose('in module.unload listener: ' + name);
  if (!app.modules.hasOwnProperty(name))
    return;
  if (app.modules[name].unload)
    app.modules[name].unload();
});




// Quit handlers
app.events.on('quit.*', function onQuit(reason) {
  var evt = this.event.slice(5);
  if (evt == 'sigint') {
    logger.fatal('SIGINT: exiting gracefully');
    reason = 'SIGINT';
  }
  if (evt == 'graceful' ||
      evt == 'sigint') {
    sock.end('QUIT :' +reason+'\r\n');
    sock.once('end', function() {
      logger.fatal('graceful exit completed!');
      process.exit(0);
    });
  } else {
    sock.destroy();
    process.exit(1);
  }
});



//
// Builtin modules
//



// Help system
app.commandevents.on('help', function onCmdHelp(line, words, respond) {

  if (words.length < 2 ||
      words[1] == 'help') {
    return respond('`help <command>` - get help on a specific command (you\'re doing it right now! :D)');
  }


  var terms = words[1].split('.');
  var term = terms[0];

  // special handling for listing
  if (term == 'list') {
    return respond('`list [module]` - list all commands on a module, or all '+
                   'modules if the module argument is omitted');
  }

  if (app.modules.hasOwnProperty(term) &&
      app.modules[term].type == 'command') {
    var help = app.modules[term].getHelp();

    if (terms.length > 1) {
      if (help.hasOwnProperty(terms[1])) {
        logger.verbose('terms[1] exists on help:',help,terms[1]);
        return respond(help[terms[1]]);
      }
    } else {
      return respond(help['*']);
    }
  }
});



// Lists all the 'command'-type modules.
function getCommandModuleNames() {
  var names = _.keys(app.modules);
  return _.filter(names, function(ea) {
    return app.modules[ea].type == 'command';
  });
}

// Command-listing system
app.commandevents.on('list', function onListCmd(line, words, respond) {
  var term = words[1];

  if (!term) {
    return respond('All modules: ' + getCommandModuleNames().join(', '));
  }

  if (app.modules.hasOwnProperty(term) &&
      app.modules[term].type == 'command') {
    var list = app.modules[term].listAll();
    return respond(list.join(', '));
  }
});



// System commands
app.events.emit('module.newbare', {
  type: 'command',
  name: 'system',

  listAll: function() {
    return ['quit', 'join', 'part', 'nick', 'raw', 'eval'];
  },

  getHelp: function() {
    return {
      '*':     'system commands - you might be authorized to use these, but don\'t get your hopes up!',
      'die':   'see `quit`',

      'quit':  '`quit` - quit the IRC',
      'join':  '`join <#channel>` - join an IRC channel',

      'leave': 'see `part`',
      'part':  '`leave <#channel> - leave an IRC channel',

      'name':  'see `nick`',
      'nick':  '`nick <new-name>` - set your IRC nickname to a new value',

      'raw':   '`raw <raw-irc...>` - send raw IRC protocol',
      'eval':  '`eval <code...>` - evaluate Javascript code just like that',

      'ccache': '`ccache <channel>` - clear the channel names cache',
      'reloadconfig': '`reloadconfig` - reload the configuration (might be out of sync eg nickname)',
      'lsmod': '`lsmod` - list *all* loaded modules'
    };
  },

  init: function(util, alias) {
    alias('quit', 'system.quit');
    alias('join', 'system.join');
    alias('part', 'system.part');
    alias('nick', 'system.nick');
    alias('raw' , 'system.raw' );
    alias('eval', 'system.eval');
    alias('aa'  , 'system.alias');
    alias('ua'  , 'system.unalias');
    alias('ra'  , 'system.rmalias');
    alias('echo', 'system.echo');
  },

  listener: function onSystemCmd(line, words, respond) {

    logger.verbose('handling system-level commands...');

    var permission = false;

    var authorizeds = _.flatten([
      app.config.get('owner'), app.config.get('modules.system.authorized')
    ], true);

    for (var i=0;i<authorizeds.length;i++) {
      if (matchesHostname(authorizeds[i], line.prefix))
        permission = true;
    }

    if (!permission) {
      respond('you can\'t do this!');
      app.events.emit('system.unauthorized', line.nick, words[0]);
      return;
    }

    logger.verbose('system-level permission obtained, running');

    // the asterisk
    var call = this.event.slice(7);

    switch (call) {

      // system.quit
      case 'die':
      case 'quit':
        app.events.emit('quit.graceful', 'owner sent a quit command');
        break;

      case 'echo':
        respond.PRIVMSG(line.channel, words.join(' '));
        break;

      // system.join <channel>
      case 'join':
        app.events.emit('channel.join', line);
        writeToSocket('JOIN :' + words[1]);
        break;

      // system.part <channel>
      case 'leave':
      case 'part':
        app.events.emit('channel.part', line);
        writeToSocket('PART :' + words[1]);
        break;

      // system.nick <newnick>
      case 'name':
      case 'nick':
        app.events.emit('system.nick', line);
        writeToSocket('NICK :'+words[1]);
        break;

      // system.raw <raw irc>
      case 'raw':
        app.events.emit('system.raw', line);
        writeToSocket(words.slice(1).join(' '));
        break;

      case 'ccache':
        if (!words[1]) {
          respond('usage: `help system.ccache`');
          break;
        }

        if (!app.state.channels[words[1]]) {
          respond('no such channel: ' + words[1]);
          break;
        }
        app.state.channels[words[1]].names = [];
        respond('success!');
        break;

      case 'reloadconfig':
        app.events.emit('reloadconfig');
        break;

      case 'lsmod':
        respond('*All* modules:' + _.keys(app.modules));
        break;

      // system.eval <javascript>
      case 'eval':
        app.events.emit('system.eval', line);
        var ws = words.slice(1).join(' ');
        try {
          respond(eval('(function(){return '+ws+'})()'));
        } catch (err) {
          logger.warning(err.stack);
          respond(err.message);
        }
        break;
    }
  }
});

//
// Alias editor
//

app.events.emit('module.newbare',
  require('./alias_manager')(app.util, app, addAlias, deleteAlias, unalias));


//
// Module management system
//

app.events.emit('module.newbare',
  require('./module_manager')(app));



// Announce its own character if my name and some specific words are mentioned
if (app.config.get('announce_character', true)) {
  var msg = app.config.get('announce_character_message') || 'just use %char';
  app.ircevents.on('PRIVMSG', function onAnnouncePrivmsg(line) {
    var chan = line.params[0];
    var user = line.nick;
    var text = line.params[1].toLowerCase();

    if (text.indexOf(config.nick) !== -1) {
      if (text.indexOf('control') !== -1 ||
          // text.indexOf('command') !== -1 ||
          text.indexOf('character') !== -1 ||
          text.indexOf('prefix') !== -1) {
        respond(chan, user, msg.replace('%char', config.get('command_character')));
      }
    }

  });
}



//
// Entry point
//

logger.verbose('starting at ' + Date.now());
logger.verbose('Loading configuration...');

logger.info(app.config.get('motd'));

var DEBUG = app.config.get('debug', process.env['DEBUG']);

if (!DEBUG) {
  logger.properties.loglevel = 'INFO';
} else {
  logger.verbose('Debugging set to ON, verbose output enabled!');
}

// Fire new module events for every module
config.get('modules_enabled').forEach(function onModuleEnable(ea) {
  logger.verbose('firing module.new for ' + ea);
  app.events.emit('module.new', ea);
});


process.on('uncaughtException', function onUncaughtException(err) {
  logger.fatal('uncaught exception: ' + err.message);
  logger.verbose(err.stack);
  app.events.emit('quit.crash');
});

process.on('SIGINT', function onSigint() {
  logger.verbose('sigint - quitting..');
  app.events.emit('quit.sigint');
});

logger.verbose('initializing IRC socket...');

// Create a socket and connect to the IRC server
var sock = new net.Socket();

sock.setEncoding('UTF-8');
sock.setTimeout(256);

sock.connect({
  host: app.config.get('server'),
  port: app.config.get('port')
}, app.events.emit.bind(app.events, 'sock.connect'));


logger.verbose('attaching event handlers');

sock.on('error', app.events.emit.bind(app.events, 'sock.error'));
sock.on('data', app.events.emit.bind(app.events, 'sock.data'));
sock.on('end', app.events.emit.bind(app.events, 'sock.end'));

logger.verbose('done initializing!');

