var Sandbox = require('sandbox');
var logger;
var box = new Sandbox();

exports.type = 'command';
exports.listAll = function() {
  return ['*'];
};

exports.getHelp = function() {
  return {
    '*': '`js <code...>` - runs Javascript in a closure. (function() { return <code>; })()'
  };
};

exports.listener = function(line, words, respond, util) {
  box.run(words.slice(1).join(' '), function(out) {
    var endstr = '';

    logger.verbose('result:',out);

    if (out.console && out.console.length > 0)
      endstr += ' Console: ' + out.console.join('\\n');

    if (out.result)
      endstr += ' Return: ' + out.result;

    respond(endstr);
  });
};

exports.init = function(util) {
  logger = new require('toplog')({
    concern: 'js',
    loglevel: util.config.get('modules.js.loglevel', util.config.get('loglevel', 'INFO'))
  });
}
