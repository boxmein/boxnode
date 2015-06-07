// Alias manager: lets you translate \long.ugly-commands into \cmds

var _ = require('underscore');
module.exports = function(util, app, addAlias, deleteAlias, unalias) {
  var myconf = util.config.get('modules.alias', { 'whitelist': true });

  return {
    type: 'command',
    name: 'alias',

    listAll: function() {
      return Object.keys(this.getHelp());
    },

    getHelp: function() {
      return {
      '*': 'same as `alias.add`',
      'add': '`alias.add <from> <to>` - add new alias converting <from> to <to>',
      'remove': '`alias.remove <al>` - remove a specific alias',
      'unalias': '`alias.unalias <al>` - convert an alias to what it actually means',
      'list': '`alias.list` - list all aliases known'
      }
    },

    init: function(util, alias) {
      alias('aa', 'alias.add');
      alias('ar', 'alias.remove');
      alias('ua', 'alias.unalias');
      alias('al', 'alias.list');
    },

    listener: function onAliasCmd(line, words, respond) {

      var ev = this.event.split('.');
      if (ev.length < 2)
        ev[1] = 'add';

      var AUTHORIZED = false;

      // hostmask-based authorization
      if (myconf.whitelist === false) {
        AUTHORIZED = true;
      }
      else if (myconf.whitelist === true) {
        AUTHORIZED = util.matchesHostname(util.config.get('owner'), line.hostmask);
      }
      else if (myconf.whitelist instanceof Array) {

        for (var i = 0; i < myconf.whitelist.length; i++) {
          if (util.matchesHostname(myconf.whitelist[i], line.hostmask)) {
            AUTHORIZED = true;
            break;
          }
        }

      }

      switch (ev[1]) {

        case 'unalias':
          if (!words[1])
            return respond('Missing <alias>, try `help alias.unalias`');
          respond('Alias `'+words[1] + '` refers to `' + unalias(words[1]) + '`');
          break;

        case 'list':
          respond(_.keys(app.aliases));
          break;

        case 'add':
          if (!AUTHORIZED)
            return respond('You can\'t do that!');

          if (words.length < 3)
            return respond('Invalid syntax! See `help alias.add`');
          addAlias(words[1], words.slice(2).join(' '));
          respond('New alias: `' + words[1] + '` -> `' + words[2] + '`');
          break;

        case 'remove':
          if (!AUTHORIZED)
            return respond('You can\'t do that!');

          if (!words[1])
            return respond('Missing alias, try `help alias.remove`');
          deleteAlias(words[1]);
          respond('Alias `'+words[1] + '` deleted.');
          break;
      }
    }
  };
};
