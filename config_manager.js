var YAML = require('yamljs');

var toplog = require('toplog');
var logger = new toplog({concern: 'configuration', loglevel: 'VERBOSE'});
var currentConfig = null;

module.exports.get = function(name, def) {

  if (!_currentConfig)
    return def;

  // var name = Array.prototype.slice.call(arguments, 1).join('.');

  var ns = name.split('.');
  var val = _currentConfig;

  for (var i = 0; i < ns.length; i++) {
    if (val == undefined)
      break;
    val = val[ns[i]];
  }

  return val || def;
};

module.exports.reload = function() {
  try {
    _currentConfig = YAML.load('configs.yml');
  }
  catch (err) {
    logger.error('Error reloading configuration: ' + err);
    logger.info ('Configuration reloaded unsuccessfully, old config stays');
  }
};
