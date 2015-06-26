exports.type = 'event';

exports.init = function(app, irc, command, util) {

  var logger = new require('toplog')({concern: 'autorejoin',
    loglevel: util.config.get('loglevels.autorejoin', 'INFO')});

  logger.info('Enabling automatic re-join after kick...');

  irc.on('KICK', function onAutoRejoinKick(line) {
    logger.verbose('was just kicked, scheduling an autorejoin');

    setTimeout(function() {
      logger.verbose('joining the channel!');
      util.respond.RAW('JOIN ' + line.channel);
    }, util.config.get('modules.autorejoin.delay', 0.5) * 1000);

  });
};
