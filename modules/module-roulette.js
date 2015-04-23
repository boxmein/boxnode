/*
  Russian Roulette :D
*/

var cfg, underscore = require('underscore');

exports.type = 'command';

var DEFAULT_CHANCES = {
  'russian': 1/6.0,
  'chancekick': 0.05,
  'chancekick_backfire': 0.25
};

var DEFAULT_PUNISHMENT = {
  'type': 'kick',
  'ban_duration': 0
};


exports.listAll = function() {
  return ['*', 'russian', 'chancekick'];
};

exports.getHelp = function() {
  return {
    '*': '`roulette` - see `roulette.russian`',
    'russian': '`roulette.russian` - 1/6 chance of dying (getting kick/banned)',
    'chancekick': '`roulette.chancekick <target>` - 5% chance of kicking <target> / 25% chance of dying (getting kick/banned)'
  };
};

function punish(line, target, respond) {
  target = target || '*!*@' + line.hostname;
  if (cfg.punishment.type.indexOf('ban') !== -1) {
    respond.MODE(line.params[0], '+b', target);

    setTimeout(function() {
      respond.MODE(line.params[0], '-b', target);
    }, cfg.punishment.ban_duration);

  }

  if (cfg.punishment.type.indexOf('kick') !== -1) {
    respond.RAW('KICK ' + line.params[0] + ' ' + target);
  }
}

exports.listener = function(line, words, respond) {
  var split = this.event.split('.');

  // *
  if (split.length < 2) {
    split[1] = 'russian';
  }

  switch (split[1]) {
    case 'russian':
      if (Math.random() < cfg.chances.russian) {
        respond('Bang!');
        punish(line, undefined, respond);
      } else {
        respond('The gun clicks.');
        cfg.chances.russian += cfg.chances.russian;
        if (cfg.chances.russian >= 1)
          cfg.chances.russian = DEFAULT_CHANCES.russian;
      }
      break;

    case 'chancekick':
      if (words.length < 2) {
        respond('You forgot a target! See `help roulette.chancekick`');
        return;
      }
      if (Math.random() < cfg.chances.chancekick) {
        respond('Booted the target: ' + words[1]);
        respond.RAW('KICK ' + line.params[0] + ' ' + words[1]);
      } else if (Math.random() < cfg.chances.chancekick_backfire) {
        respond('Backfired!');
        respond.RAW('KICK ' + line.params[0] + ' ' + line.nick);
      }
      break;
    default: break;
  }
};

exports.init = function(config, myconfig, alias) {
  cfg = myconfig;

  cfg.chances = _.defaults(cfg.chances, DEFAULT_CHANCES);
  cfg.punishment = _.defaults(cfg.punishment, DEFAULT_PUNISHMENT);

  alias('rr', 'roulette.russian');
  alias('k', 'roulette.chancekick');
};
