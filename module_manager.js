
var fs = require('fs');
module.exports = function(app) {
  var util = app.util;
  return {
    type: 'command',
    name: 'module',
    listAll: function() { return ['reload', 'unload', 'load']; },
    getHelp: function() { return {
      'reload': '`reload <module-name>` - unload and load the named module',
      'load':   '`load <module-name>` - load the module specified by the name',
      'unload': '`unload <module-name>` - unload the module'
    }},

    init: function(util, alias) {
      alias('reload', 'module.reload');
      alias('load', 'module.load');
      alias('unload', 'module.unload');
    },

    listener: function onModuleCmd(line, words, respond, util) {
      if (!util.matchesHostname(util.config.get('owner'), line.prefix)) {
        respond('you can\'t do this!');
        app.events.emit('system.unauthorized', line.nick, words[0]);
        return;
      }

      // the asterisk
      var call = this.event.slice(7);

      switch (call) {
        case 'reload':
          var name = words[1];
          if (app.modules.hasOwnProperty(name)) {
            app.events.emit('module.reload', name);
            respond('sent the module.reload event for module ' + name);
          }
          break;

        case 'unload':
          var name = words[1];
          if (app.modules.hasOwnProperty(name)) {
            app.events.emit('module.unload', name);
            respond('sent the module.unload event for module ' + name);
          }
          break;

        case 'load':
          var name = words[1];
          fs.exists(__dirname + '/modules/module-'+name+'.js', function doesModuleExist(yes) {
            if (yes) {
              app.events.emit('module.new', name);
              respond('sent the module.new event for module ' + name);
            } else {
              respond('the module was not found - see console for details');
              console.log('the path ' + __dirname + '/modules/module-' + name +
                          '.js apparently doesn\'t exist');
            }
          });
          break;
      }
    }
  }
};
