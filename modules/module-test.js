/*
  Test module of type 'command'
  Use this as a sort of starting point for your own modules!

  For simplicity's sake, I'll assume that your command character is !. Make sure
  to configure it with the property "command_character".

  The module's 'name' will be this file's name without module- and .js.
  The module can be loaded by adding the module's name to a list under the
  configuration, or by using the builtin `!module.load` functionality.
*/


/*
  This module exposes a command (or many), as well as providing help and a list
  of all the commands it exposes. Both of those are highly recommended.

  The other type of module, 'event', gets a bit more power and the ability to
  hook into all three event streams.
*/
exports.type = 'command';

// Store the 'message' configuration value as a global.
var message;



/*
  Return an array filled with strings, each of which is the name of a subcommand
  you define in this module's listener.

  The listener function is called when '!module' is used, and when '!module.X'
  is used. You can use the X to define different kinds of commands in a single
  module. Here you can list all of the various X-es you define.

  List a * too if your listener works without an X.
*/
exports.listAll = function() {
  return ['*'];
};

/*
  Define a short overview of what your various commands do.
  The format I've used throughout my modules is this:

  `command <mandatory-argument> [optional-argument]` - help here.

  You can also use three dots like <mandatory-argument...> to specify that the
  rest of the line of text is used as the mandatory argument.
*/
exports.getHelp = function() {
  return {
    '*': 'test command! responds with hello and how it was called.'
  };
};

/*

  This function is called every time someone uses !command or !command.X.

  The `this` value is set to the event object passed around by EventEmitter2.
  To obtain the X from the event name, simply cut off your module name from the
  `this.event` property.

  The first argument to the function is a data-structure defining an IRC line.
  It looks approximately like this:

  {  prefix: 'boxmein!~boxmein@unaffiliated/boxmein',
     nick: 'boxmein',
     username: '~boxmein',
     hostname: 'unaffiliated/boxmein',
     hostmask: 'boxmein!~boxmein@unaffiliated/boxmein',
     numeric: 'PRIVMSG',
     command: 'PRIVMSG',
     params: [ '##powder-bots', '\\list system' ]
  }

  The second argument is a list of all words that the user spoke in the IRC line
  including the command.

  [ '\\list', 'system' ]

  The third argument is a function(string) you can call when you want to send a
  response to the caller. It automatically fills in the IRC protocol as well as
  prefixing the caller's username to your string.

*/
exports.listener = function(line, words, respond) {
  respond(message.replace('%cmd', this.event));
};

/*
  This function is called when the module is first loaded. Here's the perfect
  place to set up variables and/or other persistent state.

  The first argument is the global configuration containing the entire data
  structure that configs.yml defines.

  The second argument is a specific section of the global configuration
  dedicated to values you might want to use with a specific module. It's under
  the modules.<module-name> structure.

  This means that config.modules.test == myconfig.

  The third argument is a function(string, string) you can call with two strings
  that will create an alias from the first argument to the second.

  For example, if you want your "!test.do_the_thing" to be available as "!thing"
  then alias("thing", "test.do_the_thing") will accomplish just that.
*/
exports.init = function(config, myconfig, alias) {
  console.log('initialized test with ', myconfig);
  message = myconfig.message;
};
