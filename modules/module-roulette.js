exports.type = 'command';

var cfg;

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

exports.listener = function(line, words, respond) {
  var split = this.event.split('.');

  // *
  if (split.length < 2) {
    split[1] = 'russian';
  }

  switch (split[1]) {
    case 'russian':
      if (Math.random() < cfg.chances.russian) {
        respond('Bang! TODO: add consequences.');
      } else {
        respond('The gun clicks.');
      }
      break;

    case 'chancekick':
      if (words.length < 2) {
        respond('You forgot a target! See `help roulette.chancekick`');
        return;
      }
      if (Math.random() < cfg.chances.chancekick) {
        respond('Booted the target (TODO: add consequence): ' + words[1]);
      } else if (Math.random() < cfg.chances.chancekick_recoil) {
        respond('Backfired! (TODO: kick you)');
      }
      break;
    default: break;
  }
};

exports.init = function(config, myconfig, alias) {
  cfg = myconfig;
};
