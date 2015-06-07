
// let's inspect everything we come across

/* We'll describe a different `util` later - need to distinguish! */
var nodeutil = require('util');

/* Gotta love underscore */
var _ = require('underscore');

/* This is a logger I wrote with log levels and all sorts of bullcrap. Really
  useful, so using this gets you timestamps, log levels and filtering for free!
  Plus the logs look really neat with timestamps lining the left edge.

  Also, the "concern" property lets every logger instance name what they're
  logging for.
*/
var logger = new require('../toplog')({concern: 'test', loglevel: 'INFO'});


/*
  Hi!

  This is the "test" module, which is meant to be very loud and document every-
  thing that is going on in an average module.

  The module also has a hidden "name" property, which gets assigned according
  to the actual filename of this script. Modules are loaded according to their
  names, and files are loaded by concatenating the module name with a file name
  like "module-" + name + ".js" .

  As the type specifies, this is a "command"-type module, meaning it forfeits
  access to the raw event streams to become better structured and reloadable.

  The other type that exists is "event"-type modules, which you can read about
  in 'module-logging.js'.
*/
exports.type = 'command';

/*
  This is what will be concatenated into a string when a user calls `list` on
  your module. You'll most likely need to put commands here that are accessible
  via this module!

  By convention, list a * command when you don't need to specify a sub-command
  in order to use this module.

  A simple trick is to do `Object.keys(exports.getHelp())` as the return value
  to this, which will keep getHelp and listAll in sync.
*/
exports.listAll = function() {
  return ['*'];
};

/*
  This returns an object with keys as the possible sub-commands and values as
  a documentation on what the subcommands do.

  A convention is to write the documentation like this:

    `command <mandatory-argument> [optional argument]` - description here

  ...or

    `command <mandatory list of arguments...>` - description here.

  The syntax is kind of common and should make sense most of the time. Adapt
  as necessary.

  Also, use backticks to mark out any actual commands  like you would Markdown.
*/
exports.getHelp = function() {
  return {
    '*': '`test` - test command! responds with hello and how it was called.'
  };
};

/*

  This is what will be run every time your module is called, which means all
  events on the `test.*` wildcard, for this module. The module's name is inside
  the filename.

  You get passed four parameters.

  First: the IRC line (a generic object containing everything you'd want to
    know about the message that caused this event).

  This is what an IRC line looks like:

    ":NickServ!NickServ@services. NOTICE boxnode :You gotta identify bro\r\n"
    :<prefix>                     <num>  <params...>                    \r\n

    ==

    {
      "prefix": "NickServ!NickServ@services.",
      // this is the actual command sent from the IRC server
      "numeric": "NOTICE",
      // if the numeric was an actual number, this translates it to text.
      // See constants.json for the mapping.
      "command": "NOTICE",
      "params": [
        "boxnode",
        "You gotta identify bro"
      ],

      // Might not be included.
      "nick": "NickServ",
      "username": "NickServ",
      "hostname": "services."
    }

  Second parameter is a list of all the words the message contained, for example
    ["\\test.potato", "I", "am", "a", "potato"]

  Third parameter is a function you can call to send a response back to the
    user. By default, it mentions the caller too, but you can use the various
    other respond functions attached to the object to change this.

    function respond(channel, name, message) { ... }
    respond.PRIVMSG = function (channel, message) { ... }
    respond.MODE    = function (channel, mode, target) { ... }
    respond.RAW     = function (raw) { ... }

    (however, the "respond" copy you get into this function has the channel and
    name properties prefilled).

  Fourth parameter is a bunch of utility functions: UTIL_OBJECT
    config.get(config_property):
      get a configuration property. (this was changed to allow config
      to be reloaded!)

    parseIRCLine(raw_irc_line):
      parse a string into an IRC line object

    matchesHostname(pattern, hostmask):
      check if the hostmask matches the pattern. Patterns are like regexes, but
      * are automatically changed to (.+?).

    getNames(channel):
      returns a promise that resolves to a list of every user in a channel.

    isChannel(channel):
      returns if the first argument starts with a pound sign.

    respond:
      yes, that's the same respond you already have. Except, not prefilled in.

    addAlias(from, to):
      add a command alias from something to something else. For example,
      "eval" is aliased to "system.evil", meaning \eval == \system.evil

    isOperatorIn(nick, channel):
      returns a promise that resolves to true if the nick is an operator in the
      given channel.

    isVoiceIn(nick, channel):
      returns a promise that resolves to true if the nick is a voice in the
      given channel.

    getJSON(url):
      returns a promise that resolves to JSON data fetched from the URL.

    padLeft(str, length):
      ensures the (str) has a length of (length) by padding with zeros from the
      left should it be too short, and cropping otherwise. Useful for dates et
      al.

    superStrip(str):
      Removes all characters that aren't in the ASCII printable range from
      the input. Because who needs localization?

  Another thing:
    Since this listener is (almost) attached to an actual event stream, its
    `this` contains stuff from said event stream. Most important of which is
    probably `this.event`, which is the particular IRC command the listener was
    invoked about. For example, when `\test.potato` is run, the `this.event`
    will be "test.potato".
*/
exports.listener = function(line, words, respond, util) {

  // The log level for these is VERBOSE, while the constructor set the filtered
  // level to INFO, INFO > VERBOSE, therefore VERBOSE is not shown.
  logger.verbose('listener#line:', nodeutil.inspect(line));
  logger.verbose('listener#words:', nodeutil.inspect(words));
  logger.verbose('listener#respond:', nodeutil.inspect(respond));
  logger.verbose('listener#util:', nodeutil.inspect(util));

  // Slicing off the "test." part from this.event.
  var shortEvt = this.event.slice(5);


  if (shortEvt == 'potato') {
    respond(_.sample(util.config.get('modules.test.potatoes')));
  } else {
    var msg = util.config.get('module.test.message', 'hi! you entered %cmd!');
    respond(msg.replace('%cmd', this.event));
  }
};

/*
  This function is called when the module is first loaded. Here's the perfect
  place to set up variables and/or other persistent state.

  Access to the configuration is available via the util object (see above,
  Ctrl+F UTIL_OBJECT). Also, you can attach aliases via the addAlias(from, to)
  function passed right into the scope. It's also available in the util object.
*/
exports.init = function(util, addAlias) {
  logger.verbose('init#util:', nodeutil.inspect(util));
  logger.verbose('init#addAlias:', nodeutil.inspect(addAlias));

  addAlias('potato', 'test.potato');
  addAlias('otatop', 'test.otatop');
  addAlias('asdf', 'test.asdf');
  addAlias('sudo', 'test.sudo');
};
