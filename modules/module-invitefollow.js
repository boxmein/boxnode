exports.type = 'event';

exports.init = function(app, irc, command, util) {

  var logger = new require('toplog')({concern: 'invitefollow',
    loglevel: util.config.get('loglevels.invitefollow', 'INFO')});

  logger.info('autorejoin enabled!');

  irc.on('INVITE', function onFollowInvite(line) {

    var channel = line.params[1];
    var channel_ok = false,
        user_ok = false;

    var channel_wl = util.config.get('modules.invitefollow.channel_whitelist', []);
    var user_wl = util.config.get('modules.invitefollow.user_whitelist', []);

    if (channel_wl.length > 0 && channel_wl.indexOf(channel) !== -1) {
      channel_ok = true;
      logger.verbose('the channel was ok! (found in whitelist)');
    } else if (channel_wl.length == 0) {
      channel_ok = true;
      logger.verbose('the channel was ok! (no whitelist)');
    }

    if (user_wl.length == 0) {
      user_ok = true;
      logger.verbose('the user was ok! (no whitelist)');
    } else {
      user_ok = user_wl.reduce(function(acc, each) {
        return acc || util.matchesHostname(each, line.hostmask);
      }, false);
      logger.verbose('the user was ok! (found in whitelist)');
    }

    if (channel_ok && user_ok) {
      logger.info('Following invite to ' + line.params[1]);
      util.respond.RAW('JOIN ' + line.params[1]);
    }
  });
};
